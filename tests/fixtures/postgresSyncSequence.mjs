import assert from 'node:assert/strict'
import { catalogColumns,decodeCatalogRows } from '../../src/server/catalogRows.ts'
import { prepareCanonicalPayloadPlan } from '../../src/server/canonicalPayloadPlan.ts'
import { stageSourceSnapshot,candidateReviewHash } from '../../src/server/sourceSync.ts'
import { payloadWriteFixture } from './canonicalPayloadWrite.mjs'
import { emptyTables,empty,contract,expectedPromotion,expectedFailure,tablesForState,decodeTables } from './postgresSyncStore.mjs'

// Synthetic registered proof pool, two publications/two-source failures/new review
// reconfirmation. These are private DB fixtures, never real source/reviewer imports.
export async function postgresSyncSequence() {
 const {f,candidate:changed}=await payloadWriteFixture(),initial=emptyTables()
 for(const t of ['source_registry','provenance','provenance_order']) initial[t]=globalThis.structuredClone(f.catalog[t])
 const emptyGraph={identities:[],crosswalks:[],aliases:[],tombstones:[],relations:[]}
 const initialPayload=decodeCatalogRows(Object.fromEntries(Object.keys(catalogColumns).map(t=>[t,initial[t]])))
 let tables=initial,canonical={payload:initialPayload,graph:emptyGraph}
 const phases=[]
 const stage=async(normalized,base,raw,fetched,staged)=>{
  const result=await stageSourceSnapshot({sourceId:'K15',raw,normalizationVersion:'fixture-v1',base,contract,normalize:async()=>normalized,
   fetchedAt:`2026-10-07T00:${fetched}:00Z`,now:()=>Date.parse(`2026-10-07T00:${staged}:00Z`)})
  assert.equal(result.status,'staged');return result.candidate
 }
 const promote=async(c,reviewed,promoted)=>{
  const current=await decodeTables(tables),review={contentHash:c.contentHash,candidateHash:candidateReviewHash(c),baseRevision:current.revision,reviewerRef:'fixture-reviewer',reviewedAt:`2026-10-07T00:${reviewed}:00Z`}
  const next=await expectedPromotion(current,c,review,`2026-10-07T00:${promoted}:00Z`),nextTables=await tablesForState(next,'K15',tables,canonical)
  phases.push({sourceId:'K15',expected:current.revision,next,initial:tables,tables:nextTables})
  const plan=await prepareCanonicalPayloadPlan(c,contract,canonical);canonical={payload:plan.payload,graph:c.identities};tables=nextTables
 }
 const first=await stage({identities:f.graph,publicFiles:f.snapshot,provenanceIds:f.provenanceIds},empty(),'first synthetic fixture','00','01')
 await promote(first,'02','03')
 const second=await stage({identities:changed.identities,publicFiles:changed.publicFiles,provenanceIds:changed.provenanceIds},await decodeTables(tables),'second synthetic fixture','04','05')
 await promote(second,'06','07')
 for(const [sourceId,minute] of [['K01','08'],['K15','09']]) {
  const current=await decodeTables(tables,sourceId),next=await expectedFailure(current,sourceId,`2026-10-07T00:${minute}:00Z`),nextTables=await tablesForState(next,sourceId,tables)
  phases.push({sourceId,expected:current.revision,next,initial:tables,tables:nextTables});tables=nextTables
 }
 const reconfirmed=await stage({identities:second.identities,publicFiles:second.publicFiles,provenanceIds:second.provenanceIds},await decodeTables(tables),'second synthetic fixture','10','11')
 assert.equal(reconfirmed.contentHash,second.contentHash);await promote(reconfirmed,'12','13')
 return {f,initial,phases,tables,canonical}
}
