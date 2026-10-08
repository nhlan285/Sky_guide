import { createHash } from 'node:crypto'
import { SOURCE_IDS, validateDateTime } from '../data/core/index.ts'
import type { Freshness } from '../data/domain/repository.ts'
import type { CatalogRow } from './catalogRows.ts'
import { rangeErrors } from '../data/catalog/shared.ts'

export const syncMetadataColumns = {
  sync_generation: ['singleton','revision','current_acceptance_revision','last_promoted_at'],
  sync_acceptance: ['revision','source_id','catalog_version','content_hash','source_hash','candidate_hash','normalization_version','base_revision','fetched_at','staged_at','reviewer_ref','reviewed_at','promoted_at','valid_until'],
  sync_source_state: ['source_id','last_success_revision','health','last_attempt_at','failures','next_retry_at'],
  sync_audit: ['revision','source_id','outcome','attempt_completed_at','acceptance_revision'],
} as const
export type SyncMetadataRows = Record<keyof typeof syncMetadataColumns,CatalogRow[]>
export interface AcceptanceMetadata {
  revision: number; sourceId: string; catalogVersion: string; contentHash: string; sourceHash: string; candidateHash: string
  normalizationVersion: string; baseRevision: number; fetchedAt: string; stagedAt: string; reviewerRef: string; reviewedAt: string; promotedAt: string; validUntil: string|null
}
export interface SyncMetadata {
  revision: number; acceptance: AcceptanceMetadata|null; lastPromotedAt: string|null
  lastAttemptAt: string|null; failures: number; nextRetryAt: string|null; freshness: Freshness|null
  audit: {revision:number;sourceId:string;outcome:'promoted'|'reconfirmed'|'failure';attemptCompletedAt:string;acceptanceRevision:number|null}|null
}
const invalid = (): never => {throw new Error('Invalid private sync metadata rows')}
const text = (value: unknown): string => typeof value==='string'?value:invalid()
const nonblank = (value: unknown): string => text(value).trim()?text(value):invalid()
const natural = (value: unknown): number => typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:invalid()
const nullableNatural = (value: unknown): number|null => value===null?null:natural(value)
const instant = (value: unknown): string => validateDateTime(value).valid?text(value):invalid()
const nullableInstant = (value: unknown): string|null => value===null?null:instant(value)
const sourceId = (value: unknown): string => SOURCE_IDS.some(id=>id===value)?text(value):invalid()
const sha = (value: unknown): string => /^[a-f0-9]{64}$/.test(text(value))?text(value):invalid()
const before = (first: string,last: string): boolean => !rangeErrors({value:first,precision:'instant',timezone:null,rawLabel:null},{value:last,precision:'instant',timezone:null,rawLabel:null},[]).length

// This read frame is deliberately metadata, NOT SyncState/SyncStore: canonical
// historical graph/payload transaction owners are still required for that adapter.
// Loader supplies one global head/latest audit, selected source (or none), and
// exactly the acceptance rows referenced by global pointer + source success.
export function decodeSyncMetadataRows(rows: SyncMetadataRows,selectedSource: string): SyncMetadata {
  sourceId(selectedSource)
  const tables=Object.keys(syncMetadataColumns) as (keyof SyncMetadataRows)[]
  if(!rows||typeof rows!=='object'||Object.keys(rows).length!==tables.length) return invalid()
  for(const table of tables) {
    if(!Object.hasOwn(rows,table)||!Array.isArray(rows[table])) return invalid()
    for(const row of rows[table]) if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==syncMetadataColumns[table].length
      ||syncMetadataColumns[table].some(c => !Object.hasOwn(row,c))||Object.values(row).some(v => v!==null&&!['string','number'].includes(typeof v))) return invalid()
  }
  if(rows.sync_generation.length!==1||rows.sync_source_state.length>1) return invalid()
  const head=rows.sync_generation[0],revision=natural(head.revision),current=nullableNatural(head.current_acceptance_revision),lastPromotedAt=nullableInstant(head.last_promoted_at)
  if(head.singleton!==1||(current===null)!==(lastPromotedAt===null)||current!==null&&(current<1||current>revision)) return invalid()
  const state=rows.sync_source_state[0]
  if(state&&state.source_id!==selectedSource) return invalid()
  const success=state?nullableNatural(state.last_success_revision):null,needed=new Set([current,success].filter(v=>v!==null))
  if(success!==null&&(success<1||current===null||success>current)) return invalid()
  const accepted=new Map<number,AcceptanceMetadata>()
  for(const r of rows.sync_acceptance) {
    const a: AcceptanceMetadata={revision:natural(r.revision),sourceId:sourceId(r.source_id),catalogVersion:nonblank(r.catalog_version),contentHash:sha(r.content_hash),sourceHash:sha(r.source_hash),candidateHash:sha(r.candidate_hash),
      normalizationVersion:nonblank(r.normalization_version),baseRevision:natural(r.base_revision),fetchedAt:instant(r.fetched_at),stagedAt:instant(r.staged_at),reviewerRef:nonblank(r.reviewer_ref),reviewedAt:instant(r.reviewed_at),promotedAt:instant(r.promoted_at),validUntil:nullableInstant(r.valid_until)}
    const reviewHash=createHash('sha256').update(JSON.stringify([a.contentHash,a.baseRevision,a.fetchedAt,a.stagedAt])).digest('hex')
    if(a.revision<1||a.baseRevision!==a.revision-1||a.revision>revision||!needed.has(a.revision)||accepted.has(a.revision)||a.candidateHash!==reviewHash
      ||!before(a.fetchedAt,a.stagedAt)||!before(a.stagedAt,a.reviewedAt)||!before(a.reviewedAt,a.promotedAt)||a.validUntil!==null&&!before(a.promotedAt,a.validUntil)) return invalid()
    accepted.set(a.revision,a)
  }
  if(accepted.size!==needed.size||[...needed].some(id=>!accepted.has(id))) return invalid()
  const acceptance=current===null?null:accepted.get(current)!
  if(acceptance?.promotedAt!==lastPromotedAt&&acceptance!==null) return invalid()
  const lastAttemptAt=state?nullableInstant(state.last_attempt_at):null,failures=state?natural(state.failures):0,nextRetryAt=state?nullableInstant(state.next_retry_at):null
  const ownSuccess=success===null?null:accepted.get(success)!
  let freshness: Freshness|null=null
  if(state) {
    if((ownSuccess===null)!==(state.health===null)||lastAttemptAt===null||nextRetryAt!==null&&(!failures||!before(lastAttemptAt,nextRetryAt))) return invalid()
    if(ownSuccess) {
      if(ownSuccess.sourceId!==selectedSource||!before(ownSuccess.fetchedAt,lastAttemptAt)||failures>0&&!before(ownSuccess.promotedAt,lastAttemptAt)||state.health!==(failures?'offline':'healthy')) return invalid()
      freshness={health:failures?'offline':'healthy',lastSuccessAt:ownSuccess.promotedAt,validUntil:ownSuccess.validUntil}
    }
  }
  let audit: SyncMetadata['audit']=null
  if(revision===0) {
    if(current!==null||state||rows.sync_audit.length||rows.sync_acceptance.length) return invalid()
  } else {
    if(rows.sync_audit.length!==1) return invalid()
    const r=rows.sync_audit[0]
    if(!['promoted','reconfirmed','failure'].includes(text(r.outcome))) return invalid()
    audit={revision:natural(r.revision),sourceId:sourceId(r.source_id),outcome:text(r.outcome) as 'promoted'|'reconfirmed'|'failure',attemptCompletedAt:instant(r.attempt_completed_at),acceptanceRevision:nullableNatural(r.acceptance_revision)}
    if(audit.revision!==revision||(audit.outcome==='failure')!==(audit.acceptanceRevision===null)||audit.outcome==='failure'&&current===revision
      ||audit.acceptanceRevision!==null&&(audit.acceptanceRevision!==revision||current!==revision||acceptance?.sourceId!==audit.sourceId||acceptance?.fetchedAt!==audit.attemptCompletedAt)
      ||audit.sourceId===selectedSource&&(!state||lastAttemptAt!==audit.attemptCompletedAt||audit.outcome==='failure'&&failures<1
        ||audit.outcome!=='failure'&&(failures!==0||success!==audit.acceptanceRevision))) return invalid()
  }
  return {revision,acceptance,lastPromotedAt,lastAttemptAt,failures,nextRetryAt,freshness,audit}
}
