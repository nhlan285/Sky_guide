import assert from 'node:assert/strict'
import test from 'node:test'
import { decodeCatalogRows,encodeCatalogRows } from '../../src/server/catalogRows.ts'
import { encodeReleaseRows,decodeReleaseRows } from '../../src/server/releaseRows.ts'
import { encodeProjectionRows,decodeProjectionRows } from '../../src/server/projectionRows.ts'
import { decodeSyncStateRows } from '../../src/server/syncStateRows.ts'
import { encodeGraphHistoryRows } from '../../src/server/graphHistoryRows.ts'
import { encodeManifestOrderRows } from '../../src/server/manifestOrderRows.ts'
import { candidateReviewHash,stageSourceSnapshot } from '../../src/server/sourceSync.ts'
import { payloadEvidenceFixture } from '../fixtures/payloadEvidence.mjs'
import { acceptedFrame,contract,empty } from '../fixtures/syncReadFrame.mjs'

test('typed payload evidence is an independently ordered subset while private identity evidence remains exact',()=>{
 const f=payloadEvidenceFixture(),rows=f.catalog
 assert.deepEqual(decodeCatalogRows(rows,{identities:f.identities}),f.payload)
 const proof=(table,id)=>rows[table].filter(r=>r.kind==='item'&&r.id===id).sort((a,b)=>a.position-b.position).map(r=>r.provenance_id)
 assert.deepEqual(proof('identity_provenance','tsa-cosmetic-9002'),['fixture-private-proof','fixture-release-proof','fixture-public-proof-b'])
 assert.deepEqual(proof('payload_provenance','tsa-cosmetic-9002'),['fixture-public-proof-b','fixture-release-proof'])
 for(const r of Object.values(rows)) r.reverse()
 assert.deepEqual(decodeCatalogRows(rows,{identities:f.identities}),f.payload)
 assert.deepEqual(f.identities[0].provenanceIds,['fixture-private-proof','fixture-release-proof','fixture-public-proof-b'])
})

test('valid SourceSync public subset stages/restores exact review and release bytes without publishing private proof',async()=>{
 const f=payloadEvidenceFixture(),staged=await stageSourceSnapshot({sourceId:'K15',raw:'synthetic evidence boundary',normalizationVersion:'fixture-v1',base:empty(),contract,
  normalize:async()=>({identities:f.graph,publicFiles:f.snapshot,provenanceIds:f.provenanceIds}),fetchedAt:'2026-10-07T00:00:00Z',now:()=>Date.parse('2026-10-07T00:01:00Z')})
 assert.equal(staged.status,'staged');const candidate=staged.candidate,{frame}=await acceptedFrame()
 Object.assign(frame.metadata.sync_acceptance[0],{content_hash:candidate.contentHash,source_hash:candidate.sourceHash,candidate_hash:candidateReviewHash(candidate)})
 frame.graph=encodeGraphHistoryRows({identities:candidate.identities,provenanceIds:candidate.provenanceIds},1);frame.projection=encodeProjectionRows(candidate.publicFiles,'2026-10-07T00:02:30Z');frame.manifestOrder=encodeManifestOrderRows(candidate.publicFiles.manifest,1)
 const restored=await decodeSyncStateRows(frame,'K15',contract);assert.deepEqual(restored.lastKnownGood,candidate)
 assert.deepEqual(decodeProjectionRows(frame.projection,'fixture-release'),f.snapshot)
 const release=encodeReleaseRows(f.snapshot,f.publicCatalog)
 assert.deepEqual(decodeReleaseRows(release,f.publicCatalog),f.snapshot)
 assert.ok([...f.snapshot.files.values()].every(text=>!text.includes('fixture-private-proof')))
 assert.throws(()=>encodeReleaseRows(f.snapshot,f.catalog)) // full private rows are not an implicit public filter
})

test('missing/non-subset/duplicate/gapped/cross-owner record evidence never falls back to identity evidence',()=>{
 const f=payloadEvidenceFixture()
 for(const mutate of [r=>{r.payload_provenance=[]},r=>{delete r.payload_provenance},r=>{r.payload_provenance[0].provenance_id='missing'},
  r=>{r.payload_provenance[0].position=4},r=>{r.payload_provenance.push({...r.payload_provenance[0]})},r=>{r.payload_provenance[0].kind='spirit'},
  r=>{r.identity_provenance[0].provenance_id='missing'},r=>{r.identity_provenance[0].position=10},r=>{r.identity_provenance=[]},
  r=>{r.payload_provenance.find(p=>p.id==='tsa-cosmetic-9001').provenance_id='fixture-public-proof-b'},
  r=>{r.payload_provenance[0].provenance_id='fixture-private-proof'}, // registered subset but forged reviewed payload when authoritative input checked below
 ]) {
  const rows=globalThis.structuredClone(f.catalog);mutate(rows)
  if(rows.payload_provenance?.[0]?.provenance_id==='fixture-private-proof') {
   assert.notDeepEqual(decodeCatalogRows(rows,{identities:f.identities}),f.payload)
  }else assert.throws(()=>decodeCatalogRows(rows,{identities:f.identities}))
 }
 const nodes=globalThis.structuredClone(f.identities);nodes[0].provenanceIds=['fixture-private-proof']
 assert.throws(()=>encodeCatalogRows(f.payload,{identities:nodes}));assert.throws(()=>decodeCatalogRows(f.catalog,{identities:nodes}))
})
