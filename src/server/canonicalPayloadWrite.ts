import { Buffer } from 'node:buffer'
import { SOURCE_IDS } from '../data/core/index.ts'
import { catalogColumns } from './catalogRows.ts'
import type { CatalogRow, CatalogRowContext, CatalogTable, SqlScalar } from './catalogRows.ts'
import { prepareCanonicalPayloadPlan } from './canonicalPayloadPlan.ts'
import type { CanonicalPayloadPlan, CurrentCanonicalPayload } from './canonicalPayloadPlan.ts'
import type { SyncCandidate, SyncContract } from './sourceSync.ts'

export interface SqlStatement { text:string; values:readonly SqlScalar[] }
export interface CanonicalWriteLimits { maxRows:number; maxBytes:number }
export interface CanonicalPayloadWrite { plan:CanonicalPayloadPlan; statements:SqlStatement[]; rowCount:number; byteCount:number }
const fail=():never=>{throw new Error('Invalid or over-budget canonical payload write')}
const batches=<T>(xs:readonly T[],size=100):T[][]=>Array.from({length:Math.ceil(xs.length/size)},(_,i)=>xs.slice(i*size,(i+1)*size))

// Prepared statements only, no provider invocation. Execute ALL statements under
// the global generation lock in one transaction, followed by release/acceptance/
// graph/projection/order/source/audit CAS and forced deferred checks. Never commit
// this canonical fragment alone or treat statement generation as promotion.
export async function prepareCanonicalPayloadWrite(candidate:SyncCandidate,contract:SyncContract,current:CurrentCanonicalPayload|null,
  limits:CanonicalWriteLimits,deferred:CatalogRowContext['deferred']={}):Promise<CanonicalPayloadWrite> {
  if(!Number.isSafeInteger(limits.maxRows)||limits.maxRows<1||!Number.isSafeInteger(limits.maxBytes)||limits.maxBytes<1) return fail()
  const plan=await prepareCanonicalPayloadPlan(candidate,contract,current,deferred),statements:SqlStatement[]=[]
  let bytes=0,count=0
  const add=(text:string,values:SqlScalar[]=[])=>{
    bytes+=Buffer.byteLength(text)+Buffer.byteLength(JSON.stringify(values))
    if(bytes>limits.maxBytes) return fail()
    statements.push({text,values})
  }
  // Identifiers are exclusively static vocabulary below; source/user strings only
  // occur as scalar bind values. Small batches bound driver parameter allocation.
  const insert=(table:string,columns:readonly string[],rows:CatalogRow[],keys:readonly string[]|null=null,immutable=false)=>{
    count+=rows.length;if(count>limits.maxRows) return fail()
    for(const group of batches(rows)) {
      const values=group.flatMap(r=>columns.map(c=>r[c])),changed=columns.filter(c=>!keys?.includes(c))
      if(values.some(v=>v===undefined)) return fail()
      const slots=group.map((_,i)=>`(${columns.map((_,j)=>`$${i*columns.length+j+1}`).join(',')})`).join(',')
      const conflict=keys?` on conflict(${keys.join(',')}) ${immutable||!changed.length?'do nothing':`do update set ${changed.map(c=>`${c}=excluded.${c}`).join(',')}`}`:''
      add(`insert into sky_private.${table}(${columns.join(',')}) values ${slots}${conflict}`,values)
    }
  }
  const deleteOwners=(table:CatalogTable,column:string,ids:string[],kind?:string)=>{
    for(const group of batches(ids)) add(`delete from sky_private.${table} where ${column} in(${group.map((_,i)=>`$${i+1}`).join(',')})${kind?` and kind=$${group.length+1}`:''}`,[...group,...(kind?[kind]:[])])
  }
  const {rows,payload}=plan,graph=plan.candidate.identities
  const sources=[...new Set([plan.candidate.sourceId,...payload.provenance.map(p=>p.sourceId),...graph.crosswalks.map(c=>c.sourceId)])]
  if(sources.some(id=>!SOURCE_IDS.some(s=>s===id))) return fail()
  insert('source_registry',catalogColumns.source_registry,sources.map(id=>({id})),['id'],true)
  insert('provenance',catalogColumns.provenance,rows.provenance,['id'])
  const identities=graph.identities.map(n=>({kind:n.kind,id:n.id,revision:n.revision,schema_version:n.schemaVersion,updated_at:n.updatedAt,retired_at:n.retiredAt,fixture:n.fixture}))
  insert('domain_identity',catalogColumns.domain_identity,identities,['kind','id'])
  // RESTRICT FK is immediate: remove record bindings before canonical bindings.
  for(const [kind,records] of [['item',payload.items],['spirit',payload.spirits],['season',payload.seasons]] as const)
    deleteOwners('payload_provenance','id',records.map(r=>r.id),kind)
  for(const group of batches(graph.identities)) {
    add(`delete from sky_private.identity_provenance where (kind,id) in(${group.map((_,i)=>`($${2*i+1},$${2*i+2})`).join(',')})`,group.flatMap(n=>[n.kind,n.id]))
  }
  insert('identity_provenance',catalogColumns.identity_provenance,graph.identities.flatMap(n=>n.provenanceIds.map((provenance_id,position)=>({kind:n.kind,id:n.id,provenance_id,position}))))
  const rootTables=['item','spirit','season','item_k15','provenance_order'] as const
  const oldCounts={item:current?.payload.items.length??0,spirit:current?.payload.spirits.length??0,season:current?.payload.seasons.length??0,item_k15:current?.payload.lookup.length??0,provenance_order:current?.payload.provenance.length??0}
  for(const table of rootTables) {
    // Immediate global UNIQUE(position) stays intact. Move old positions to a
    // disjoint positive band, then upsert/compact every retained root. Driver
    // must have checked actual canonical rows match the supplied complete frame.
    const size=oldCounts[table],offset=size+rows[table].length+1
    if(size+offset>2_147_483_647) return fail()
    if(size) add(`update sky_private.${table} set position=position+$1`,[offset])
    insert(table,catalogColumns[table],rows[table],[table==='provenance_order'?'provenance_id':'id'])
  }
  // Typed dependency order: acquisition children before options; field evidence
  // before markers. Stable roots/history are never deleted, even when unpublished.
  const itemTables=['acquisition_cost','acquisition_provenance','acquisition_source_offer','acquisition_option','item_translation','item_source_key','item_season','item_spirit','item_asset','item_rule'] as const
  const spiritTables=['spirit_translation','spirit_season','spirit_tree'] as const
  const seasonTables=['season_translation','season_item','season_spirit','season_realm','season_map','season_article'] as const
  for(const table of itemTables) deleteOwners(table,'item_id',payload.items.map(p=>p.id))
  for(const table of spiritTables) deleteOwners(table,'spirit_id',payload.spirits.map(p=>p.id))
  for(const table of seasonTables) deleteOwners(table,'season_id',payload.seasons.map(p=>p.id))
  for(const table of ['field_provenance','field_provenance_field'] as const)
    for(const [kind,records] of [['item',payload.items],['spirit',payload.spirits],['season',payload.seasons]] as const) deleteOwners(table,'id',records.map(p=>p.id),kind)
  const excluded=new Set<CatalogTable>(['source_registry','provenance','domain_identity','identity_provenance',...rootTables])
  for(const table of Object.keys(catalogColumns) as CatalogTable[]) if(!excluded.has(table)) insert(table,catalogColumns[table],rows[table])
  insert('source_crosswalk',['source_id','kind','source_key','target_id'],graph.crosswalks.map(c=>({source_id:c.sourceId,kind:c.target.kind,source_key:c.sourceKey,target_id:c.target.id})),['source_id','kind','source_key'],true)
  const identityKeys=new Set(graph.identities.map(n=>JSON.stringify([n.kind,n.id])))
  insert('alias',['kind','from_id','target_identity_id','target_alias_id'],graph.aliases.map(a=>{
    const targetIsIdentity=identityKeys.has(JSON.stringify([a.to.kind,a.to.id]))
    return {kind:a.from.kind,from_id:a.from.id,target_identity_id:targetIsIdentity?a.to.id:null,target_alias_id:targetIsIdentity?null:a.to.id}
  }),['kind','from_id'],true)
  insert('tombstone',['kind','id','retired_at','replacement_id'],graph.tombstones.map(t=>({kind:t.target.kind,id:t.target.id,retired_at:t.retiredAt,replacement_id:t.replacement?.id??null})),['kind','id'],true)
  return {plan,statements,rowCount:count,byteCount:bytes}
}
