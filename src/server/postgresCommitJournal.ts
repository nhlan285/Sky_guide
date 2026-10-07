import { canonicalJson } from './domainSnapshot.ts'
import type { CatalogRow,SqlScalar } from './catalogRows.ts'
import type { SqlConnection,SqlDatabase,SqlReadLimits } from './postgresSyncRows.ts'
import { privateSyncReader } from './postgresSyncRows.ts'
import { commitJournalColumns,commitUuid,decodeCommitJournalRow } from './syncCommitJournalRows.ts'
import { validCommitAudit,validCommitAcceptance } from './syncCommitIntent.ts'
import type { CommitResolution } from './syncCommitIntent.ts'

const fail=():never=>{throw new Error('Private journal evidence is unresolved')}
export async function journalRows(c:SqlConnection,limits:SqlReadLimits,table:keyof typeof commitJournalColumns,field:string,value:SqlScalar,lock=false):Promise<CatalogRow[]> {
 const columns:readonly string[]=commitJournalColumns[table]
 if(!columns.includes(field))return fail()
 const rows=await c.query({text:`select ${columns.join(',')} from sky_private.${table} where ${field}=$1 limit $2${lock?' for update':''}`,values:[value,2]},
  {maxRows:2,maxBytes:Math.min(limits.maxBytes,32768)})
 if(!Array.isArray(rows)||rows.length>1)return fail()
 return rows.map(r=>decodeCommitJournalRow(table,r))
}
export async function journalBool(c:SqlConnection,limits:SqlReadLimits,helper:'activate_sync_commit_intent'|'require_sync_commit_intent'|'apply_sync_commit_cas'|'settle_sync_commit_intent',values:SqlScalar[]):Promise<void> {
 const rows=await c.query({text:`select sky_private.${helper}(${values.map((_,i)=>`$${i+1}`).join(',')}) as applied`,values},{maxRows:1,maxBytes:Math.min(limits.maxBytes,4096)})
 if(!Array.isArray(rows)||rows.length!==1||Object.keys(rows[0]).length!==1||rows[0].applied!==true)return fail()
}

// Requires the proposed v2 schema. No SDK/provider mount. All recovery operations
// use a fresh READ COMMITTED writer barrier: head FIRST, then journal control.
// The invoker settlement helper validates evidence and clears the token in that
// same transaction; late pre-BEGIN workers must require it before any DML.
export function createPostgresCommitJournal(database:SqlDatabase,inputLimits:SqlReadLimits) {
 const limits={...inputLimits}
 privateSyncReader({query:async()=>fail()},limits)
 const barrier=async(c:SqlConnection)=>{
  const reader=privateSyncReader(c,limits),head=(await reader.head(true))[0]
  const controls=await journalRows(c,limits,'sync_commit_control','singleton',1,true)
  if(controls.length!==1)return fail()
  return {reader,head,active:controls[0].active_intent_id}
 }
 const receipt=async(c:SqlConnection,id:string):Promise<CommitResolution|null>=>{
  const rows=await journalRows(c,limits,'sync_commit_receipt','intent_id',id)
  return rows.length?rows[0].resolution as CommitResolution:null
 }
 return {
  load:()=>database.transaction({isolation:'read committed',readOnly:false},async c=>{
   const {active,head}=await barrier(c)
   if(active===null)return null
   const rows=await journalRows(c,limits,'sync_commit_intent','id',active)
   if(rows.length!==1||(rows[0].expected_revision as number)>(head.revision as number)||await receipt(c,active as string)!==null)return fail()
   return rows[0]
  }),
  receipt:(id:string):Promise<CommitResolution|null>=>{
   if(!commitUuid(id))return Promise.reject(new Error('Invalid private journal ID'))
   return database.transaction({isolation:'read committed',readOnly:false},async c=>{await barrier(c);return receipt(c,id)})
  },
  resolve:(id:string):Promise<CommitResolution>=>{
   if(!commitUuid(id))return Promise.reject(new Error('Invalid private journal ID'))
   return database.transaction({isolation:'read committed',readOnly:false},async c=>{
    const {reader,head,active}=await barrier(c),terminal=await receipt(c,id)
    if(terminal!==null)return terminal
    if(active!==id)return fail()
    const intents=await journalRows(c,limits,'sync_commit_intent','id',id)
    if(intents.length!==1)return fail()
    const intent=intents[0],revision=head.revision as number,target=intent.target_revision as number
    if(revision<(intent.expected_revision as number))return fail()
    const applied=await journalRows(c,limits,'sync_commit_applied','intent_id',id)
    const audits=await reader.select('sync_audit','revision=$1',[target]),acceptances=await reader.select('sync_acceptance','revision=$1',[target])
    let resolution:CommitResolution
    if(revision===intent.expected_revision) {
     if(applied.length||audits.length||acceptances.length)return fail()
     resolution='not_committed'
    }else {
     if(audits.length!==1||!validCommitAudit(audits[0],revision))return fail()
     const audit=audits[0]
     if(audit.outcome==='failure'?acceptances.length!==0:acceptances.length!==1||!validCommitAcceptance(acceptances[0],audit))return fail()
     // Every occupied v2 generation must have its immutable marker, even when
     // another intent owns the slot. Audit alone is never complete state proof.
     const occupied=await journalRows(c,limits,'sync_commit_applied','revision',target)
     if(occupied.length!==1)return fail()
     const owners=occupied[0].intent_id===id?[intent]:await journalRows(c,limits,'sync_commit_intent','id',occupied[0].intent_id)
     if(owners.length!==1)return fail()
     const owner=owners[0],expectedAudit={revision:target,source_id:owner.source_id,outcome:owner.outcome,attempt_completed_at:owner.attempt_completed_at,acceptance_revision:owner.outcome==='failure'?null:target}
     if(owner.target_revision!==target||occupied[0].state_digest!==owner.state_digest||canonicalJson(audit)!==canonicalJson(expectedAudit))return fail()
     if(owner.outcome!=='failure') {
       const acceptance={revision:target,...Object.fromEntries(Object.keys(owner).filter(k=>k.startsWith('global_')).map(k=>[k.slice(7),owner[k]]))}
       if(canonicalJson(acceptances[0])!==canonicalJson(acceptance))return fail()
     }
     if(applied.length) {
      if(applied[0].revision!==target||applied[0].state_digest!==intent.state_digest||occupied[0].intent_id!==id)return fail()
      // Immutable marker trigger checked complete own/global desired state at
      // original finalization, including failure count/retry and independent TTL.
      resolution='committed'
     }else {if(occupied[0].intent_id===id)return fail();resolution='conflict'}
    }
    await journalBool(c,limits,'settle_sync_commit_intent',[id,resolution])
    return resolution
   })
  },
 }
}
