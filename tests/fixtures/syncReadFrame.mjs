import assert from 'node:assert/strict'
import { SOURCE_IDS } from '../../src/data/core/index.ts'
import { encodeGraphHistoryRows } from '../../src/server/graphHistoryRows.ts'
import { encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { encodeManifestOrderRows } from '../../src/server/manifestOrderRows.ts'
import { candidateReviewHash,stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { releaseFixture } from './releaseRows.mjs'

export const contract={sourceIds:new Set(SOURCE_IDS),maxSnapshotBytes:1000,maxNormalizedBytes:1_000_000,maxRecords:1000,maxRelations:1000,retryDelaysMs:[60_000]}
export const empty=()=>({revision:0,lastKnownGood:null,lastPromotedAt:null,freshness:null,lastAttemptAt:null,failures:0,nextRetryAt:null,approval:null})
export async function acceptedFrame(order=null) {
 const {snapshot,catalog}=releaseFixture()
 if(order) snapshot.manifest.datasets=Object.fromEntries(order.map(name=>[name,snapshot.manifest.datasets[name]]))
 const graph={identities:catalog.domain_identity.map(r=>({kind:r.kind,id:r.id,revision:r.revision,schemaVersion:r.schema_version,updatedAt:r.updated_at,retiredAt:r.retired_at,fixture:r.fixture,provenanceIds:['fixture-release-proof']})),
  crosswalks:[],aliases:[],tombstones:[],relations:[]}
 const result=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic fixture',normalizationVersion:'fixture-v1',base:empty(),contract,normalize:async()=>({identities:graph,provenanceIds:['fixture-release-proof'],publicFiles:snapshot}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
 assert.equal(result.status,'staged')
 const candidate=result.candidate,review={contentHash:candidate.contentHash,candidateHash:candidateReviewHash(candidate),baseRevision:0,reviewerRef:'fixture-reviewer',reviewedAt:'2026-10-07T00:02:00Z'},promoted='2026-10-07T00:03:00.000Z'
 const metadata={sync_generation:[{singleton:1,revision:1,current_acceptance_revision:1,last_promoted_at:promoted}],
  sync_acceptance:[{revision:1,source_id:'K15',catalog_version:'fixture-release',content_hash:candidate.contentHash,source_hash:candidate.sourceHash,candidate_hash:review.candidateHash,
   normalization_version:'fixture-v1',base_revision:0,fetched_at:candidate.fetchedAt,staged_at:candidate.stagedAt,reviewer_ref:review.reviewerRef,reviewed_at:review.reviewedAt,promoted_at:promoted,valid_until:null}],
  sync_source_state:[{source_id:'K15',last_success_revision:1,health:'healthy',last_attempt_at:candidate.fetchedAt,failures:0,next_retry_at:null}],
  sync_audit:[{revision:1,source_id:'K15',outcome:'promoted',attempt_completed_at:candidate.fetchedAt,acceptance_revision:1}]}
 return {candidate,review,frame:{metadata,graph:encodeGraphHistoryRows({identities:candidate.identities,provenanceIds:candidate.provenanceIds},1),projection:encodeProjectionRows(candidate.publicFiles,'2026-10-07T00:02:30Z'),manifestOrder:encodeManifestOrderRows(candidate.publicFiles.manifest,1)}}
}
