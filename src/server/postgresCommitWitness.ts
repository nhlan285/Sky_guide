import { canonicalJson } from './domainSnapshot.ts'
import { privateSyncReader } from './postgresSyncRows.ts'
import type { SqlDatabase,SqlReadLimits } from './postgresSyncRows.ts'
import { decodeSyncCommitIntent,validCommitAudit,validCommitAcceptance } from './syncCommitIntent.ts'
import type { SyncCommitIntent,CommitResolution } from './syncCommitIntent.ts'

export type WitnessResolution=CommitResolution|'unverifiable'
export interface SyncCommitWitness {reconcile(intent:SyncCommitIntent):Promise<WitnessResolution>}

// MUST acquire a fresh safe lease after original disposal, never original callback
// connection. Lock barrier waits out its head lock; READ COMMITTED sees final rows
// AFTER the wait. Caller must ALSO prove no old pre-BEGIN work can dispatch later
// before accepting not_committed. Restart recovery has no such proof yet and the
// outward fence keeps absence quarantined. This is not a replica/absence heuristic.
export function createPostgresCommitWitness(database:SqlDatabase,inputLimits:SqlReadLimits):SyncCommitWitness {
 const limits={...inputLimits}
 privateSyncReader({query:async()=>{throw new Error('No query during validation')}},limits)
 return {reconcile:async(input)=>{
  const intent=decodeSyncCommitIntent(input)
  return database.transaction({isolation:'read committed',readOnly:false},async c=>{
   const reader=privateSyncReader(c,limits),head=(await reader.head(true))[0],revision=head.revision
   if(typeof revision!=='number'||revision<intent.expectedRevision)return 'unverifiable'
   const audits=await reader.select('sync_audit','revision=$1',[intent.revision])
   const acceptances=await reader.select('sync_acceptance','revision=$1',[intent.revision])
   if(revision===intent.expectedRevision)return !audits.length&&!acceptances.length?'not_committed':'unverifiable'
   if(audits.length!==1||!validCommitAudit(audits[0],revision))return 'unverifiable'
   const audit=audits[0]
   if(audit.outcome==='failure') {
    if(acceptances.length)return 'unverifiable'
    // Counts/backoff/health are mutable; exact failure audit alone cannot attest
    // the complete proposed state after successors. Do not silently infer them.
    return canonicalJson(audit)===canonicalJson(intent.audit)?'unverifiable':'conflict'
   }
   if(acceptances.length!==1||!validCommitAcceptance(acceptances[0],audit))return 'unverifiable'
   return canonicalJson(audit)===canonicalJson(intent.audit)&&canonicalJson(acceptances[0])===canonicalJson(intent.acceptance)?'committed':'conflict'
  })
 }}
}
