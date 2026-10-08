import { Buffer } from 'node:buffer'
import { catalogColumns,decodeCatalogRows } from './catalogRows.ts'
import type { CatalogRow, CatalogRowContext, CatalogRows, SqlScalar } from './catalogRows.ts'
import type { SqlStatement } from './canonicalPayloadWrite.ts'
import type { CurrentCanonicalPayload } from './canonicalPayloadPlan.ts'
import { prepareCanonicalPayloadPlan } from './canonicalPayloadPlan.ts'
import { canonicalJson } from './domainSnapshot.ts'
import { syncMetadataColumns,decodeSyncMetadataRows } from './syncMetadataRows.ts'
import type { SyncMetadataRows } from './syncMetadataRows.ts'
import { graphHistoryColumns } from './graphHistoryRows.ts'
import type { GraphHistoryRows } from './graphHistoryRows.ts'
import { projectionColumns } from './projectionRows.ts'
import type { ProjectionRows } from './projectionRows.ts'
import { manifestOrderColumns } from './manifestOrderRows.ts'
import { releaseColumns } from './releaseRows.ts'
import type { SyncReadFrame } from './syncStateRows.ts'
import type { SyncContract, SyncState } from './sourceSync.ts'

export interface SqlReadLimits { maxRows:number; maxBytes:number }
export interface SqlConnection {
  // Driver MUST enforce bounds DURING result transport/decoding, convert bigint
  // only when exactly JS-safe, and reject overflow/truncation. Never return partial
  // successful results. Decoder checks below cannot retroactively bound transport.
  query(statement:SqlStatement,limits:SqlReadLimits):Promise<CatalogRow[]>
}
export interface SqlDatabase {
  // Same connection/snapshot for callback. Commit only on success; attempt rollback
  // on callback/commit failure and always release or destroy connection. A lost
  // COMMIT acknowledgement has unknown outcome, not proven rollback (see phase
  // runtime contract); never retry callback implicitly or report partial success.
  transaction<T>(options:{isolation:'repeatable read'|'read committed';readOnly:boolean},work:(connection:SqlConnection)=>Promise<T>):Promise<T>
}
const reservationColumns={source_crosswalk:['source_id','kind','source_key','target_id'],alias:['kind','from_id','target_identity_id','target_alias_id'],tombstone:['kind','id','retired_at','replacement_id']} as const
export const privateSyncColumns={...catalogColumns,...syncMetadataColumns,...graphHistoryColumns,...projectionColumns,...releaseColumns,acceptance_manifest_dataset:manifestOrderColumns,...reservationColumns} as const
type Table=keyof typeof privateSyncColumns
const invalid=():never=>{throw new Error('Invalid or over-budget private SQL frame')}
const natural=(v:SqlScalar):number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=0?v:invalid()
const nullableNatural=(v:SqlScalar)=>v===null?null:natural(v)
const key=(kind:string,id:string)=>JSON.stringify([kind,id])
const sameRows=(a:CatalogRow[],b:CatalogRow[])=>canonicalJson(a.map(canonicalJson).sort())===canonicalJson(b.map(canonicalJson).sort())

export function privateSyncReader(connection:SqlConnection,limits:SqlReadLimits) {
  if(!Number.isSafeInteger(limits.maxRows)||limits.maxRows<1||limits.maxRows>=Number.MAX_SAFE_INTEGER
    ||!Number.isSafeInteger(limits.maxBytes)||limits.maxBytes<1) return invalid()
  let rowsRead=0,bytesRead=0
  const select=async(table:Table,where='',values:SqlScalar[]=[],lock=false):Promise<CatalogRow[]>=>{
    const columns:readonly string[]=privateSyncColumns[table],remaining=limits.maxRows-rowsRead
    const rows=await connection.query({text:`select ${columns.join(',')} from sky_private.${table}${where?' where '+where:''} limit $${values.length+1}${lock?' for update':''}`,values:[...values,remaining+1]},
      {maxRows:remaining+1,maxBytes:limits.maxBytes-bytesRead})
    if(!Array.isArray(rows)) return invalid()
    for(const row of rows) {
      if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==columns.length||columns.some(c=>!Object.hasOwn(row,c))
        ||Object.values(row).some(v=>v!==null&&typeof v!=='string'&&typeof v!=='boolean'&&!(typeof v==='number'&&Number.isFinite(v)))) return invalid()
      bytesRead+=Buffer.byteLength(JSON.stringify(row));rowsRead++
      if(rowsRead>limits.maxRows||bytesRead>limits.maxBytes) return invalid()
    }
    return structuredClone(rows)
  }
  const head=async(lock=false)=>{
    const rows=await select('sync_generation','singleton=$1',[1],lock)
    if(rows.length!==1||rows[0].singleton!==1) return invalid()
    natural(rows[0].revision);nullableNatural(rows[0].current_acceptance_revision)
    return rows
  }
  const projection=async(version:string):Promise<ProjectionRows>=>({release_projection:await select('release_projection','catalog_version=$1',[version]),release_projection_file:await select('release_projection_file','catalog_version=$1',[version])})
  const frame=async(sourceId:string,control?:CatalogRow[]):Promise<SyncReadFrame>=>{
    control=control??await head()
    const own=await select('sync_source_state','source_id=$1',[sourceId]),h=control[0]
    if(own.length>1) return invalid()
    const current=nullableNatural(h.current_acceptance_revision),success=own.length?nullableNatural(own[0].last_success_revision):null
    const revisions=[...new Set([current,success].filter((v):v is number=>v!==null))]
    const acceptance=revisions.length?await select('sync_acceptance',`revision in(${revisions.map((_,i)=>`$${i+1}`).join(',')})`,revisions):[]
    const metadata:SyncMetadataRows={sync_generation:control,sync_source_state:own,sync_acceptance:acceptance,sync_audit:await select('sync_audit','revision=$1',[natural(h.revision)])}
    const meta=decodeSyncMetadataRows(metadata,sourceId)
    if(!meta.acceptance) return {metadata,graph:null,projection:null,manifestOrder:null}
    const graph={} as GraphHistoryRows
    for(const table of Object.keys(graphHistoryColumns) as (keyof GraphHistoryRows)[]) graph[table]=await select(table,'acceptance_revision=$1',[meta.acceptance.revision])
    return {metadata,graph,projection:await projection(meta.acceptance.catalogVersion),manifestOrder:await select('acceptance_manifest_dataset','acceptance_revision=$1',[meta.acceptance.revision])}
  }
  const canonical=async(state:SyncState,contract:SyncContract,deferred:CatalogRowContext['deferred']={}):Promise<CurrentCanonicalPayload>=>{
    const rows={} as CatalogRows
    for(const table of Object.keys(catalogColumns) as (keyof CatalogRows)[]) rows[table]=await select(table)
    const graph=state.lastKnownGood?.identities??{identities:[],crosswalks:[],aliases:[],tombstones:[],relations:[]}
    const nodes=new Set(graph.identities.map(n=>key(n.kind,n.id)))
    const expected=graph.identities.map(n=>({kind:n.kind,id:n.id,revision:n.revision,schema_version:n.schemaVersion,updated_at:n.updatedAt,retired_at:n.retiredAt,fixture:n.fixture}))
    const proofs=graph.identities.flatMap(n=>n.provenanceIds.map((provenance_id,position)=>({kind:n.kind,id:n.id,provenance_id,position})))
    if(!sameRows(rows.domain_identity,expected)||!sameRows(rows.identity_provenance,proofs)) return invalid()
    const crosswalk=graph.crosswalks.map(c=>({source_id:c.sourceId,kind:c.target.kind,source_key:c.sourceKey,target_id:c.target.id}))
    const aliases=graph.aliases.map(a=>({kind:a.from.kind,from_id:a.from.id,target_identity_id:nodes.has(key(a.to.kind,a.to.id))?a.to.id:null,target_alias_id:nodes.has(key(a.to.kind,a.to.id))?null:a.to.id}))
    const tombstones=graph.tombstones.map(t=>({kind:t.target.kind,id:t.target.id,retired_at:t.retiredAt,replacement_id:t.replacement?.id??null}))
    for(const [table,expectedRows] of [['source_crosswalk',crosswalk],['alias',aliases],['tombstone',tombstones]] as const)
      if(!sameRows(await select(table),expectedRows)) return invalid()
    const owners=new Set([...rows.item.map(r=>key('item',String(r.id))),...rows.spirit.map(r=>key('spirit',String(r.id))),...rows.season.map(r=>key('season',String(r.id)))])
    rows.domain_identity=rows.domain_identity.filter(r=>owners.has(key(String(r.kind),String(r.id))))
    rows.identity_provenance=rows.identity_provenance.filter(r=>owners.has(key(String(r.kind),String(r.id))))
    const payload=decodeCatalogRows(rows,{identities:graph.identities,deferred}),result={payload,graph}
    if(!state.lastKnownGood) {
      if(payload.items.length||payload.lookup.length||payload.spirits.length||payload.seasons.length) return invalid()
    }else {
      // Replaying the archived reviewed payload over current rows must be a no-op.
      // This catches direct mutable fact/proof/order drift not protected by SQL
      // identity metadata constraints. Retained private fact history is a later gate.
      const checked=await prepareCanonicalPayloadPlan(state.lastKnownGood,contract,result,deferred)
      if(canonicalJson(checked.payload)!==canonicalJson(payload)) return invalid()
    }
    return result
  }
  return {select,head,frame,projection,canonical}
}
