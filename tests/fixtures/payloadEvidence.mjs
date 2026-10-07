import { createHash } from 'node:crypto'
import { decodeCatalogRows,encodeCatalogRows } from '../../src/server/catalogRows.ts'
import { canonicalJson,canonicalizeSnapshotFiles } from '../../src/server/domainSnapshot.ts'
import { releaseFixture } from './releaseRows.mjs'

// Synthetic evidence only. Private pending proof is deliberately impossible to
// export through readCatalog; graph/typed rows must retain it without publishing.
export function payloadEvidenceFixture() {
 const original=releaseFixture(),publicPayload=decodeCatalogRows(original.catalog)
 publicPayload.provenance.push({...publicPayload.provenance[0],id:'fixture-public-proof-b'})
 publicPayload.items[0].provenanceIds=['fixture-public-proof-b','fixture-release-proof']
 const manifest=globalThis.structuredClone(original.snapshot.manifest),files=new Map(original.snapshot.files)
 for(const name of ['items','provenance']) {
  const entry=name==='provenance'?manifest.provenance:manifest.datasets[name],envelope=JSON.parse(files.get(entry.path));envelope.records=publicPayload[name]
  const text=canonicalJson(envelope);files.set(entry.path,text);entry.sha256=createHash('sha256').update(text).digest('hex')
 }
 const snapshot=canonicalizeSnapshotFiles({manifest,files}),privateProof={...publicPayload.provenance[0],id:'fixture-private-proof',sourceId:'K01',sourceUrl:null,verificationStatus:'pending',licenseNote:'Private fixture; no publication rights'}
 const payload=globalThis.structuredClone(publicPayload);payload.provenance.push(privateProof)
 const identities=payload.items.map(p=>({kind:'item',id:p.id,revision:7,schemaVersion:1,updatedAt:p.updatedAt,retiredAt:null,fixture:false,provenanceIds:['fixture-private-proof',...p.provenanceIds.toReversed()]}))
 return {payload,publicPayload,identities,snapshot,catalog:encodeCatalogRows(payload,{identities}),publicCatalog:encodeCatalogRows(publicPayload,{identities:identities.map(n=>({...n,provenanceIds:publicPayload.items.find(p=>p.id===n.id).provenanceIds}))}),
  graph:{identities,crosswalks:[],aliases:[],tombstones:[],relations:[]},provenanceIds:['fixture-private-proof',...publicPayload.provenance.map(p=>p.id)]}
}
