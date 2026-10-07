import { createHash } from 'node:crypto'
import { SOURCE_IDS, validateId } from '../data/core/index.ts'
import { validateIdentityGraph } from '../data/domain/identity.ts'
import type { EntityKind, IdentityGraph, Relation } from '../data/domain/identity.ts'
import type { CatalogRow, SqlScalar } from './catalogRows.ts'

// Fixed, typed relation owners. Position belongs to the ENTIRE relation array,
// not a per-type array: review hashes include mixed relation ordering.
export const graphRelationTables = {
  itemSeason: 'graph_item_season', itemSpirit: 'graph_item_spirit', spiritSeason: 'graph_spirit_season',
  spiritLocation: 'graph_spirit_location', cosmeticItem: 'graph_cosmetic_item', eventLocation: 'graph_event_location',
  ruleEvent: 'graph_rule_event', overrideEvent: 'graph_override_event', overrideRule: 'graph_override_rule',
  occurrenceEvent: 'graph_occurrence_event', occurrenceRule: 'graph_occurrence_rule', occurrenceOverride: 'graph_occurrence_override',
  instrumentItem: 'graph_instrument_item', instrumentSamples: 'graph_instrument_samples', emoteItem: 'graph_emote_item', callItem: 'graph_call_item',
  itemMedia: 'graph_item_media', emoteMedia: 'graph_emote_media', callMedia: 'graph_call_media', sampleMedia: 'graph_sample_media',
} as const satisfies Record<Relation['type'],string>
const edgeColumns = ['acceptance_revision','from_id','to_id','position'] as const
export const graphHistoryColumns = {
  acceptance_graph: ['acceptance_revision','graph_sha256','identity_count','identity_provenance_count','candidate_provenance_count','crosswalk_count','alias_count','tombstone_count','relation_count'],
  graph_provenance: ['acceptance_revision','provenance_id','position'],
  graph_identity: ['acceptance_revision','kind','id','revision','schema_version','updated_at','retired_at','fixture','position'],
  graph_identity_provenance: ['acceptance_revision','kind','id','provenance_id','position'],
  graph_crosswalk: ['acceptance_revision','source_id','kind','source_key','target_id','position'],
  graph_alias: ['acceptance_revision','kind','from_id','target_identity_id','target_alias_id','position'],
  graph_tombstone: ['acceptance_revision','kind','id','retired_at','replacement_id','position'],
  graph_item_season: edgeColumns, graph_item_spirit: edgeColumns, graph_spirit_season: edgeColumns,
  graph_spirit_location: edgeColumns, graph_cosmetic_item: edgeColumns, graph_event_location: edgeColumns,
  graph_rule_event: edgeColumns, graph_override_event: edgeColumns, graph_override_rule: edgeColumns,
  graph_occurrence_event: edgeColumns, graph_occurrence_rule: edgeColumns, graph_occurrence_override: edgeColumns,
  graph_instrument_item: edgeColumns, graph_instrument_samples: edgeColumns, graph_emote_item: edgeColumns, graph_call_item: edgeColumns,
  graph_item_media: edgeColumns, graph_emote_media: edgeColumns, graph_call_media: edgeColumns, graph_sample_media: edgeColumns,
} as const
export type GraphHistoryRows = Record<keyof typeof graphHistoryColumns,CatalogRow[]>
export interface GraphHistory { identities: IdentityGraph; provenanceIds: string[] }
const tables = Object.keys(graphHistoryColumns) as (keyof GraphHistoryRows)[]
const relationTypes = Object.keys(graphRelationTables) as Relation['type'][]
const invalid = (): never => {throw new Error('Invalid canonical graph history rows')}
const str = (v: SqlScalar): string => typeof v==='string'?v:invalid()
const nat = (v: SqlScalar): number => typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:invalid()
const flag = (v: SqlScalar): boolean => typeof v==='boolean'?v:invalid()
const nullableString = (v: SqlScalar): string|null => v===null?null:str(v)
const key = (kind: string,id: string) => JSON.stringify([kind,id])
const hash = (frame: GraphHistory) => createHash('sha256').update(JSON.stringify(frame)).digest('hex')
function ordered(rows: CatalogRow[]): CatalogRow[] {
  const sorted=[...rows].sort((a,b) => nat(a.position)-nat(b.position))
  if(sorted.some((r,i) => nat(r.position)!==i)) return invalid()
  return sorted
}
function validated(input: IdentityGraph,provenanceIds: string[],previous?: IdentityGraph): GraphHistory {
  if(!Array.isArray(provenanceIds)||new Set(provenanceIds).size!==provenanceIds.length||provenanceIds.some(id=>!validateId(id).valid)) return invalid()
  const result=validateIdentityGraph(input,new Set(provenanceIds),new Set(SOURCE_IDS),previous)
  if(!result.valid) return invalid()
  return {identities:result.value,provenanceIds:[...provenanceIds]}
}

// The caller validates full candidate budgets/projection/review beforehand. This
// codec preserves graph metadata only, not future module payloads or media rights.
export function encodeGraphHistoryRows(input: GraphHistory,acceptanceRevision: number,previous?: IdentityGraph): GraphHistoryRows {
  if(nat(acceptanceRevision)<1) return invalid()
  const frame=validated(input.identities,input.provenanceIds,previous),graph=frame.identities
  const rows=Object.fromEntries(tables.map(t => [t,[] as CatalogRow[]])) as GraphHistoryRows
  frame.provenanceIds.forEach((provenance_id,position) => rows.graph_provenance.push({acceptance_revision:acceptanceRevision,provenance_id,position}))
  graph.identities.forEach((n,position) => {
    rows.graph_identity.push({acceptance_revision:acceptanceRevision,kind:n.kind,id:n.id,revision:n.revision,schema_version:n.schemaVersion,updated_at:n.updatedAt,retired_at:n.retiredAt,fixture:n.fixture,position})
    n.provenanceIds.forEach((provenance_id,position) => rows.graph_identity_provenance.push({acceptance_revision:acceptanceRevision,kind:n.kind,id:n.id,provenance_id,position}))
  })
  graph.crosswalks.forEach((c,position) => rows.graph_crosswalk.push({acceptance_revision:acceptanceRevision,source_id:c.sourceId,kind:c.target.kind,source_key:c.sourceKey,target_id:c.target.id,position}))
  const aliasKeys=new Set(graph.aliases.map(a=>key(a.from.kind,a.from.id)))
  graph.aliases.forEach((a,position) => {
    const chain=aliasKeys.has(key(a.to.kind,a.to.id))
    rows.graph_alias.push({acceptance_revision:acceptanceRevision,kind:a.from.kind,from_id:a.from.id,target_identity_id:chain?null:a.to.id,target_alias_id:chain?a.to.id:null,position})
  })
  graph.tombstones.forEach((t,position) => rows.graph_tombstone.push({acceptance_revision:acceptanceRevision,kind:t.target.kind,id:t.target.id,retired_at:t.retiredAt,replacement_id:t.replacement?.id??null,position}))
  graph.relations.forEach((e,position) => rows[graphRelationTables[e.type]].push({acceptance_revision:acceptanceRevision,from_id:e.fromId,to_id:e.toId,position}))
  rows.acceptance_graph.push({acceptance_revision:acceptanceRevision,graph_sha256:hash(frame),identity_count:graph.identities.length,identity_provenance_count:rows.graph_identity_provenance.length,
    candidate_provenance_count:frame.provenanceIds.length,crosswalk_count:graph.crosswalks.length,alias_count:graph.aliases.length,tombstone_count:graph.tombstones.length,relation_count:graph.relations.length})
  return rows
}

// SELECT only declared writable columns, pinned by trusted acceptance revision.
// Physical provider row order is irrelevant. Gaps, leftovers and changed digest
// reject the whole frame; no rebuilding from mutable canonical tables.
export function decodeGraphHistoryRows(rows: GraphHistoryRows,acceptanceRevision: number): GraphHistory {
  if(nat(acceptanceRevision)<1||!rows||typeof rows!=='object'||Object.keys(rows).length!==tables.length) return invalid()
  for(const table of tables) {
    if(!Object.hasOwn(rows,table)||!Array.isArray(rows[table])) return invalid()
    for(const row of rows[table]) if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==graphHistoryColumns[table].length
      ||graphHistoryColumns[table].some(c=>!Object.hasOwn(row,c))||row.acceptance_revision!==acceptanceRevision
      ||Object.values(row).some(v=>v!==null&&!['string','number','boolean'].includes(typeof v))) return invalid()
  }
  if(rows.acceptance_graph.length!==1) return invalid()
  const header=rows.acceptance_graph[0],proof=new Map<string,CatalogRow[]>()
  const identityKeys=new Set(rows.graph_identity.map(r=>key(str(r.kind),str(r.id))))
  for(const r of rows.graph_identity_provenance) {
    const k=key(str(r.kind),str(r.id))
    if(!identityKeys.has(k)) return invalid()
    const entries=proof.get(k)??[];entries.push(r);proof.set(k,entries)
  }
  const aliases=new Set(rows.graph_alias.map(r=>key(str(r.kind),str(r.from_id))))
  const graph: IdentityGraph={
    identities:ordered(rows.graph_identity).map(r => ({kind:str(r.kind) as EntityKind,id:str(r.id),revision:nat(r.revision),schemaVersion:nat(r.schema_version) as 1,
      updatedAt:str(r.updated_at),retiredAt:nullableString(r.retired_at),fixture:flag(r.fixture),provenanceIds:ordered(proof.get(key(str(r.kind),str(r.id)))??[]).map(p=>str(p.provenance_id))})),
    crosswalks:ordered(rows.graph_crosswalk).map(r=>({sourceId:str(r.source_id),sourceKey:str(r.source_key),target:{kind:str(r.kind) as EntityKind,id:str(r.target_id)}})),
    aliases:ordered(rows.graph_alias).map(r=>{
      const targetIdentity=nullableString(r.target_identity_id),targetAlias=nullableString(r.target_alias_id)
      if((targetIdentity===null)===(targetAlias===null)) return invalid()
      const id=targetAlias??targetIdentity!,chain=aliases.has(key(str(r.kind),id))
      if(chain!==(targetAlias!==null)) return invalid()
      return {from:{kind:str(r.kind) as EntityKind,id:str(r.from_id)},to:{kind:str(r.kind) as EntityKind,id}}
    }),
    tombstones:ordered(rows.graph_tombstone).map(r=>({target:{kind:str(r.kind) as EntityKind,id:str(r.id)},retiredAt:str(r.retired_at),replacement:r.replacement_id===null?null:{kind:str(r.kind) as EntityKind,id:str(r.replacement_id)}})),
    relations:ordered(relationTypes.flatMap(type=>rows[graphRelationTables[type]].map(r=>({...r,type})))).map(r=>({type:str(r.type) as Relation['type'],fromId:str(r.from_id),toId:str(r.to_id)})),
  }
  const frame=validated(graph,ordered(rows.graph_provenance).map(r=>str(r.provenance_id)))
  const counts={identity_count:graph.identities.length,identity_provenance_count:rows.graph_identity_provenance.length,candidate_provenance_count:frame.provenanceIds.length,
    crosswalk_count:graph.crosswalks.length,alias_count:graph.aliases.length,tombstone_count:graph.tombstones.length,relation_count:graph.relations.length}
  if(Object.entries(counts).some(([field,count])=>nat(header[field])!==count)||header.graph_sha256!==hash(frame)) return invalid()
  return frame
}
