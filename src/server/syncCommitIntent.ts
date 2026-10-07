import { createHash,randomUUID } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { SOURCE_IDS,validateDateTime } from '../data/core/index.ts'
import { rangeErrors } from '../data/catalog/shared.ts'
import { canonicalJson } from './domainSnapshot.ts'
import { candidateReviewHash } from './sourceSync.ts'
import type { SyncState } from './sourceSync.ts'
import type { CatalogRow } from './catalogRows.ts'
import { syncMetadataColumns } from './syncMetadataRows.ts'

export type CommitResolution='committed'|'not_committed'|'conflict'
export interface SyncCommitIntent {
 version:1;id:string;sourceId:string;expectedRevision:number;revision:number
 success:'promoted'|'unchanged'|'recorded';stateDigest:string
 audit:CatalogRow;acceptance:CatalogRow|null
}
// Backend MUST atomically fence ALL sources/workers, persist before acknowledging
// claim, preserve immutable intents across restart and durably settle only this ID.
// Uncertain journal acknowledgements cannot authorize SQL or a new claim.
// Terminal ID/resolution receipts must be retained by the backend, not blindly deleted.
export interface SyncCommitJournal {
 // Linearizable settlement barrier, NOT a replica/stale ordinary read: wait out
 // earlier in-flight claim/settle operations before returning null/active state.
 // The backend must bound raw stored bytes before parsing (codec checks acceptance).
 load():Promise<SyncCommitIntent|null>
 claim(intent:SyncCommitIntent):Promise<boolean>
 settle(id:string,resolution:CommitResolution):Promise<void>
}
const fail=():never=>{throw new Error('Invalid private commit intent')}
const sha=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v)
const positive=(v:unknown):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0
const instant=(v:unknown):v is string=>typeof v==='string'&&validateDateTime(v).valid
const text=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0
const source=(v:unknown):v is string=>SOURCE_IDS.some(s=>s===v)
const before=(a:string,b:string)=>!rangeErrors({value:a,precision:'instant',timezone:null,rawLabel:null},{value:b,precision:'instant',timezone:null,rawLabel:null},[]).length
const shape=(row:CatalogRow,columns:readonly string[])=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).length===columns.length&&columns.every(c=>Object.hasOwn(row,c))
 &&Object.values(row).every(v=>v===null||typeof v==='string'||typeof v==='number'&&Number.isFinite(v))

export function validCommitAudit(row:CatalogRow,headRevision:number):boolean {
 return shape(row,syncMetadataColumns.sync_audit)&&positive(row.revision)&&row.revision<=headRevision&&source(row.source_id)
  &&instant(row.attempt_completed_at)&&['promoted','reconfirmed','failure'].includes(String(row.outcome))
  &&(row.outcome==='failure'?row.acceptance_revision===null:row.acceptance_revision===row.revision)
}
export function validCommitAcceptance(row:CatalogRow,audit:CatalogRow):boolean {
 return shape(row,syncMetadataColumns.sync_acceptance)&&row.revision===audit.revision&&row.source_id===audit.source_id
  &&text(row.catalog_version)&&sha(row.content_hash)&&sha(row.source_hash)&&sha(row.candidate_hash)&&text(row.normalization_version)
  &&row.base_revision===(audit.revision as number)-1&&instant(row.fetched_at)&&row.fetched_at===audit.attempt_completed_at
  &&instant(row.staged_at)&&instant(row.reviewed_at)&&instant(row.promoted_at)&&text(row.reviewer_ref)
  &&(row.valid_until===null||instant(row.valid_until)&&before(row.promoted_at,row.valid_until))
  &&before(row.fetched_at,row.staged_at)&&before(row.staged_at,row.reviewed_at)&&before(row.reviewed_at,row.promoted_at)
  &&createHash('sha256').update(JSON.stringify([row.content_hash,row.base_revision,row.fetched_at,row.staged_at])).digest('hex')===row.candidate_hash
}
export function decodeSyncCommitIntent(input:unknown):SyncCommitIntent {
 if(!input||typeof input!=='object'||Array.isArray(input)) return fail()
 const i=input as SyncCommitIntent,keys=['version','id','sourceId','expectedRevision','revision','success','stateDigest','audit','acceptance']
 if(Object.keys(i).length!==keys.length||keys.some(k=>!Object.hasOwn(i,k))||i.version!==1
  ||typeof i.id!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(i.id)||!source(i.sourceId)
  ||!Number.isSafeInteger(i.expectedRevision)||i.expectedRevision<0||!positive(i.revision)||i.revision!==i.expectedRevision+1
  ||!sha(i.stateDigest)||!validCommitAudit(i.audit,i.revision)||i.audit.revision!==i.revision||i.audit.source_id!==i.sourceId) return fail()
 // Keep outcome/result consistency separate from the structural guard.
 if(i.audit.outcome==='failure') {if(i.acceptance!==null||i.success!=='recorded')return fail()}
 else if(!i.acceptance||!validCommitAcceptance(i.acceptance,i.audit)||i.success!==(i.audit.outcome==='promoted'?'promoted':'unchanged'))return fail()
 if(Buffer.byteLength(JSON.stringify(i))>32768) return fail()
 return structuredClone(i)
}
export function prepareSyncCommitIntent(sourceId:string,current:SyncState,next:SyncState,id=randomUUID()):SyncCommitIntent {
 const promotion=Boolean(next.lastKnownGood&&next.approval&&next.lastKnownGood.sourceId===sourceId&&next.lastKnownGood.baseRevision===current.revision&&next.failures===0)
 const c=next.lastKnownGood,a=next.approval,outcome=promotion?current.lastKnownGood?.contentHash===c!.contentHash?'reconfirmed':'promoted':'failure'
 const acceptance=promotion?{revision:next.revision,source_id:sourceId,catalog_version:(c!.publicFiles.manifest as {catalogVersion:string}).catalogVersion,
  content_hash:c!.contentHash,source_hash:c!.sourceHash,candidate_hash:a!.candidateHash,normalization_version:c!.normalizationVersion,base_revision:c!.baseRevision,
  fetched_at:c!.fetchedAt,staged_at:c!.stagedAt,reviewer_ref:a!.reviewerRef,reviewed_at:a!.reviewedAt,promoted_at:next.lastPromotedAt,valid_until:next.freshness?.validUntil??null}:null
 const digest=createHash('sha256').update(canonicalJson([next.revision,next.lastAttemptAt,next.failures,next.nextRetryAt,next.lastPromotedAt,next.freshness,next.approval,
  c?[c.contentHash,candidateReviewHash(c)]:null])).digest('hex')
 return decodeSyncCommitIntent({version:1,id,sourceId,expectedRevision:current.revision,revision:next.revision,success:promotion?outcome==='promoted'?'promoted':'unchanged':'recorded',stateDigest:digest,
  audit:{revision:next.revision,source_id:sourceId,outcome,attempt_completed_at:next.lastAttemptAt,acceptance_revision:promotion?next.revision:null},acceptance})
}
