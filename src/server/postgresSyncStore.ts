import { Buffer } from 'node:buffer'
import { SOURCE_IDS } from '../data/core/index.ts'
import type { CatalogRow, CatalogRowContext, SqlScalar } from './catalogRows.ts'
import { prepareCanonicalPayloadWrite } from './canonicalPayloadWrite.ts'
import type { CanonicalWriteLimits, SqlStatement } from './canonicalPayloadWrite.ts'
import { privateSyncReader,privateSyncColumns } from './postgresSyncRows.ts'
import type { SqlConnection,SqlDatabase,SqlReadLimits } from './postgresSyncRows.ts'
import { decodeSyncStateRows } from './syncStateRows.ts'
import { encodeProjectionRows,decodeProjectionRows } from './projectionRows.ts'
import { encodeGraphHistoryRows,graphHistoryColumns } from './graphHistoryRows.ts'
import { encodeManifestOrderRows } from './manifestOrderRows.ts'
import { canonicalJson } from './domainSnapshot.ts'
import type { SnapshotFiles } from './domainSnapshot.ts'
import { promoteReviewedSnapshot,recordSourceFailure,validateSyncContract } from './sourceSync.ts'
import type { SyncContract,SyncState,SyncStore } from './sourceSync.ts'

export interface PostgresSyncOptions {
  readLimits:SqlReadLimits;writeLimits:CanonicalWriteLimits
  deferred?:CatalogRowContext['deferred'];now?:()=>number
}
const reject=():never=>{throw new Error('Invalid atomic sync transition or SQL transaction result')}
const snapshotKey=(s:SnapshotFiles)=>JSON.stringify([canonicalJson(s.manifest),[...s.files].sort(([a],[b])=>a<b?-1:a>b?1:0)])
// Top-level order is not semantic; manifest Record order IS part of the reviewed
// hash. Map file order is not semantic, but every byte must survive comparison.
const stateKey=(s:SyncState)=>canonicalJson([s.revision,s.lastPromotedAt,s.freshness,s.lastAttemptAt,s.failures,s.nextRetryAt,s.approval,s.lastKnownGood?{
  identities:s.lastKnownGood.identities,provenanceIds:s.lastKnownGood.provenanceIds,sourceId:s.lastKnownGood.sourceId,sourceHash:s.lastKnownGood.sourceHash,
  normalizationVersion:s.lastKnownGood.normalizationVersion,baseRevision:s.lastKnownGood.baseRevision,contentHash:s.lastKnownGood.contentHash,
  fetchedAt:s.lastKnownGood.fetchedAt,stagedAt:s.lastKnownGood.stagedAt,publicFiles:{manifest:JSON.stringify(s.lastKnownGood.publicFiles.manifest),files:[...s.lastKnownGood.publicFiles.files].sort(([a],[b])=>a<b?-1:a>b?1:0)},
}:null])

async function transition(current:SyncState,next:SyncState,sourceId:string,contract:SyncContract,now:()=>number):Promise<'promoted'|'reconfirmed'|'failure'> {
  if(!next||typeof next!=='object'||Array.isArray(next)||Object.keys(next).length!==8
    ||!['revision','lastKnownGood','lastPromotedAt','freshness','lastAttemptAt','failures','nextRetryAt','approval'].every(k=>Object.hasOwn(next,k))
    ||next.revision!==current.revision+1||!Number.isSafeInteger(next.failures)||next.failures<0
    ||[next.lastPromotedAt,next.lastAttemptAt,next.nextRetryAt].some(v=>v!==null&&typeof v!=='string')
    ||[next.lastKnownGood,next.freshness,next.approval].some(v=>v!==null&&(!v||typeof v!=='object'||Array.isArray(v)))) return reject()
  const epoch=now();if(!Number.isSafeInteger(epoch)) return reject()
  let captured:SyncState|null=null
  const replay:SyncStore={read:async()=>structuredClone(current),compareAndSwap:async(source,expected,value)=>{
    if(source!==sourceId||expected!==current.revision) return false
    captured=structuredClone(value);return true
  }}
  if(next.lastKnownGood&&next.approval&&next.lastPromotedAt&&next.freshness&&next.lastKnownGood.sourceId===sourceId
    &&Date.parse(next.lastPromotedAt)<=epoch) {
    await promoteReviewedSnapshot(replay,next.lastKnownGood,next.approval,contract,{validUntil:next.freshness.validUntil,now:()=>Date.parse(next.lastPromotedAt!)})
    if(captured&&stateKey(captured)===stateKey(next)) return current.lastKnownGood?.contentHash===next.lastKnownGood.contentHash?'reconfirmed':'promoted'
  }
  captured=null
  if(next.lastAttemptAt!==null) await recordSourceFailure(replay,sourceId,next.lastAttemptAt,contract,()=>epoch)
  if(captured&&stateKey(captured)===stateKey(next)) return 'failure'
  return reject()
}

// Portable orchestrator. No SDK, connection credentials, runtime grants or public
// route mounts. Driver must honor transaction/transport contracts in SqlDatabase.
export function createPostgresSyncStore(database:SqlDatabase,inputContract:SyncContract,options:PostgresSyncOptions):SyncStore {
  const contract={...inputContract,sourceIds:new Set(inputContract.sourceIds),retryDelaysMs:[...inputContract.retryDelaysMs]}
  validateSyncContract(contract)
  const readLimits={...options.readLimits},writeLimits={...options.writeLimits},deferred=structuredClone(options.deferred??{}),now=options.now??Date.now
  if([...contract.sourceIds].some(id=>!SOURCE_IDS.some(s=>s===id))||!Number.isSafeInteger(writeLimits.maxRows)||writeLimits.maxRows<1
    ||!Number.isSafeInteger(writeLimits.maxBytes)||writeLimits.maxBytes<1) return reject()
  // Validate read limits without invoking driver; reader has the authoritative check.
  privateSyncReader({query:async()=>reject()},readLimits)
  const source=(id:string)=>{if(!contract.sourceIds.has(id)) return reject()}
  const store:SyncStore={
    read:async(sourceId)=>{
      source(sourceId)
      return database.transaction({isolation:'repeatable read',readOnly:true},async connection=>{
        const reader=privateSyncReader(connection,readLimits)
        return decodeSyncStateRows(await reader.frame(sourceId),sourceId,contract)
      })
    },
    compareAndSwap:async(sourceId,expectedRevision,inputNext)=>{
      source(sourceId)
      if(!Number.isSafeInteger(expectedRevision)||expectedRevision<0||expectedRevision>=Number.MAX_SAFE_INTEGER) return reject()
      const next=structuredClone(inputNext)
      return database.transaction({isolation:'read committed',readOnly:false},async connection=>{
        const reader=privateSyncReader(connection,readLimits),head=await reader.head(true)
        // Global lock is FIRST SQL operation. Stale returns before canonical reads,
        // review replay, staging or ANY write. Never return false after mutations.
        if(head[0].revision!==expectedRevision) return false
        const current=await decodeSyncStateRows(await reader.frame(sourceId,head),sourceId,contract)
        const outcome=await transition(current,next,sourceId,contract,now),statements:SqlStatement[]=[]
        let rowCount=0,byteCount=0
        const append=(s:SqlStatement)=>{
          byteCount+=Buffer.byteLength(s.text)+Buffer.byteLength(JSON.stringify(s.values))
          if(byteCount>writeLimits.maxBytes) return reject()
          statements.push(s)
        }
        const insert=(table:keyof typeof privateSyncColumns,rows:CatalogRow[])=>{
          rowCount+=rows.length;if(rowCount>writeLimits.maxRows) return reject()
          const cols:readonly string[]=privateSyncColumns[table]
          for(let start=0;start<rows.length;start+=100) {
            const batch=rows.slice(start,start+100),values=batch.flatMap(r=>cols.map(c=>r[c]))
            if(values.some(v=>v===undefined)) return reject()
            append({text:`insert into sky_private.${table}(${cols.join(',')}) values ${batch.map((_,i)=>`(${cols.map((_,j)=>`$${i*cols.length+j+1}`).join(',')})`).join(',')}`,values})
          }
        }
        let acceptance:number|null=null
        if(outcome!=='failure') {
          if(!next.lastKnownGood||!next.approval||!next.freshness||!next.lastPromotedAt) return reject()
          const canonical=await reader.canonical(current,contract,deferred),write=await prepareCanonicalPayloadWrite(next.lastKnownGood,contract,canonical,writeLimits,deferred)
          rowCount=write.rowCount;for(const s of write.statements) append(s)
          const c=write.plan.candidate,version=String(write.plan.release.public_release[0].catalog_version)
          const existing=await reader.projection(version)
          if(existing.release_projection.length||existing.release_projection_file.length) {
            if(snapshotKey(decodeProjectionRows(existing,version))!==snapshotKey(c.publicFiles)) return reject()
          }else {
            if((await reader.select('public_release','catalog_version=$1',[version])).length) return reject()
            for(const [table,rows] of Object.entries(write.plan.release)) insert(table as keyof typeof privateSyncColumns,rows)
            const projection=encodeProjectionRows(c.publicFiles,next.lastPromotedAt)
            insert('release_projection_file',projection.release_projection_file);insert('release_projection',projection.release_projection)
          }
          acceptance=next.revision
          insert('sync_acceptance',[{revision:acceptance,source_id:sourceId,catalog_version:version,content_hash:c.contentHash,source_hash:c.sourceHash,candidate_hash:next.approval.candidateHash,
            normalization_version:c.normalizationVersion,base_revision:c.baseRevision,fetched_at:c.fetchedAt,staged_at:c.stagedAt,reviewer_ref:next.approval.reviewerRef,reviewed_at:next.approval.reviewedAt,
            promoted_at:next.lastPromotedAt,valid_until:next.freshness.validUntil}])
          const history=encodeGraphHistoryRows({identities:c.identities,provenanceIds:c.provenanceIds},acceptance)
          for(const table of Object.keys(graphHistoryColumns) as (keyof typeof graphHistoryColumns)[]) if(table!=='acceptance_graph') insert(table,history[table])
          insert('acceptance_graph',history.acceptance_graph)
          insert('acceptance_manifest_dataset',encodeManifestOrderRows(c.publicFiles.manifest,acceptance))
        }else {
          // Failure may be the first attempt for a new source. Register only that
          // source; canonical/LKG/projection/approval have no mutation statements.
          append({text:'insert into sky_private.source_registry(id) values($1) on conflict(id) do nothing',values:[sourceId]})
          rowCount++;if(rowCount>writeLimits.maxRows) return reject()
        }
        append({text:'select sky_private.apply_sync_metadata_cas($1,$2,$3,$4,$5,$6) as applied',values:[sourceId,expectedRevision,outcome,acceptance,next.lastAttemptAt,next.nextRetryAt] as SqlScalar[]})
        await run(connection,{text:'set constraints all deferred',values:[]},readLimits)
        for(let i=0;i<statements.length;i++) {
          const result=await run(connection,statements[i],readLimits)
          if(i===statements.length-1) {
            if(result.length!==1||Object.keys(result[0]).length!==1||result[0].applied!==true) return reject()
          }else if(result.length) return reject()
        }
        await run(connection,{text:'set constraints all immediate',values:[]},readLimits)
        const restored=await decodeSyncStateRows(await reader.frame(sourceId),sourceId,contract)
        if(stateKey(restored)!==stateKey(next)) return reject()
        if(outcome!=='failure') await reader.canonical(restored,contract,deferred)
        return true
      })
    },
  }
  return store
}

async function run(connection:SqlConnection,statement:SqlStatement,limits:SqlReadLimits):Promise<CatalogRow[]> {
  const rows=await connection.query(statement,{maxRows:1,maxBytes:Math.min(limits.maxBytes,4096)})
  if(!Array.isArray(rows)||rows.length>1||Buffer.byteLength(JSON.stringify(rows))>Math.min(limits.maxBytes,4096)) return reject()
  return rows
}
