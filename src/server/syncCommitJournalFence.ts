import { randomUUID } from 'node:crypto'
import { promoteReviewedSnapshot,recordSourceFailure,validateSyncContract } from './sourceSync.ts'
import type { SyncStore,SyncState,SyncCandidate,ReviewApproval,SyncContract,PromotionOptions } from './sourceSync.ts'
import type { CatalogRow } from './catalogRows.ts'
import type { CommitResolution } from './syncCommitIntent.ts'
import { commitUuid,decodeCommitJournalRow } from './syncCommitJournalRows.ts'
import type { FencedPromotionResult,FencedFailureResult } from './syncCommitFence.ts'

export interface IntentSyncExecutor {
 read(sourceId:string):Promise<SyncState>
 claim(sourceId:string,expectedRevision:number,next:SyncState,id:string):Promise<CatalogRow|null>
 execute(intent:CatalogRow,next:SyncState):Promise<boolean>
}
export interface DurableCommitJournal {
 load():Promise<CatalogRow|null>
 receipt(id:string):Promise<CommitResolution|null>
 resolve(id:string):Promise<CommitResolution>
}
const stop=():never=>{throw new Error('Private v2 sync commit fenced')}
const resolution=(value:unknown):value is CommitResolution=>typeof value==='string'&&['committed','not_committed','conflict'].includes(value)

// Unmounted private boundary. Unlike v1, absence recovery is safe only because
// this journal atomically invalidates the required SQL token while holding head.
// No callback retries, follow-up failure writes or direct SyncStore escape hatch.
export function createSyncCommitJournalFence(store:IntentSyncExecutor,journal:DurableCommitJournal,inputContract:SyncContract) {
 const contract={...inputContract,sourceIds:new Set(inputContract.sourceIds),retryDelaysMs:[...inputContract.retryDelaysMs]}
 validateSyncContract(contract)
 let busy=false,unresolvedId:string|null=null
 const run=async<T extends string>(sourceId:string,work:(s:SyncStore)=>Promise<T>):Promise<T|'quarantined'>=>{
  if(busy||unresolvedId!==null)return 'quarantined'
  busy=true;let quarantined=false,base:SyncState|null=null,attempted=false
  try {
   if(await journal.load()!==null)return 'quarantined'
   const facade:SyncStore={
    read:async(source)=>{if(source!==sourceId||base!==null)return stop();base=structuredClone(await store.read(source));return structuredClone(base)},
    compareAndSwap:async(source,expected,next)=>{
     if(source!==sourceId||!base||base.revision!==expected||attempted)return stop()
     attempted=true;const id=randomUUID();unresolvedId=id
     let intent:CatalogRow|null
     try {
      const claimed=await store.claim(source,expected,structuredClone(next),id)
      if(claimed===null){unresolvedId=null;return false}
      intent=decodeCommitJournalRow('sync_commit_intent',claimed)
      if(intent.id!==id||intent.source_id!==source||intent.expected_revision!==expected)return stop()
     }catch{quarantined=true;return stop()}
     // Resolve on success OR lost/error acknowledgement. Complete immutable
     // evidence, not the original boolean/error category, decides the result.
     try {await store.execute(structuredClone(intent),structuredClone(next))}catch{/* recover under fresh writer barrier */}
     let settled:CommitResolution
     try {settled=await journal.resolve(id);if(!resolution(settled))return stop()}
     catch{quarantined=true;return stop()}
     unresolvedId=null
     if(settled==='committed')return true
     if(settled==='conflict')return false
     return stop()
    },
   }
   const result=await work(facade)
   return quarantined?'quarantined':result
  }catch{return 'quarantined'}finally{busy=false}
 }
 return {
  promote:(candidate:SyncCandidate,approval:ReviewApproval,options:PromotionOptions):Promise<FencedPromotionResult>=>run(candidate.sourceId,s=>promoteReviewedSnapshot(s,candidate,approval,contract,options)),
  failure:(sourceId:string,completedAt:string,now?:()=>number):Promise<FencedFailureResult>=>run(sourceId,s=>recordSourceFailure(s,sourceId,completedAt,contract,now)),
  recover:async(knownId?:string):Promise<{status:CommitResolution|'quarantined'|'none';intentId:string|null}>=>{
   if(busy)return {status:'quarantined',intentId:knownId??null}
   busy=true;let id=knownId??unresolvedId
   try {
    if(knownId!==undefined&&!commitUuid(knownId))return stop()
    const pending=await journal.load()
    if(id!==null) {
     const terminal=await journal.receipt(id)
     if(terminal!==null) {if(!resolution(terminal))return stop();if(unresolvedId===id)unresolvedId=null;return {status:terminal,intentId:id}}
    }
    if(pending===null){if(unresolvedId===id)unresolvedId=null;return {status:'none',intentId:id}}
    const intent=decodeCommitJournalRow('sync_commit_intent',pending)
    if(id!==null&&intent.id!==id)return {status:'quarantined',intentId:id}
    id=intent.id as string
    if(!contract.sourceIds.has(intent.source_id as string))return stop()
    const settled=await journal.resolve(id)
    if(!resolution(settled))return stop()
    if(unresolvedId===id)unresolvedId=null
    return {status:settled,intentId:id}
   }catch{return {status:'quarantined',intentId:id}}finally{busy=false}
  },
 }
}
