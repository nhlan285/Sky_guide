import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import test from 'node:test'
import { SOURCE_IDS } from '../../src/data/core/index.ts'
import { relations, validateIdentityGraph } from '../../src/data/domain/identity.ts'
import { decodeGraphHistoryRows, encodeGraphHistoryRows, graphRelationTables } from '../../src/server/graphHistoryRows.ts'
import { candidateReviewHash, stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { graphHistoryFixture } from '../fixtures/graphHistoryRows.mjs'

test('all 14 kinds/20 explicit relation owners retain every ordered graph field and unknown alias sources',() => {
  const frame=graphHistoryFixture(),rows=encodeGraphHistoryRows(frame,7)
  assert.equal(Object.keys(rows).length,27)
  for(const table of Object.values(graphRelationTables)) assert.equal(rows[table].length,1)
  assert.equal(rows.graph_alias[0].target_alias_id,'retired')
  assert.equal(rows.graph_alias[1].target_identity_id,'shared')
  for(const table of Object.keys(rows)) rows[table].reverse()
  const decoded=decodeGraphHistoryRows(rows,7)
  assert.deepEqual(decoded,frame)
  assert.equal(JSON.stringify(decoded),JSON.stringify(frame))
  frame.identities.identities[0].revision=99
  rows.graph_identity[0].revision=101
  assert.equal(decoded.identities.identities[0].revision,3)
})

test('full K15 graph history retains SourceSync content and review hashes after provider row reordering',async () => {
  const root=new URL('../../data/public/tsa-v1-74007cf878ef/',import.meta.url),manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'))
  const files=new Map(Object.values({...manifest.datasets,provenance:manifest.provenance}).map(e=>[e.path,readFileSync(new URL(e.path,root),'utf8')]))
  const records=name=>JSON.parse(files.get((name==='provenance'?manifest.provenance:manifest.datasets[name]).path)).records
  const items=records('items'),spirits=records('spirits'),seasons=records('seasons'),provenanceIds=records('provenance').map(p=>p.id)
  const graph={identities:[...items.map(r=>({...r,kind:'item'})),...spirits.map(r=>({...r,kind:'spirit'})),...seasons.map(r=>({...r,kind:'season'}))]
    .map(r=>({kind:r.kind,id:r.id,revision:1,schemaVersion:1,updatedAt:r.updatedAt,retiredAt:null,fixture:false,provenanceIds:r.provenanceIds})),crosswalks:[],aliases:[],tombstones:[],
    relations:[...items.flatMap(r=>r.seasonIds.map(toId=>({type:'itemSeason',fromId:r.id,toId}))),...items.flatMap(r=>r.spiritIds.map(toId=>({type:'itemSpirit',fromId:r.id,toId}))),
      ...spirits.flatMap(r=>r.seasonIds.map(toId=>({type:'spiritSeason',fromId:r.id,toId})))]}
  const rows=encodeGraphHistoryRows({identities:graph,provenanceIds},1)
  for(const table of Object.keys(rows)) rows[table].reverse()
  const restored=decodeGraphHistoryRows(rows,1)
  assert.deepEqual(restored,{identities:graph,provenanceIds})
  assert.equal(restored.identities.identities.length,2051)
  const options={sourceId:'K15',raw:'synthetic-transport-for-local-parity',normalizationVersion:'graph-parity-v1',base:{revision:0,lastKnownGood:null,lastPromotedAt:null,freshness:null,lastAttemptAt:null,failures:0,nextRetryAt:null,approval:null},
    contract:{sourceIds:new Set(SOURCE_IDS),maxSnapshotBytes:1000,maxNormalizedBytes:30_000_000,maxRecords:30_000,maxRelations:30_000,retryDelaysMs:[]},
    fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')}
  const before=await stageSourceSnapshot({...options,normalize:async()=>({identities:graph,provenanceIds,publicFiles:{manifest,files}})})
  const after=await stageSourceSnapshot({...options,normalize:async()=>({...restored,publicFiles:{manifest,files}})})
  assert.equal(after.contentHash,before.contentHash)
  assert.equal(candidateReviewHash(after),candidateReviewHash(before))
})

test('partial/cross-acceptance/duplicate/gapped/orphan/changed rows fail closed without silent drops',() => {
  const base=encodeGraphHistoryRows(graphHistoryFixture(),7)
  for(const change of [r=>{r.acceptance_graph=[]},r=>{r.graph_identity.pop()},r=>{r.graph_provenance.reverse();r.graph_provenance[0].position=0},
    r=>{r.graph_item_season[0].position=500},r=>{r.graph_item_spirit[0].position=r.graph_item_season[0].position},
    r=>{r.graph_identity[0].acceptance_revision=8},r=>{r.graph_identity[0].revision='3'},r=>{r.graph_identity[0].fixture='false'},
    r=>{r.graph_identity[0].position=-1},r=>{r.graph_identity_provenance[0].id='orphan'},r=>{r.graph_identity_provenance[0].position=2},
    r=>{r.graph_alias[0].target_identity_id='retired';r.graph_alias[0].target_alias_id=null},r=>{r.graph_alias[0].target_identity_id='shared'},
    r=>{r.acceptance_graph[0].graph_sha256='0'.repeat(64)},r=>{r.acceptance_graph[0].identity_count=0},
    r=>{r.graph_crosswalk[0].source_key+='changed'},r=>{r.graph_identity[0].revision=4},
    r=>{r.graph_call_media[0].to_id='missing'},r=>{r.graph_tombstone[0].replacement_id='shared'},
    r=>{r.graph_identity[0].unexpected='private'},r=>{r.extra=[]},r=>{delete r.graph_emote_media},
    r=>{r.graph_tombstone.push({...r.graph_tombstone[0]})},r=>{r.graph_crosswalk.push({...r.graph_crosswalk[0]})},
  ]) {const rows=globalThis.structuredClone(base);change(rows);assert.throws(()=>decodeGraphHistoryRows(rows,7))}
  assert.throws(()=>decodeGraphHistoryRows(base,8))
  assert.throws(()=>decodeGraphHistoryRows(base,0))
})

test('domain invariants remain authoritative even after recomputing transport counts/hash',() => {
  const original=graphHistoryFixture()
  const changes=[f=>{f.identities.relations=f.identities.relations.filter(r=>r.type!=='instrumentSamples')},
    f=>{f.identities.identities.push({...f.identities.identities.find(n=>n.kind==='call'),id:'second-call'});f.identities.relations.push({type:'callItem',fromId:'second-call',toId:'call-item'})},
    f=>{f.identities.relations.find(r=>r.type==='itemSeason').toId='shared'},
    f=>{f.identities.aliases[1].to.id='legacy-unknown'},f=>{f.identities.tombstones[1].replacement.id='emote-item'},
    f=>{f.identities.identities.find(n=>n.id==='shared'&&n.kind==='item').provenanceIds=[]},
    f=>{f.identities.crosswalks[0].sourceId='K99'},f=>{f.provenanceIds.push(f.provenanceIds[0])},
    f=>{f.identities.identities.push({...f.identities.identities[0]})}]
  for(const change of changes) {const frame=globalThis.structuredClone(original);change(frame);assert.throws(()=>encodeGraphHistoryRows(frame,7))}
  const rows=encodeGraphHistoryRows(original,7)
  rows.graph_instrument_samples=[];rows.acceptance_graph[0].relation_count--
  const forged=globalThis.structuredClone(original);forged.identities.relations=forged.identities.relations.filter(r=>r.type!=='instrumentSamples')
  rows.acceptance_graph[0].graph_sha256=createHash('sha256').update(JSON.stringify(forged)).digest('hex')
  assert.throws(()=>decodeGraphHistoryRows(rows,7))
})

test('accepted graph history remains detached across owner changes, and previous graph continuity rejects regressions',() => {
  const frame=graphHistoryFixture(),oldRows=encodeGraphHistoryRows(frame,7),old=decodeGraphHistoryRows(oldRows,7)
  const next=globalThis.structuredClone(frame),owner=next.identities.identities.find(n=>n.kind==='item'&&n.id==='shared')
  next.identities.relations=next.identities.relations.filter(r=>r.type!=='itemMedia')
  assert.throws(()=>encodeGraphHistoryRows(next,8,old.identities))
  owner.revision++;owner.updatedAt='2026-10-07T00:01:00Z'
  assert.ok(validateIdentityGraph(next.identities,new Set(next.provenanceIds),new Set(SOURCE_IDS),old.identities).valid)
  const newRows=encodeGraphHistoryRows(next,8,old.identities)
  assert.deepEqual(decodeGraphHistoryRows(oldRows,7),old)
  assert.deepEqual(decodeGraphHistoryRows(newRows,8),next)
  assert.equal(old.identities.relations.length,Object.keys(relations).length)
  next.identities.aliases[0].to.id='shared'
  assert.throws(()=>encodeGraphHistoryRows(next,9,old.identities))
})
