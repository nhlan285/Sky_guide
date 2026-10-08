import { Buffer } from 'node:buffer'
import { prepareSyncCommitIntent,validCommitAcceptance } from './syncCommitIntent.ts'
import type { SyncState } from './sourceSync.ts'
import type { CatalogRow } from './catalogRows.ts'

// LOCAL v2 schema proposal preparation only. Current v1 portable contract is not
// changed. No database/SDK/journal execution or durable acceptance from this codec.
export const commitProposalColumns={
 sync_commit_intent:['id','format_version','source_id','expected_revision','state_digest','outcome','attempt_completed_at','next_failures','next_retry_at','next_health','next_success_at','next_valid_until',
  'global_source_id','global_catalog_version','global_content_hash','global_source_hash','global_candidate_hash','global_normalization_version','global_base_revision','global_fetched_at','global_staged_at',
  'global_reviewer_ref','global_reviewed_at','global_promoted_at','global_valid_until'],
 sync_commit_control:['singleton','active_intent_id'],sync_commit_applied:['intent_id','revision','state_digest'],sync_commit_receipt:['intent_id','resolution'],
} as const
const reject=():never=>{throw new Error('Invalid typed commit proposal state')}
export function prepareSyncCommitProposalRow(sourceId:string,current:SyncState,next:SyncState,id:string,currentGlobalAcceptance:CatalogRow|null):CatalogRow {
 const intent=prepareSyncCommitIntent(sourceId,current,next,id),c=next.lastKnownGood,a=next.approval,f=next.freshness
 if((c===null)!==(a===null)||(c===null)!==(next.lastPromotedAt===null)
  ||!Number.isSafeInteger(next.failures)||next.failures<0
  ||intent.success==='recorded'&&next.failures!==current.failures+1
  ||intent.success!=='recorded'&&(next.failures!==0||next.nextRetryAt!==null||f?.health!=='healthy')
  ||f!==null&&(f.health!==(next.failures?'offline':'healthy')||typeof f.lastSuccessAt!=='string'))return reject()
 const row:CatalogRow={id:intent.id,format_version:2,source_id:sourceId,expected_revision:current.revision,state_digest:intent.stateDigest,outcome:intent.audit.outcome,
  attempt_completed_at:next.lastAttemptAt,next_failures:next.failures,next_retry_at:next.nextRetryAt,next_health:f?.health??null,next_success_at:f?.lastSuccessAt??null,next_valid_until:f?.validUntil??null,
  global_source_id:c?.sourceId??null,global_catalog_version:c?(c.publicFiles.manifest as {catalogVersion:string}).catalogVersion:null,
  global_content_hash:c?.contentHash??null,global_source_hash:c?.sourceHash??null,global_candidate_hash:a?.candidateHash??null,global_normalization_version:c?.normalizationVersion??null,
  global_base_revision:c?.baseRevision??null,global_fetched_at:c?.fetchedAt??null,global_staged_at:c?.stagedAt??null,global_reviewer_ref:a?.reviewerRef??null,global_reviewed_at:a?.reviewedAt??null,
  global_promoted_at:next.lastPromotedAt,global_valid_until:c?intent.acceptance?.valid_until??null:null}
 // Failure keeps GLOBAL acceptance validity independently of OWN freshness. The
 // pinned current frame must provide it; no null/default inferred from SyncState.
 if(intent.success==='recorded'&&c!==null) {
  if(!currentGlobalAcceptance||!validCommitAcceptance(currentGlobalAcceptance,{revision:c.baseRevision+1,source_id:c.sourceId,attempt_completed_at:c.fetchedAt}))return reject()
  for(const field of commitProposalColumns.sync_commit_intent.filter(k=>k.startsWith('global_')&&k!=='global_valid_until'))
   if(row[field]!==currentGlobalAcceptance[field.slice(7)])return reject()
  row.global_valid_until=currentGlobalAcceptance.valid_until
 }else if(intent.success==='recorded'&&currentGlobalAcceptance!==null)return reject()
 if(commitProposalColumns.sync_commit_intent.some(k=>row[k]===undefined)||Buffer.byteLength(JSON.stringify(row))>32768)return reject()
 return structuredClone(row)
}
