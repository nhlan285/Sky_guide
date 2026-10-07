import { promoteReviewedSnapshot,recordSourceFailure,validateSyncContract } from './sourceSync.ts'
import type { SyncStore,SyncState,SyncCandidate,ReviewApproval,SyncContract,PromotionOptions } from './sourceSync.ts'
import { PrivateTransactionError } from './postgresTransactionKernel.ts'
import { decodeSyncCommitIntent,prepareSyncCommitIntent } from './syncCommitIntent.ts'
import type { SyncCommitJournal,SyncCommitIntent,CommitResolution } from './syncCommitIntent.ts'
import type { SyncCommitWitness,WitnessResolution } from './postgresCommitWitness.ts'

export type FencedPromotionResult='promoted'|'unchanged'|'conflict'|'rejected'|'quarantined'
export type FencedFailureResult='recorded'|'conflict'|'rejected'|'quarantined'
const stop=():never=>{throw new Error('Private sync commit fenced')}

// Outward boundary around unchanged SourceSync, NOT a directly mountable SyncStore.
// It remembers swallowed CAS/journal errors outside SourceSync's catch/rejected API.
// No automatic callback retry or follow-up source-failure recording.
export function createSyncCommitFence(store:SyncStore,journal:SyncCommitJournal,witness:SyncCommitWitness,inputContract:SyncContract) {
 const contract={...inputContract,sourceIds:new Set(inputContract.sourceIds),retryDelaysMs:[...inputContract.retryDelaysMs]}
 validateSyncContract(contract)
 let busy=false
 const settle=async(intent:SyncCommitIntent,resolution:CommitResolution)=>{
  if(await journal.settle(intent.id,resolution)!==undefined)return stop()
 }
 const recoverIntent=async(intent:SyncCommitIntent,originalSettled=false):Promise<WitnessResolution>=>{
  const result=await witness.reconcile(structuredClone(intent))
  if(!['committed','not_committed','conflict','unverifiable'].includes(result))return stop()
  // On restart another worker may still be acquiring its first SQL lease after
  // durable claim. A head lock cannot fence that future dispatch. Only inline
  // kernel indeterminate errors attest COMMIT was sent and old client evicted.
  // Exact occupied slots remain safe: any late old CAS is necessarily stale.
  if(result==='not_committed'&&!originalSettled)return 'unverifiable'
  if(result!=='unverifiable')await settle(intent,result)
  return result
 }
 const run=async<T extends string>(sourceId:string,work:(facade:SyncStore)=>Promise<T>):Promise<T|'quarantined'>=>{
  if(busy)return 'quarantined'
  busy=true;let quarantined=false,base:SyncState|null=null,attempted=false
  try {
   if(await journal.load()!==null)return 'quarantined'
   const facade:SyncStore={
    read:async(source)=>{if(source!==sourceId||base!==null)return stop();base=structuredClone(await store.read(source));return structuredClone(base)},
    compareAndSwap:async(source,expected,next)=>{
     if(source!==sourceId||!base||base.revision!==expected||attempted)return stop()
     attempted=true
     const intent=prepareSyncCommitIntent(sourceId,base,next)
     try {
      if(await journal.claim(structuredClone(intent))!==true){quarantined=true;return stop()}
     }catch{quarantined=true;return stop()}
     let applied:boolean
     try {applied=await store.compareAndSwap(source,expected,structuredClone(next))}
     catch(error) {
      if(error instanceof PrivateTransactionError&&error.outcome==='not_committed') {
       try{await settle(intent,'not_committed')}catch{quarantined=true}
       return stop()
      }
      let result:WitnessResolution
      try {result=await recoverIntent(intent,error instanceof PrivateTransactionError&&error.outcome==='indeterminate')}
      catch{quarantined=true;return stop()}
      if(result==='committed')return true
      if(result==='conflict')return false
      if(result==='unverifiable')quarantined=true
      return stop()
     }
     if(typeof applied!=='boolean'){quarantined=true;return stop()}
     try {await settle(intent,applied?'committed':'conflict')}
     catch{quarantined=true;return stop()}
     return applied
    },
   }
   const result=await work(facade)
   return quarantined?'quarantined':result
  }catch{return 'quarantined'}finally{busy=false}
 }
 return {
  promote:(candidate:SyncCandidate,approval:ReviewApproval,options:PromotionOptions):Promise<FencedPromotionResult>=>run(candidate.sourceId,s=>promoteReviewedSnapshot(s,candidate,approval,contract,options)),
  failure:(sourceId:string,completedAt:string,now?:()=>number):Promise<FencedFailureResult>=>run(sourceId,s=>recordSourceFailure(s,sourceId,completedAt,contract,now)),
  recover:async():Promise<{status:CommitResolution|'quarantined'|'none';intentId:string|null}>=>{
   if(busy)return {status:'quarantined',intentId:null}
   busy=true;let id:string|null=null
   try {
    const pending=await journal.load()
    if(pending===null)return {status:'none',intentId:null}
    const intent=decodeSyncCommitIntent(pending);id=intent.id
    if(!contract.sourceIds.has(intent.sourceId))return {status:'quarantined',intentId:id}
    const result=await recoverIntent(intent)
    return {status:result==='unverifiable'?'quarantined':result,intentId:id}
   }catch{return {status:'quarantined',intentId:id}}finally{busy=false}
  },
 }
}
