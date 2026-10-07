import { validateIdentityGraph } from '../data/domain/identity.ts'
import type { Identity, IdentityGraph } from '../data/domain/identity.ts'
import type { DomainMetadata } from '../data/catalog/types.ts'
import { validateManifest } from '../data/itemLookup/release.ts'
import { canonicalJson } from './domainSnapshot.ts'
import { decodeCatalogRows, encodeCatalogRows } from './catalogRows.ts'
import type { CatalogPayloads, CatalogRowContext, CatalogRows } from './catalogRows.ts'
import { encodeReleaseRows } from './releaseRows.ts'
import type { ReleaseRows } from './releaseRows.ts'
import { validateStoredSyncCandidate } from './sourceSync.ts'
import type { SyncCandidate, SyncContract } from './sourceSync.ts'

export interface CurrentCanonicalPayload { payload: CatalogPayloads; graph: IdentityGraph }
export interface CanonicalPayloadPlan {
  candidate: SyncCandidate
  payload: CatalogPayloads
  rows: CatalogRows
  // Explicit reviewed public view for release metadata; never write this view
  // over canonical evidence/retained roots. Immutable projection owns old bytes.
  publicRows: CatalogRows
  release: ReleaseRows
}
const key=(kind:string,id:string)=>JSON.stringify([kind,id])
const reject=():never=>{throw new Error('Invalid canonical payload transition')}
const same=(a:unknown,b:unknown)=>canonicalJson(a)===canonicalJson(b)

// Pure preparation, not a transaction, publication, revision allocator or review
// authenticator. Driver must supply current payload + graph from ONE locked frame.
export async function prepareCanonicalPayloadPlan(input:SyncCandidate,contract:SyncContract,current:CurrentCanonicalPayload|null,
  deferred:CatalogRowContext['deferred']={}):Promise<CanonicalPayloadPlan> {
  const candidate=await validateStoredSyncCandidate(input,contract)
  const old=current?structuredClone(current):null
  if(old) {
    const checked=validateIdentityGraph(old.graph,new Set(old.payload.provenance.map(p=>p.id)),contract.sourceIds)
    if(!checked.valid) return reject()
    old.graph=checked.value
    old.payload=decodeCatalogRows(encodeCatalogRows(old.payload,{identities:old.graph.identities,deferred}),{identities:old.graph.identities,deferred})
  }
  const graph=validateIdentityGraph(candidate.identities,new Set(candidate.provenanceIds),contract.sourceIds,old?.graph)
  if(!graph.valid) return reject()
  const nodes=new Map(graph.value.identities.map(n=>[key(n.kind,n.id),n]))
  const previous=new Map(old?.graph.identities.map(n=>[key(n.kind,n.id),n])??[])
  const manifest=validateManifest(candidate.publicFiles.manifest)
  if(!manifest.valid) return reject()
  const published=Object.fromEntries(['items','lookup','spirits','seasons','provenance'].map(name=>{
    const entry=name==='provenance'?manifest.value.provenance:manifest.value.datasets[name]
    const text=candidate.publicFiles.files.get(entry.path)
    if(text===undefined) return reject()
    return [name,JSON.parse(text).records]
  })) as unknown as CatalogPayloads
  // Canonical candidate files were validated above. Preserve their record order,
  // not readCatalog's sorted search order. Validate typed media/module boundaries.
  const publicNodes:Identity[]=graph.value.identities.filter(n=>
    n.kind==='item'?published.items.some(r=>r.id===n.id):n.kind==='spirit'?published.spirits.some(r=>r.id===n.id):n.kind==='season'&&published.seasons.some(r=>r.id===n.id))
    .map(n=>({...n,provenanceIds:(n.kind==='item'?published.items:n.kind==='spirit'?published.spirits:published.seasons).find(r=>r.id===n.id)!.provenanceIds}))
  const publicRows=encodeCatalogRows(published,{identities:publicNodes,deferred})
  const release=encodeReleaseRows(candidate.publicFiles,publicRows)
  const merge=<T extends {id:string}>(incoming:T[],existing:T[])=>{
    const ids=new Set(incoming.map(r=>r.id))
    return [...incoming,...existing.filter(r=>!ids.has(r.id))]
  }
  const provenance=merge(published.provenance,old?.payload.provenance??[])
  const registered=new Set(provenance.map(p=>p.id))
  if(candidate.provenanceIds.some(id=>!registered.has(id))) return reject()
  const retain=<T extends DomainMetadata & {id:string}>(kind:'item'|'spirit'|'season',incoming:T[],existing:T[])=>{
    const incomingIds=new Set(incoming.map(r=>r.id))
    const entries=merge(incoming,existing).map(record=>{
      const node=nodes.get(key(kind,record.id))
      if(!node||record.provenanceIds.some(id=>!node.provenanceIds.includes(id))) return reject()
      const next=incomingIds.has(record.id)?record:{...record,updatedAt:node.updatedAt,fixture:node.fixture,...(node.retiredAt?{recordStatus:'retired' as const}:{})}
      const before=existing.find(r=>r.id===record.id),owner=previous.get(key(kind,record.id))
      if(before&&!same(before,next)&&(!owner||node.revision<=owner.revision)) return reject()
      return next
    })
    return entries
  }
  const items=retain('item',published.items,old?.payload.items??[])
  const spirits=retain('spirit',published.spirits,old?.payload.spirits??[])
  const seasons=retain('season',published.seasons,old?.payload.seasons??[])
  const lookup=merge(published.lookup,old?.payload.lookup??[])
  for(const record of lookup) {
    const before=old?.payload.lookup.find(r=>r.id===record.id),node=nodes.get(key('item',record.id)),owner=previous.get(key('item',record.id))
    if(before&&!same(before,record)&&(!node||!owner||node.revision<=owner.revision)) return reject()
  }
  // Retained active roots cannot acquire guessed relationship facts. Retired roots
  // retain their last-known payload links; only active graph relations are live.
  const joins=(kind:'item'|'spirit',records:typeof items|typeof spirits)=>{
    for(const record of records) {
      if(nodes.get(key(kind,record.id))?.retiredAt!==null) continue
      const checks=kind==='item'?[['itemSeason',record.seasonIds],['itemSpirit',(record as typeof items[number]).spiritIds]]:[['spiritSeason',record.seasonIds]]
      for(const [type,ids] of checks) {
        const actual=graph.value.relations.filter(e=>e.type===type&&e.fromId===record.id).map(e=>e.toId).sort()
        if(!same(actual,[...(ids as string[])].sort())) return reject()
      }
    }
  }
  joins('item',items);joins('spirit',spirits)
  const rows=encodeCatalogRows({items,lookup,spirits,seasons,provenance},{identities:graph.value.identities,deferred})
  const payload=decodeCatalogRows(rows,{identities:graph.value.identities,deferred})
  return {candidate,payload,rows,publicRows,release}
}
