import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { createPostgresSyncStore } from '../../src/server/postgresSyncStore.ts'
import { prepareCanonicalPayloadPlan } from '../../src/server/canonicalPayloadPlan.ts'
import { candidateReviewHash,stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { acceptedFrame } from '../fixtures/syncReadFrame.mjs'
import { storeOptions,scriptedDatabase,tablesForState,expectedPromotion,expectedFailure,decodeTables,emptyTables,empty,contract } from '../fixtures/postgresSyncStore.mjs'

async function accepted() {
 const {candidate,review}=await acceptedFrame(),state=await expectedPromotion(empty(),candidate,review)
 const tables=await tablesForState(state,'K15'),plan=await prepareCanonicalPayloadPlan(candidate,contract,null)
 return {candidate,review,state,tables,canonical:{payload:plan.payload,graph:candidate.identities}}
}

test('portable Store reads one repeatable-read pinned frame and first promotion persists whole validated state',async()=>{
 const {candidate,state,tables}=await accepted(),db=scriptedDatabase(emptyTables(),{nextTables:tables}),store=createPostgresSyncStore(db,contract,storeOptions)
 assert.deepEqual(await store.read('K15'),empty())
 assert.equal(db.transactions[0].options.isolation,'repeatable read');assert.equal(db.transactions[0].options.readOnly,true)
 assert.equal(await store.compareAndSwap('K15',0,state),true)
 const tx=db.transactions[1];assert.deepEqual(tx.options,{isolation:'read committed',readOnly:false})
 assert.match(tx.queries[0].text,/from sky_private\.sync_generation.+for update$/)
 assert.ok(tx.committed);assert.ok(tx.writes.some(s=>s.text.startsWith('insert into sky_private.acceptance_graph')))
 assert.ok(tx.writes.some(s=>s.text.startsWith('insert into sky_private.acceptance_manifest_dataset')))
 assert.ok(tx.writes.some(s=>s.text.startsWith('insert into sky_private.release_projection(')))
 assert.equal(tx.writes.at(-1).text,'set constraints all immediate')
 assert.deepEqual(await store.read('K15'),state)
 const actual=await store.read('K01');assert.equal(actual.freshness,null);assert.deepEqual(actual.lastKnownGood,candidate)
 actual.lastKnownGood.publicFiles.files.clear();assert.deepEqual(await store.read('K15'),state)
})

test('global stale generation returns false after first locked head read with zero writes',async()=>{
 const {state,tables}=await accepted(),db=scriptedDatabase(tables),store=createPostgresSyncStore(db,contract,storeOptions)
 assert.equal(await store.compareAndSwap('K15',0,{...state,revision:999}),false)
 assert.equal(db.transactions[0].queries.length,1);assert.equal(db.transactions[0].writes.length,0);assert.deepEqual(db.tables,tables)
})

test('CAS false/provider statement/deferred-check/post-read/commit errors roll back complete callback',async()=>{
 const {state,tables}=await accepted()
 for(const settings of [{casResult:false},{errorWhen:s=>s.text.startsWith('insert into sky_private.acceptance_graph')},
  {errorWhen:s=>s.text==='set constraints all immediate'},{commitError:true},{nextTables:emptyTables()}]) {
  const db=scriptedDatabase(emptyTables(),{nextTables:tables,...settings}),store=createPostgresSyncStore(db,contract,storeOptions)
  await assert.rejects(()=>store.compareAndSwap('K15',0,state))
  assert.deepEqual(db.tables,emptyTables());assert.ok(db.transactions[0].rolledBack);assert.ok(!db.transactions[0].committed)
 }
})

test('first/independent source failure changes only health/audit generation; global LKG stays exact',async()=>{
 for(const start of [null,await accepted()]) {
  const initial=start?.tables??emptyTables(),base=start?await decodeTables(initial,'K01'):empty(),next=await expectedFailure(base,'K01','2026-10-07T00:04:00Z')
  const tables=await tablesForState(next,'K01',initial),db=scriptedDatabase(initial,{nextTables:tables}),store=createPostgresSyncStore(db,contract,storeOptions)
  assert.equal(await store.compareAndSwap('K01',base.revision,next),true)
  assert.deepEqual(await store.read('K01'),next)
  const writes=db.transactions[0].writes.filter(s=>!s.text.startsWith('set constraints'))
  assert.equal(writes.length,2);assert.match(writes[0].text,/insert into sky_private.source_registry/);assert.match(writes[1].text,/apply_sync_metadata_cas/)
  assert.equal(writes[1].values[2],'failure')
  if(start) assert.deepEqual((await store.read('K15')).lastKnownGood,start.candidate)
 }
})

test('same-content recovery archives new review/graph/order, reuses exact immutable release and resets own health',async()=>{
 const {tables,canonical}=await accepted(),before=await decodeTables(tables),failed=await expectedFailure(before,'K15','2026-10-07T00:04:00Z')
 const failedTables=await tablesForState(failed,'K15',tables)
 const staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic fixture',normalizationVersion:'fixture-v1',base:failed,contract,
  normalize:async()=>({identities:before.lastKnownGood.identities,publicFiles:before.lastKnownGood.publicFiles,provenanceIds:before.lastKnownGood.provenanceIds}),
  fetchedAt:'2026-10-07T00:05:00Z',now:()=>Date.parse('2026-10-07T00:06:00Z')})
 assert.equal(staged.status,'staged');assert.equal(staged.candidate.contentHash,before.lastKnownGood.contentHash)
 const review={contentHash:staged.candidate.contentHash,candidateHash:candidateReviewHash(staged.candidate),baseRevision:failed.revision,reviewerRef:'fixture-reviewer',reviewedAt:'2026-10-07T00:07:00Z'}
 const next=await expectedPromotion(failed,staged.candidate,review,'2026-10-07T00:08:00Z'),nextTables=await tablesForState(next,'K15',failedTables,canonical)
 const db=scriptedDatabase(failedTables,{nextTables}),store=createPostgresSyncStore(db,contract,storeOptions)
 assert.equal(await store.compareAndSwap('K15',failed.revision,next),true)
 const writes=db.transactions[0].writes
 assert.equal(writes.find(s=>s.text.includes('apply_sync_metadata_cas')).values[2],'reconfirmed')
 assert.ok(!writes.some(s=>/^insert into sky_private\.(public_release|release_projection|release_dataset)\(/.test(s.text)))
 assert.deepEqual(await store.read('K15'),next)
})

test('typed fact/proof/order/reservation drift rejects before mutations despite valid archived LKG',async()=>{
 const f=await accepted(),staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic fixture',normalizationVersion:'fixture-v1',base:f.state,contract,
  normalize:async()=>({identities:f.candidate.identities,publicFiles:f.candidate.publicFiles,provenanceIds:f.candidate.provenanceIds}),fetchedAt:'2026-10-07T00:04:00Z',now:()=>Date.parse('2026-10-07T00:05:00Z')})
 assert.equal(staged.status,'staged')
 const review={contentHash:staged.candidate.contentHash,candidateHash:candidateReviewHash(staged.candidate),baseRevision:1,reviewerRef:'fixture-reviewer',reviewedAt:'2026-10-07T00:06:00Z'}
 const next=await expectedPromotion(f.state,staged.candidate,review,'2026-10-07T00:07:00Z')
 for(const change of [t=>{t.item[0].name_default='Unreviewed mutation'},t=>{t.provenance[0].license_note='Unreviewed rights'},t=>{t.item[0].position=10},
  t=>{t.identity_provenance=[]},t=>{t.domain_identity[0].revision++},t=>{t.source_crosswalk.push({source_id:'K15',kind:'item',source_key:'unreviewed',target_id:t.item[0].id})}]) {
  const bad=globalThis.structuredClone(f.tables);change(bad);const db=scriptedDatabase(bad),store=createPostgresSyncStore(db,contract,storeOptions)
  await assert.rejects(()=>store.compareAndSwap('K15',1,next));assert.equal(db.transactions[0].writes.length,0);assert.deepEqual(db.tables,bad)
 }
})

test('forged next file bytes/review/health/retry/extra state/future clock fail exact existing SourceSync transition',async()=>{
 const f=await accepted(),failed=await expectedFailure(f.state,'K15','2026-10-07T00:04:00Z')
 for(const mutate of [s=>{s.lastKnownGood.publicFiles.files.set('items.json','forged')},s=>{s.approval.reviewerRef='forged'},s=>{s.failures=99},s=>{s.nextRetryAt=null},s=>{s.extra='unreviewed'}]) {
  const next=globalThis.structuredClone(failed);mutate(next);const db=scriptedDatabase(f.tables),store=createPostgresSyncStore(db,contract,storeOptions)
  await assert.rejects(()=>store.compareAndSwap('K15',1,next));assert.equal(db.transactions[0].writes.length,0)
 }
 const db=scriptedDatabase(emptyTables()),store=createPostgresSyncStore(db,contract,{...storeOptions,now:()=>Date.parse('2026-10-06T00:00:00Z')})
 await assert.rejects(()=>store.compareAndSwap('K15',0,f.state));assert.equal(db.transactions[0].writes.length,0)
})

test('transport/row/write byte budgets and malformed driver rows fail closed without partial commit',async()=>{
 const f=await accepted()
 for(const options of [{...storeOptions,readLimits:{maxRows:1,maxBytes:4_000_000}},
  {...storeOptions,readLimits:{maxRows:10_000,maxBytes:1}}, {...storeOptions,writeLimits:{maxRows:1,maxBytes:4_000_000}},
  {...storeOptions,writeLimits:{maxRows:10_000,maxBytes:1}}]) {
  const db=scriptedDatabase(emptyTables(),{nextTables:f.tables}),store=createPostgresSyncStore(db,contract,options)
  await assert.rejects(()=>store.compareAndSwap('K15',0,f.state));assert.deepEqual(db.tables,emptyTables())
 }
 const bad=globalThis.structuredClone(f.tables);bad.sync_generation[0].revision='1'
 const db=scriptedDatabase(bad),store=createPostgresSyncStore(db,contract,storeOptions)
 await assert.rejects(()=>store.read('K15'));assert.ok(db.transactions[0].rolledBack)
})

test('full pinned K15 goes through portable Store promotion/read with every public byte/graph/review field intact',async()=>{
 const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
 const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(e=>[e.path,readFileSync(new URL(e.path,root),'utf8')]))
 const records=n=>JSON.parse(files.get((n==='provenance'?manifest.provenance:manifest.datasets[n]).path)).records
 const items=records('items'),spirits=records('spirits'),seasons=records('seasons')
 const identities={identities:[...items.map(r=>({...r,kind:'item'})),...spirits.map(r=>({...r,kind:'spirit'})),...seasons.map(r=>({...r,kind:'season'}))]
  .map(r=>({kind:r.kind,id:r.id,revision:1,schemaVersion:1,updatedAt:r.updatedAt,retiredAt:null,fixture:false,provenanceIds:r.provenanceIds})),crosswalks:[],aliases:[],tombstones:[],
  relations:[...items.flatMap(r=>r.seasonIds.map(toId=>({type:'itemSeason',fromId:r.id,toId}))),...items.flatMap(r=>r.spiritIds.map(toId=>({type:'itemSpirit',fromId:r.id,toId}))),...spirits.flatMap(r=>r.seasonIds.map(toId=>({type:'spiritSeason',fromId:r.id,toId})))]}
 const limits={...contract,maxNormalizedBytes:40_000_000,maxRecords:100_000,maxRelations:100_000}
 const staged=await stageSourceSnapshot({sourceId:'K15',raw:'test-only pinned local K15',normalizationVersion:'fixture-v1',base:empty(),contract:limits,
  normalize:async()=>({identities,provenanceIds:records('provenance').map(p=>p.id),publicFiles:{manifest,files}}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
 assert.equal(staged.status,'staged')
 const candidate=staged.candidate,review={contentHash:candidate.contentHash,candidateHash:candidateReviewHash(candidate),baseRevision:0,reviewerRef:'fixture-reviewer',reviewedAt:'2026-10-07T00:02:00Z'}
 const next=await expectedPromotion(empty(),candidate,review,'2026-10-07T00:03:00Z',limits),tables=await tablesForState(next,'K15',emptyTables(),null,limits)
 const db=scriptedDatabase(emptyTables(),{nextTables:tables}),store=createPostgresSyncStore(db,limits,{...storeOptions,readLimits:{maxRows:200_000,maxBytes:128_000_000},writeLimits:{maxRows:100_000,maxBytes:64_000_000}})
 assert.equal(await store.compareAndSwap('K15',0,next),true)
 assert.deepEqual(await store.read('K15'),next)
 assert.equal(db.tables.item.length,1808);assert.equal(db.tables.spirit.length,213);assert.equal(db.tables.season.length,30)
 assert.equal(db.tables.graph_identity.length,2051)
})

test('explicit nullable SyncState fields cannot silently serialize undefined as null',async()=>{
 const next=await expectedFailure(empty(),'K01','2026-10-07T00:04:00Z'),nextTables=await tablesForState(next,'K01')
 for(const field of ['lastKnownGood','freshness','approval','lastPromotedAt']) {
  const malformed=globalThis.structuredClone(next);malformed[field]=undefined
  const db=scriptedDatabase(emptyTables(),{nextTables}),store=createPostgresSyncStore(db,contract,storeOptions)
  await assert.rejects(()=>store.compareAndSwap('K01',0,malformed));assert.equal(db.transactions[0].writes.length,0)
 }
 const second=await expectedFailure(next,'K01','2026-10-07T00:06:00Z'),before=nextTables,after=await tablesForState(second,'K01',before)
 assert.equal(second.nextRetryAt,null);second.nextRetryAt=undefined
 const db=scriptedDatabase(before,{nextTables:after}),store=createPostgresSyncStore(db,contract,storeOptions)
 await assert.rejects(()=>store.compareAndSwap('K01',1,second));assert.equal(db.transactions[0].writes.length,0)
})
