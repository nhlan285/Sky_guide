import type { GraphHistoryRows } from './graphHistoryRows.ts'
import { decodeGraphHistoryRows } from './graphHistoryRows.ts'
import type { ProjectionRows } from './projectionRows.ts'
import { decodeProjectionRows } from './projectionRows.ts'
import type { SyncMetadataRows } from './syncMetadataRows.ts'
import { decodeSyncMetadataRows } from './syncMetadataRows.ts'
import type { SyncContract, SyncState } from './sourceSync.ts'
import { candidateReviewHash, validateStoredSyncCandidate } from './sourceSync.ts'
import type { CatalogRow } from './catalogRows.ts'
import { decodeManifestOrderRows } from './manifestOrderRows.ts'

export interface SyncReadFrame {
  metadata: SyncMetadataRows
  graph: GraphHistoryRows|null
  projection: ProjectionRows|null
  manifestOrder: CatalogRow[]|null
}
const invalid = (): never => {throw new Error('Invalid private sync read frame')}

// Future provider must fetch this whole frame in ONE consistent transaction/read
// snapshot. Graph + projection belong to global LKG, never selected-source latest
// success or current mutable canonical payload. This is a decoder, NOT SyncStore.
export async function decodeSyncStateRows(input: SyncReadFrame,sourceId: string,contract: SyncContract): Promise<SyncState> {
  if(!contract.sourceIds.has(sourceId)||!input||typeof input!=='object'||Array.isArray(input)
    ||Object.keys(input).length!==4||!['metadata','graph','projection','manifestOrder'].every(k=>Object.hasOwn(input,k))) return invalid()
  const frame=structuredClone(input),meta=decodeSyncMetadataRows(frame.metadata,sourceId),accepted=meta.acceptance
  const common={revision:meta.revision,lastPromotedAt:meta.lastPromotedAt,freshness:meta.freshness,lastAttemptAt:meta.lastAttemptAt,failures:meta.failures,nextRetryAt:meta.nextRetryAt}
  if(accepted===null) {
    if(frame.graph!==null||frame.projection!==null||frame.manifestOrder!==null) return invalid()
    return {...common,lastKnownGood:null,approval:null}
  }
  if(frame.graph===null||frame.projection===null||frame.manifestOrder===null) return invalid()
  const graph=decodeGraphHistoryRows(frame.graph,accepted.revision),publicFiles=decodeProjectionRows(frame.projection,accepted.catalogVersion)
  publicFiles.manifest=decodeManifestOrderRows(frame.manifestOrder,publicFiles.manifest,accepted.revision)
  const candidate=await validateStoredSyncCandidate({...graph,publicFiles,sourceId:accepted.sourceId,sourceHash:accepted.sourceHash,normalizationVersion:accepted.normalizationVersion,
    baseRevision:accepted.baseRevision,contentHash:accepted.contentHash,fetchedAt:accepted.fetchedAt,stagedAt:accepted.stagedAt},contract)
  if(candidateReviewHash(candidate)!==accepted.candidateHash) return invalid()
  return {...common,lastKnownGood:candidate,approval:{contentHash:accepted.contentHash,candidateHash:accepted.candidateHash,baseRevision:accepted.baseRevision,reviewerRef:accepted.reviewerRef,reviewedAt:accepted.reviewedAt}}
}
