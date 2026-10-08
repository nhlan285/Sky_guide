import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { encodeGraphHistoryRows } from '../../src/server/graphHistoryRows.ts'
import { canonicalJson } from '../../src/server/domainSnapshot.ts'
import { candidateReviewHash,promoteReviewedSnapshot,recordSourceFailure,stageSourceSnapshot,validateStoredSyncCandidate } from '../../src/server/sourceSync.ts'
import { encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { encodeManifestOrderRows } from '../../src/server/manifestOrderRows.ts'
import { decodeSyncStateRows } from '../../src/server/syncStateRows.ts'
import { acceptedFrame,contract,empty } from '../fixtures/syncReadFrame.mjs'

const digest=text=>createHash('sha256').update(text).digest('hex')
test('pinned metadata + graph + projection reconstruct exact detached accepted SyncState through existing promotion boundary',async()=>{
 const {candidate,review,frame}=await acceptedFrame(),expectedStore={state:empty(),read:async function(){return globalThis.structuredClone(this.state)},compareAndSwap:async function(_source,expected,next){if(this.state.revision!==expected)return false;this.state=next;return true}}
 assert.equal(await promoteReviewedSnapshot(expectedStore,candidate,review,contract,{validUntil:null,now:()=>Date.parse('2026-10-07T00:03:00Z')}),'promoted')
 const actual=await decodeSyncStateRows(frame,'K15',contract)
 assert.deepEqual(actual,expectedStore.state)
 frame.graph.graph_identity[0].revision=999;frame.projection.release_projection_file[0].content='Caller corruption'
 assert.deepEqual(actual,expectedStore.state)
 actual.lastKnownGood.identities.identities[0].revision=1000
 assert.equal(expectedStore.state.lastKnownGood.identities.identities[0].revision,1)
})

test('global LKG/approval survives unrelated source initial/failure state; own failure health and retry remain independent',async()=>{
 const {candidate,review,frame}=await acceptedFrame()
 frame.metadata.sync_source_state=[]
 const before=await decodeSyncStateRows(frame,'K01',contract)
 assert.equal(before.freshness,null);assert.equal(before.lastAttemptAt,null);assert.deepEqual(before.lastKnownGood,candidate);assert.deepEqual(before.approval,review)
 frame.metadata.sync_generation[0].revision=2
 frame.metadata.sync_source_state=[{source_id:'K01',last_success_revision:null,health:null,last_attempt_at:'2026-10-07T00:04:00Z',failures:1,next_retry_at:'2026-10-07T00:05:00.000Z'}]
 frame.metadata.sync_audit=[{revision:2,source_id:'K01',outcome:'failure',attempt_completed_at:'2026-10-07T00:04:00Z',acceptance_revision:null}]
 const after=await decodeSyncStateRows(frame,'K01',contract),store={state:before,read:async function(){return globalThis.structuredClone(this.state)},compareAndSwap:async function(_source,revision,next){if(this.state.revision!==revision)return false;this.state=next;return true}}
 assert.equal(await recordSourceFailure(store,'K01','2026-10-07T00:04:00Z',contract,()=>Date.parse('2026-10-07T00:04:00Z')),'recorded')
 assert.deepEqual(after,store.state);assert.equal(after.lastKnownGood.sourceId,'K15');assert.equal(after.freshness,null)
})

test('initial/first failure metadata has no invented graph, projection, approval or LKG',async()=>{
 const metadata={sync_generation:[{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null}],sync_acceptance:[],sync_source_state:[],sync_audit:[]},frame={metadata,graph:null,projection:null,manifestOrder:null}
 assert.deepEqual(await decodeSyncStateRows(frame,'K15',contract),empty())
 const {frame:accepted}=await acceptedFrame()
 await assert.rejects(()=>decodeSyncStateRows({...frame,graph:accepted.graph},'K15',contract))
 await assert.rejects(()=>decodeSyncStateRows({...frame,projection:accepted.projection},'K15',contract))
 metadata.sync_generation[0].revision=1;metadata.sync_source_state=[{source_id:'K15',last_success_revision:null,health:null,last_attempt_at:'2026-10-07T00:04:00Z',failures:1,next_retry_at:null}]
 metadata.sync_audit=[{revision:1,source_id:'K15',outcome:'failure',attempt_completed_at:'2026-10-07T00:04:00Z',acceptance_revision:null}]
 const state=await decodeSyncStateRows(frame,'K15',contract);assert.equal(state.lastKnownGood,null);assert.equal(state.freshness,null);assert.equal(state.failures,1)
})

test('self-consistent forged graph/projection/review frames still fail the reviewed content binding and projection joins',async()=>{
 const {frame}=await acceptedFrame()
 const forgeGraph=r=>{const g=r.graph;g.graph_identity[0].revision=2;const graph={identities:g.graph_identity.map(i=>({kind:i.kind,id:i.id,revision:i.revision,schemaVersion:i.schema_version,updatedAt:i.updated_at,retiredAt:i.retired_at,fixture:i.fixture,provenanceIds:['fixture-release-proof']})),crosswalks:[],aliases:[],tombstones:[],relations:[]};r.graph=encodeGraphHistoryRows({identities:graph,provenanceIds:['fixture-release-proof']},1)}
 const forgeProjection=r=>{const h=r.projection.release_projection[0],file=r.projection.release_projection_file.find(f=>f.dataset==='items'),payload=JSON.parse(file.content);payload.records[0].name.default='Tampered valid public value';file.content=canonicalJson(payload);file.sha256=digest(file.content);const manifest=JSON.parse(h.manifest_text);manifest.datasets.items.sha256=file.sha256;h.manifest_text=canonicalJson(manifest);h.manifest_sha256=digest(h.manifest_text)}
 const changes=[forgeGraph,forgeProjection,r=>{r.graph=null},r=>{r.projection=null},r=>{r.graph.graph_identity[0].acceptance_revision=2},r=>{r.projection.release_projection[0].catalog_version='other'},
  r=>{r.metadata.sync_acceptance[0].normalization_version='changed'},r=>{r.metadata.sync_acceptance[0].source_hash='f'.repeat(64)},r=>{r.extra=[]},r=>{delete r.graph},
  r=>{r.manifestOrder=null},r=>{r.manifestOrder[0].acceptance_revision=2},r=>{r.manifestOrder[0].dataset=r.manifestOrder[1].dataset},r=>{r.manifestOrder[0].position=4},
  r=>{r.manifestOrder[0].extra='hidden'},r=>{r.manifestOrder[0].position=1;r.manifestOrder[1].position=0},
  r=>{const a=r.metadata.sync_acceptance[0];a.content_hash='e'.repeat(64);a.candidate_hash=digest(JSON.stringify([a.content_hash,a.base_revision,a.fetched_at,a.staged_at]))}]
 for(const change of changes){const r=globalThis.structuredClone(frame);change(r);await assert.rejects(()=>decodeSyncStateRows(r,'K15',contract))}
 await assert.rejects(()=>decodeSyncStateRows(frame,'K99',contract))
 await assert.rejects(()=>decodeSyncStateRows(frame,'K15',{...contract,sourceIds:new Set(['K01'])}))
})

test('restoration honors existing configured normalized byte/record budgets; malformed lifecycle/hash/clock cannot read',async()=>{
 const {frame,candidate}=await acceptedFrame()
 await assert.rejects(()=>decodeSyncStateRows(frame,'K15',{...contract,maxNormalizedBytes:1}))
 await assert.rejects(()=>decodeSyncStateRows(frame,'K15',{...contract,maxRecords:1}))
 await assert.rejects(()=>decodeSyncStateRows(frame,'K15',{...contract,maxRelations:0}))
 for(const change of [c=>{c.contentHash='0'.repeat(64)},c=>{c.normalizationVersion=' '},c=>{c.sourceHash='invalid'},c=>{c.baseRevision=-1},c=>{c.fetchedAt='invalid'},c=>{c.stagedAt='2026-10-06T00:00:00Z'}]) {
  const c=globalThis.structuredClone(candidate);change(c);await assert.rejects(()=>validateStoredSyncCandidate(c,contract))
 }
})

test('all 24 dataset Record orders reconstruct exact review bytes independently of sorted public JSON',async()=>{
 const permutations=xs=>xs.length===0?[[]]:xs.flatMap((x,i)=>permutations(xs.filter((_,j)=>j!==i)).map(rest=>[x,...rest]))
 const hashes=new Set()
 for(const order of permutations(['items','lookup','spirits','seasons'])) {
  const {candidate,frame}=await acceptedFrame(order)
  frame.manifestOrder.reverse()
  const actual=await decodeSyncStateRows(frame,'K15',contract)
  assert.deepEqual(Object.keys(actual.lastKnownGood.publicFiles.manifest.datasets),order)
  assert.equal(JSON.stringify(actual.lastKnownGood.publicFiles.manifest),JSON.stringify(candidate.publicFiles.manifest))
  assert.deepEqual(actual.lastKnownGood,candidate);hashes.add(candidate.contentHash)
 }
 assert.equal(hashes.size,24)
})

test('full current K15 restores accepted candidate/approval with exact manifest order and every graph/public field',async()=>{
 const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
 const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(e=>[e.path,readFileSync(new URL(e.path,root),'utf8')]))
 const records=name=>JSON.parse(files.get((name==='provenance'?manifest.provenance:manifest.datasets[name]).path)).records
 const items=records('items'),spirits=records('spirits'),seasons=records('seasons'),provenanceIds=records('provenance').map(p=>p.id)
 const identities={identities:[...items.map(r=>({...r,kind:'item'})),...spirits.map(r=>({...r,kind:'spirit'})),...seasons.map(r=>({...r,kind:'season'}))]
  .map(r=>({kind:r.kind,id:r.id,revision:1,schemaVersion:1,updatedAt:r.updatedAt,retiredAt:null,fixture:false,provenanceIds:r.provenanceIds})),crosswalks:[],aliases:[],tombstones:[],
  relations:[...items.flatMap(r=>r.seasonIds.map(toId=>({type:'itemSeason',fromId:r.id,toId}))),...items.flatMap(r=>r.spiritIds.map(toId=>({type:'itemSpirit',fromId:r.id,toId}))),...spirits.flatMap(r=>r.seasonIds.map(toId=>({type:'spiritSeason',fromId:r.id,toId})))]}
 const limits={...contract,maxNormalizedBytes:30_000_000,maxRecords:30_000,maxRelations:30_000}
 const staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic fixture over pinned local K15',normalizationVersion:'fixture-v1',base:empty(),contract:limits,normalize:async()=>({identities,provenanceIds,publicFiles:{manifest,files}}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
 assert.equal(staged.status,'staged');const candidate=staged.candidate,{frame}=await acceptedFrame(),accepted=frame.metadata.sync_acceptance[0]
 Object.assign(accepted,{catalog_version:manifest.catalogVersion,content_hash:candidate.contentHash,source_hash:candidate.sourceHash,candidate_hash:candidateReviewHash(candidate)})
 frame.graph=encodeGraphHistoryRows({identities:candidate.identities,provenanceIds:candidate.provenanceIds},1)
 frame.projection=encodeProjectionRows(candidate.publicFiles,'2026-10-07T00:02:30Z')
 frame.manifestOrder=encodeManifestOrderRows(candidate.publicFiles.manifest,1).reverse()
 const restored=await decodeSyncStateRows(frame,'K15',limits)
 assert.deepEqual(restored.lastKnownGood,candidate);assert.equal(restored.approval.candidateHash,candidateReviewHash(candidate))
 assert.equal(JSON.stringify(restored.lastKnownGood.publicFiles.manifest),JSON.stringify(candidate.publicFiles.manifest))
 assert.equal(restored.lastKnownGood.identities.identities.length,2051)
})
