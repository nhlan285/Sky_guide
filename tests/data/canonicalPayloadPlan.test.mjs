import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { prepareCanonicalPayloadPlan } from '../../src/server/canonicalPayloadPlan.ts'
import { prepareCanonicalPayloadWrite } from '../../src/server/canonicalPayloadWrite.ts'
import { decodeCatalogRows } from '../../src/server/catalogRows.ts'
import { decodeReleaseRows } from '../../src/server/releaseRows.ts'
import { releaseFixture } from '../fixtures/releaseRows.mjs'
import { payloadEvidenceFixture } from '../fixtures/payloadEvidence.mjs'
import { payloadCandidate } from '../fixtures/canonicalPayloadPlan.mjs'
import { contract } from '../fixtures/syncReadFrame.mjs'

test('full current K15 preparation preserves every field/order and exact scoped public release bytes',async()=>{
 const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
 const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(e=>[e.path,readFileSync(new URL(e.path,root),'utf8')]))
 const records=Object.fromEntries(Object.entries({...manifest.datasets,provenance:manifest.provenance}).map(([n,e])=>[n,JSON.parse(files.get(e.path)).records]))
 // Test-only identity frame over pinned local records, not a real import/review.
 const {items,spirits,seasons}=records
 const graph={identities:[...items.map(r=>({...r,kind:'item'})),...spirits.map(r=>({...r,kind:'spirit'})),...seasons.map(r=>({...r,kind:'season'}))]
  .map(r=>({kind:r.kind,id:r.id,revision:1,schemaVersion:1,updatedAt:r.updatedAt,retiredAt:null,fixture:false,provenanceIds:r.provenanceIds})),crosswalks:[],aliases:[],tombstones:[],
  relations:[...items.flatMap(r=>r.seasonIds.map(toId=>({type:'itemSeason',fromId:r.id,toId}))),...items.flatMap(r=>r.spiritIds.map(toId=>({type:'itemSpirit',fromId:r.id,toId}))),...spirits.flatMap(r=>r.seasonIds.map(toId=>({type:'spiritSeason',fromId:r.id,toId})))]}
 const limit={...contract,maxNormalizedBytes:40_000_000,maxRecords:100_000,maxRelations:100_000}
 const candidate=await payloadCandidate({manifest,files},graph,()=>{},limit)
 const write=await prepareCanonicalPayloadWrite(candidate,limit,null,{maxRows:100_000,maxBytes:40_000_000}),plan=write.plan
 assert.ok(write.statements.length>0)
 assert.ok(write.statements.every(s=>s.values.length<=4096)) // bounded bind allocation even for full local K15
 assert.equal(plan.rows.item.length,1808);assert.equal(plan.rows.spirit.length,213);assert.equal(plan.rows.season.length,30)
 assert.deepEqual(plan.payload,records);assert.deepEqual(decodeCatalogRows(plan.rows,{identities:graph.identities}),records)
 assert.deepEqual(decodeReleaseRows(plan.release,plan.publicRows),candidate.publicFiles)
 const next=await prepareCanonicalPayloadPlan(candidate,limit,{payload:plan.payload,graph})
 assert.deepEqual(next.rows,plan.rows);assert.deepEqual(next.candidate,candidate)
})

test('registered private proofs remain canonical while public rows contain exact independently ordered subset',async()=>{
 const f=payloadEvidenceFixture(),current={payload:f.payload,graph:f.graph},candidate=await payloadCandidate(f.snapshot,f.graph)
 const before=globalThis.structuredClone(current),plan=await prepareCanonicalPayloadPlan(candidate,contract,current)
 assert.deepEqual(plan.payload,f.payload);assert.deepEqual(plan.rows,f.catalog);assert.deepEqual(plan.publicRows,f.publicCatalog)
 assert.deepEqual(decodeReleaseRows(plan.release,plan.publicRows),candidate.publicFiles);assert.deepEqual(current,before)
 assert.equal(plan.candidate.contentHash,candidate.contentHash)
 await assert.rejects(()=>prepareCanonicalPayloadPlan(candidate,contract,null)) // never fabricate new private proof facts
 plan.rows.item[0].name_default='Caller mutation';plan.candidate.identities.identities[0].revision=999
 assert.deepEqual(current,before);assert.notEqual(candidate.identities.identities[0].revision,999)
})

test('removed public roots/lookup/proofs are retained, explicit retirement changes only reviewed metadata',async()=>{
 const f=payloadEvidenceFixture(),current={payload:f.payload,graph:f.graph}
 const candidate=await payloadCandidate(f.snapshot,f.graph,(r,g)=>{
  r.items=r.items.filter(p=>p.id==='tsa-cosmetic-9001');r.lookup=r.lookup.filter(p=>p.id==='tsa-cosmetic-9001')
  r.provenance=r.provenance.filter(p=>p.id==='fixture-release-proof')
  const n=g.identities.find(n=>n.id==='tsa-cosmetic-9002');n.revision++;n.updatedAt='2026-10-07T00:01:00Z';n.retiredAt=n.updatedAt
  g.tombstones.push({target:{kind:n.kind,id:n.id},retiredAt:n.retiredAt,replacement:null})
 })
 const plan=await prepareCanonicalPayloadPlan(candidate,contract,current),retained=plan.payload.items[1]
 assert.deepEqual(plan.payload.items.map(p=>p.id),['tsa-cosmetic-9001','tsa-cosmetic-9002'])
 assert.deepEqual(retained,{...f.payload.items[0],updatedAt:'2026-10-07T00:01:00Z',recordStatus:'retired'})
 assert.deepEqual(plan.payload.lookup,['tsa-cosmetic-9001','tsa-cosmetic-9002'].map(id=>f.payload.lookup.find(p=>p.id===id)))
 assert.equal(plan.rows.identity_provenance.length,5);assert.equal(plan.rows.payload_provenance.length,3)
 assert.equal(plan.publicRows.item.length,1);assert.equal(plan.publicRows.provenance.length,1)
 assert.deepEqual(decodeReleaseRows(plan.release,plan.publicRows),candidate.publicFiles)
})

test('changed item and lookup facts require higher item revision; graph-only validation is insufficient',async()=>{
 const {snapshot,catalog}=releaseFixture(),payload=decodeCatalogRows(catalog)
 const graph={identities:catalog.domain_identity.map(n=>({kind:n.kind,id:n.id,revision:n.revision,schemaVersion:1,updatedAt:n.updated_at,retiredAt:null,fixture:false,provenanceIds:['fixture-release-proof']})),crosswalks:[],aliases:[],tombstones:[],relations:[]}
 const current={payload,graph}
 const mutations=[r=>{r.items[0].name.default='Reviewed new name'},r=>{r.lookup[1].identifier='Reviewed new identifier'},r=>{r.items[0].rawSlot='Reviewed raw label'}]
 for(const mutate of mutations) {
  const unchanged=await payloadCandidate(snapshot,graph,mutate);await assert.rejects(()=>prepareCanonicalPayloadPlan(unchanged,contract,current))
  const revised=await payloadCandidate(snapshot,graph,(r,g)=>{mutate(r);g.identities.find(n=>n.id==='tsa-cosmetic-9002').revision++})
  const plan=await prepareCanonicalPayloadPlan(revised,contract,current);assert.equal(plan.rows.domain_identity[0].revision,2)
 }
 const reordered=await payloadCandidate(snapshot,graph,r=>{r.items.reverse();r.lookup.reverse()})
 const plan=await prepareCanonicalPayloadPlan(reordered,contract,current)
 assert.deepEqual(plan.payload.items.map(p=>p.id),payload.items.map(p=>p.id).toReversed()) // order is release metadata, not owner content
})

test('corrupt current graph/proof/payload and candidate hash/budgets reject whole preparation',async()=>{
 const f=payloadEvidenceFixture(),candidate=await payloadCandidate(f.snapshot,f.graph)
 for(const mutate of [c=>{c.graph.identities[0].revision=0},c=>{c.payload.provenance.pop()},c=>{c.payload.items[0].updatedAt='2026-10-06T00:00:00Z'},c=>{c.graph.identities.pop()}]) {
  const current={payload:globalThis.structuredClone(f.payload),graph:globalThis.structuredClone(f.graph)};mutate(current)
  await assert.rejects(()=>prepareCanonicalPayloadPlan(candidate,contract,current))
 }
 const corrupted=globalThis.structuredClone(candidate);corrupted.contentHash='0'.repeat(64)
 await assert.rejects(()=>prepareCanonicalPayloadPlan(corrupted,contract,{payload:f.payload,graph:f.graph}))
 await assert.rejects(()=>prepareCanonicalPayloadPlan(candidate,{...contract,maxNormalizedBytes:1},{payload:f.payload,graph:f.graph}))
})

test('spirit and season fact updates use their own revisions; sibling revision cannot authorize changes',async()=>{
 const f=payloadEvidenceFixture()
 const seed=await payloadCandidate(f.snapshot,f.graph,(r,g)=>{
  const meta={provenanceIds:['fixture-release-proof'],updatedAt:'2026-10-07T00:00:00Z',recordStatus:'published',fixture:false}
  r.spirits=[{...meta,id:'fixture-spirit',name:{default:'Spirit fixture',translations:{}},category:'unknown',realmId:null,seasonIds:[],treeIds:[]}]
  r.seasons=[{...meta,id:'fixture-season',kind:'season',name:{default:'Season fixture',translations:{}},startsAt:null,endsAt:null,timeStatus:'unknown',summary:null,spiritIds:[],itemIds:[],realmIds:[],mapIds:[],officialArticleIds:[],fieldProvenance:{}}]
  for(const [kind,records] of [['spirit',r.spirits],['season',r.seasons]]) for(const record of records)
   g.identities.push({kind,id:record.id,revision:1,schemaVersion:1,updatedAt:record.updatedAt,retiredAt:null,fixture:false,provenanceIds:record.provenanceIds})
 })
 const seeded=await prepareCanonicalPayloadPlan(seed,contract,{payload:f.payload,graph:f.graph}),current={payload:seeded.payload,graph:seed.identities}
 for(const [kind,change] of [['spirit',r=>{r.spirits[0].category='regular'}],['season',r=>{r.seasons[0].summary='Reviewed fixture summary'}]]) {
  const invalid=await payloadCandidate(seed.publicFiles,seed.identities,(r,g)=>{change(r);g.identities.find(n=>n.kind==='item').revision++})
  await assert.rejects(()=>prepareCanonicalPayloadPlan(invalid,contract,current))
  const valid=await payloadCandidate(seed.publicFiles,seed.identities,(r,g)=>{change(r);g.identities.find(n=>n.kind===kind).revision++})
  const plan=await prepareCanonicalPayloadPlan(valid,contract,current)
  assert.equal(plan.rows.domain_identity.find(n=>n.kind===kind).revision,2)
 }
})
