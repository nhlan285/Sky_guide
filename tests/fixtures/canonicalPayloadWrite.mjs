import { payloadCandidate } from './canonicalPayloadPlan.mjs'
import { payloadEvidenceFixture } from './payloadEvidence.mjs'
import { encodeCatalogRows } from '../../src/server/catalogRows.ts'
export const writeLimits={maxRows:1000,maxBytes:200_000}
export async function payloadWriteFixture() {
 const f=payloadEvidenceFixture()
 const seeded=await payloadCandidate(f.snapshot,f.graph,r=>{
  const item=r.items.find(p=>p.id==='tsa-cosmetic-9001'),lookup=r.lookup.find(p=>p.id===item.id)
  item.acquisitionOptions=[{id:'fixture-option',kind:'other',costStatus:'unknown',costs:[{currency:'other',sourceCurrencyLabel:'Fixture currency',amount:null}],friendshipNodeId:null,iapProductId:null,validFrom:null,validTo:null,provenanceIds:['fixture-release-proof']}]
  lookup.offers=[{id:'fixture-option',acquisition:'unknown',seasonPass:false,bundle:false,money:null,sourceUrl:'https://example.invalid/fixture-offer'}]
 })
 f.snapshot=seeded.publicFiles
 for(const name of ['items','lookup']) f.payload[name]=JSON.parse(f.snapshot.files.get(f.snapshot.manifest.datasets[name].path)).records
 f.catalog=encodeCatalogRows(f.payload,{identities:f.graph.identities})
 const publicPayload={...f.payload,provenance:f.publicPayload.provenance}
 f.publicCatalog=encodeCatalogRows(publicPayload,{identities:f.graph.identities.map(n=>({...n,provenanceIds:f.payload.items.find(p=>p.id===n.id).provenanceIds}))})
 const current={payload:f.payload,graph:f.graph}
 const candidate=await payloadCandidate(f.snapshot,f.graph,(r,g)=>{
  const old=r.items.find(p=>p.id==='tsa-cosmetic-9001'),metadata=r.lookup.find(p=>p.id===old.id)
  old.name.default="Reviewed 'quote' \\ path $1";old.acquisitionOptions[0].costStatus='known';old.acquisitionOptions[0].costs[0].amount=0
  metadata.offers[0].money=14.99;g.identities.find(n=>n.id===old.id).revision++
  r.items=[{...globalThis.structuredClone(old),id:'tsa-cosmetic-9003',sourceKeys:{K15:'9003'}},old]
  r.lookup=[metadata,{...globalThis.structuredClone(metadata),id:'tsa-cosmetic-9003',upstreamId:9003,identifier:'Fixture C'}]
  const retired=g.identities.find(n=>n.id==='tsa-cosmetic-9002');retired.revision++;retired.updatedAt='2026-10-07T00:01:00Z';retired.retiredAt=retired.updatedAt
  g.identities.push({...globalThis.structuredClone(g.identities.find(n=>n.id===old.id)),id:'tsa-cosmetic-9003',revision:1})
  g.identities.push({kind:'cosmetic',id:'fixture-cosmetic-reservation',revision:1,schemaVersion:1,updatedAt:old.updatedAt,retiredAt:null,fixture:false,provenanceIds:['fixture-private-proof']})
  g.relations.push({type:'cosmeticItem',fromId:'fixture-cosmetic-reservation',toId:old.id})
  g.crosswalks.push({sourceId:'K02',sourceKey:"Legacy 'quoted' source",target:{kind:'item',id:old.id}})
  g.aliases.push({from:{kind:'item',id:retired.id},to:{kind:'item',id:'fixture-alias'}},{from:{kind:'item',id:'fixture-alias'},to:{kind:'item',id:old.id}})
  g.tombstones.push({target:{kind:'item',id:retired.id},retiredAt:retired.retiredAt,replacement:{kind:'item',id:old.id}})
 })
 // A different immutable catalog version is required for changed public bytes.
 // Rebuild version via the same fixture helper rather than rewriting review hash.
 const versioned=await payloadCandidate(candidate.publicFiles,candidate.identities,(_r,_g,m)=>{
  m.catalogVersion='fixture-release-next'
  for(const e of Object.values({...m.datasets,provenance:m.provenance})) e.dataVersion=m.catalogVersion
 })
 return {f,current,candidate:versioned}
}
