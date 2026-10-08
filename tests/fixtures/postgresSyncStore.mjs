import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { privateSyncColumns } from '../../src/server/postgresSyncRows.ts'
import { syncMetadataColumns } from '../../src/server/syncMetadataRows.ts'
import { encodeGraphHistoryRows,graphHistoryColumns } from '../../src/server/graphHistoryRows.ts'
import { encodeProjectionRows } from '../../src/server/projectionRows.ts'
import { encodeManifestOrderRows } from '../../src/server/manifestOrderRows.ts'
import { prepareCanonicalPayloadPlan } from '../../src/server/canonicalPayloadPlan.ts'
import { decodeSyncStateRows } from '../../src/server/syncStateRows.ts'
import { promoteReviewedSnapshot,recordSourceFailure } from '../../src/server/sourceSync.ts'
import { contract,empty } from './syncReadFrame.mjs'

export const storeOptions={readLimits:{maxRows:10_000,maxBytes:4_000_000},writeLimits:{maxRows:10_000,maxBytes:4_000_000},now:()=>Date.parse('2026-10-07T01:00:00Z')}
export function emptyTables() {return {...Object.fromEntries(Object.keys(privateSyncColumns).map(t=>[t,[]])),sync_generation:[{singleton:1,revision:0,current_acceptance_revision:null,last_promoted_at:null}]}}
export async function expectedPromotion(current,candidate,review,promoted='2026-10-07T00:03:00Z',selectedContract=contract) {
 let state=current
 const result=await promoteReviewedSnapshot({read:async()=>globalThis.structuredClone(state),compareAndSwap:async(_s,_e,next)=>{state=next;return true}},candidate,review,selectedContract,{validUntil:null,now:()=>Date.parse(promoted)})
 assert.ok(['promoted','unchanged'].includes(result));return state
}
export async function expectedFailure(current,source,at) {
 let state=current
 assert.equal(await recordSourceFailure({read:async()=>globalThis.structuredClone(state),compareAndSwap:async(_s,_e,next)=>{state=next;return true}},source,at,contract,()=>Date.parse(at)),'recorded');return state
}
const append=(tables,table,rows)=>tables[table].push(...globalThis.structuredClone(rows))
export async function tablesForState(state,sourceId,old=emptyTables(),currentCanonical=null,selectedContract=contract) {
 const tables=globalThis.structuredClone(old),c=state.lastKnownGood,a=state.approval,previous=tables.sync_generation[0],promoted=Boolean(c&&state.failures===0&&c.sourceId===sourceId&&c.baseRevision===state.revision-1)
 const acceptance=promoted?state.revision:previous.current_acceptance_revision
 tables.sync_generation=[{singleton:1,revision:state.revision,current_acceptance_revision:acceptance,last_promoted_at:state.lastPromotedAt}]
 const own=tables.sync_source_state.find(s=>s.source_id===sourceId)
 tables.sync_source_state=tables.sync_source_state.filter(s=>s.source_id!==sourceId)
 if(state.revision) append(tables,'sync_source_state',[{source_id:sourceId,last_success_revision:promoted?acceptance:own?.last_success_revision??null,
  health:state.freshness?state.failures?'offline':'healthy':null,last_attempt_at:state.lastAttemptAt,failures:state.failures,next_retry_at:state.nextRetryAt}])
 if(!tables.source_registry.some(s=>s.id===sourceId)) tables.source_registry.push({id:sourceId})
 if(promoted) {
  const plan=await prepareCanonicalPayloadPlan(c,selectedContract,currentCanonical)
  for(const [table,rows] of Object.entries(plan.rows)) tables[table]=globalThis.structuredClone(rows)
  for(const row of old.source_registry) if(!tables.source_registry.some(s=>s.id===row.id)) tables.source_registry.push(row)
  if(!tables.source_registry.some(s=>s.id===sourceId)) tables.source_registry.push({id:sourceId})
  for(const cw of c.identities.crosswalks) if(!tables.source_registry.some(s=>s.id===cw.sourceId)) tables.source_registry.push({id:cw.sourceId})
  const history=encodeGraphHistoryRows({identities:c.identities,provenanceIds:c.provenanceIds},acceptance)
  const pick=(r,t)=>Object.fromEntries(privateSyncColumns[t].map(c=>[c,r[c]]))
  tables.domain_identity=history.graph_identity.map(r=>pick(r,'domain_identity'))
  tables.identity_provenance=history.graph_identity_provenance.map(r=>pick(r,'identity_provenance'))
  tables.source_crosswalk=history.graph_crosswalk.map(r=>pick(r,'source_crosswalk'))
  tables.alias=history.graph_alias.map(r=>pick(r,'alias'))
  tables.tombstone=history.graph_tombstone.map(r=>pick(r,'tombstone'))
  const version=plan.release.public_release[0].catalog_version
  if(!tables.release_projection.some(r=>r.catalog_version===version)) {
   for(const [table,rows] of Object.entries(plan.release)) append(tables,table,rows)
   for(const [table,rows] of Object.entries(encodeProjectionRows(c.publicFiles,state.lastPromotedAt))) append(tables,table,rows)
  }
  append(tables,'sync_acceptance',[{revision:acceptance,source_id:sourceId,catalog_version:version,content_hash:c.contentHash,source_hash:c.sourceHash,candidate_hash:a.candidateHash,
   normalization_version:c.normalizationVersion,base_revision:c.baseRevision,fetched_at:c.fetchedAt,staged_at:c.stagedAt,reviewer_ref:a.reviewerRef,reviewed_at:a.reviewedAt,promoted_at:state.lastPromotedAt,valid_until:state.freshness.validUntil}])
  for(const [table,rows] of Object.entries(history)) append(tables,table,rows)
  append(tables,'acceptance_manifest_dataset',encodeManifestOrderRows(c.publicFiles.manifest,acceptance))
 }
 if(state.revision) append(tables,'sync_audit',[{revision:state.revision,source_id:sourceId,outcome:promoted?old.sync_acceptance.find(a=>a.revision===previous.current_acceptance_revision)?.content_hash===c.contentHash?'reconfirmed':'promoted':'failure',attempt_completed_at:state.lastAttemptAt,acceptance_revision:promoted?acceptance:null}])
 return tables
}

// Scripted driver proves portable transaction/query/transport contracts, NOT SQL
// execution/concurrent sessions. Production emitted DML is rehearsed separately
// on actual PostgreSQL. Table models are independently expected SourceSync output.
export function scriptedDatabase(initial=emptyTables(),settings={}) {
 let tables=globalThis.structuredClone(initial)
 const transactions=[]
 const db={settings,transactions,get tables(){return globalThis.structuredClone(tables)},
  async transaction(options,work) {
   const tx={options,queries:[],responses:[],writes:[],committed:false,rolledBack:false},before=globalThis.structuredClone(tables)
   let local=globalThis.structuredClone(tables);transactions.push(tx)
   try {
    const value=await work({query:async(statement,limits)=>{
     const s=globalThis.structuredClone(statement);tx.queries.push(s)
     if(settings.errorWhen?.(s,tx)) throw new Error('Injected provider error')
     let rows
     if(s.text.startsWith('select sky_private.apply_sync_metadata_cas')) {
      tx.writes.push(s)
      if(settings.casResult===false) rows=[{applied:false}]
      else {local=globalThis.structuredClone(settings.nextTables??local);rows=[{applied:true}]}
     }else if(s.text.startsWith('select ')) {
      const parsed=/^select (.+) from sky_private\.([a-z0-9_]+)(?: where (.+?))? limit \$\d+(?: for update)?$/.exec(s.text)
      assert.ok(parsed,s.text);const [,cols,table,where]=parsed
      let selected=local[table]
      if(where) {
       const eq=/^([a-z_]+)=\$1$/.exec(where),list=/^([a-z_]+) in\(.+\)$/.exec(where)
       assert.ok(eq||list,where)
       selected=selected.filter(r=>eq?r[eq[1]]===s.values[0]:s.values.slice(0,-1).includes(r[list[1]]))
      }
      rows=selected.slice(0,s.values.at(-1)).map(r=>Object.fromEntries(cols.split(',').map(c=>[c,r[c]])))
     }else {tx.writes.push(s);rows=[]}
     if(rows.length>limits.maxRows||Buffer.byteLength(JSON.stringify(rows))>limits.maxBytes) throw new Error('Transport bounds exceeded')
     tx.responses.push(globalThis.structuredClone(rows))
     return globalThis.structuredClone(rows)
    }})
    if(settings.commitError) throw new Error('Injected commit error')
    tables=local;tx.committed=true;return value
   }catch(error){tables=before;tx.rolledBack=true;throw error}
  }}
 return db
}
export async function decodeTables(tables,sourceId='K15') {
 const h=tables.sync_generation[0],own=tables.sync_source_state.filter(s=>s.source_id===sourceId),needed=new Set([h.current_acceptance_revision,own[0]?.last_success_revision].filter(x=>x!=null))
 const metadata=Object.fromEntries(Object.keys(syncMetadataColumns).map(t=>[t,t==='sync_generation'?tables[t]:t==='sync_source_state'?own:t==='sync_acceptance'?tables[t].filter(r=>needed.has(r.revision)):tables[t].filter(r=>r.revision===h.revision)]))
 if(h.current_acceptance_revision===null) return decodeSyncStateRows({metadata,graph:null,projection:null,manifestOrder:null},sourceId,contract)
 const accepted=tables.sync_acceptance.find(a=>a.revision===h.current_acceptance_revision),graph=Object.fromEntries(Object.keys(graphHistoryColumns).map(t=>[t,tables[t].filter(r=>r.acceptance_revision===h.current_acceptance_revision)]))
 const projection=Object.fromEntries(['release_projection','release_projection_file'].map(t=>[t,tables[t].filter(r=>r.catalog_version===accepted.catalog_version)]))
 return decodeSyncStateRows({metadata,graph,projection,manifestOrder:tables.acceptance_manifest_dataset.filter(r=>r.acceptance_revision===h.current_acceptance_revision)},sourceId,contract)
}
export {empty,contract}
