import { createHash } from 'node:crypto'
import type { CatalogManifest, DatasetEntry } from '../data/itemLookup/release.ts'
import { validateManifest } from '../data/itemLookup/release.ts'
import { decodeCatalogRows } from './catalogRows.ts'
import type { CatalogRow, CatalogRows, SqlScalar } from './catalogRows.ts'
import { canonicalJson, canonicalizeSnapshotFiles } from './domainSnapshot.ts'
import type { SnapshotFiles } from './domainSnapshot.ts'

export const releaseNames = ['items','lookup','spirits','seasons','provenance'] as const
type DatasetName = typeof releaseNames[number]
const memberColumns = ['catalog_version','id','position','owner_revision'] as const
export const releaseColumns = {
  public_release: ['catalog_version','schema_version','generated_at','asset_manifest_version','source_present','import_report_present',
    'aliases_path','aliases_data_version','aliases_sha256','tombstones_path','tombstones_data_version','tombstones_sha256'],
  release_dataset: ['catalog_version','name','path','data_version','sha256','schema_version','generated_at','fixture'],
  release_source: ['catalog_version','dataset','source_id','position'],
  release_source_snapshot: ['catalog_version','repository','revision','normalization_version','transport','status'],
  release_source_path: ['catalog_version','position','path','git_blob_sha'],
  release_import_summary: ['catalog_version','accepted','excluded','unknown_category','unknown_cost','rejected_empty'],
  release_item: memberColumns, release_lookup: memberColumns, release_spirit: memberColumns, release_season: memberColumns,
  release_provenance: ['catalog_version','id','position'],
} as const
export type ReleaseTable = keyof typeof releaseColumns
export type ReleaseRows = Record<ReleaseTable,CatalogRow[]>
const tables = Object.keys(releaseColumns) as ReleaseTable[]
const membership = {items:'release_item',lookup:'release_lookup',spirits:'release_spirit',seasons:'release_season',provenance:'release_provenance'} as const
const kinds = {items:'item',lookup:'item',spirits:'spirit',seasons:'season'} as const
const invalid = (): never => {throw new Error('Invalid typed release rows')}
const string = (value: SqlScalar): string => typeof value==='string'?value:invalid()
const natural = (value: SqlScalar): number => typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?value:invalid()
const boolean = (value: SqlScalar): boolean => typeof value==='boolean'?value:invalid()
const nullable = (value: SqlScalar): string|null => value===null?null:string(value)
const one = (rows: CatalogRow[]): CatalogRow => rows.length===1?rows[0]:invalid()
const ordered = (rows: CatalogRow[]): CatalogRow[] => {
  const sorted=[...rows].sort((a,b) => natural(a.position)-natural(b.position))
  if(sorted.some((r,i) => r.position!==i)) return invalid()
  return sorted
}
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const identityKey = (kind: string,id: string) => JSON.stringify([kind,id])

// Immutable public projection history and transaction promotion are separate
// owners. These rows preserve metadata/order and refuse drift in supplied payloads.
export function encodeReleaseRows(input: SnapshotFiles,catalog: CatalogRows): ReleaseRows {
  const snapshot=canonicalizeSnapshotFiles(input)
  const manifest=validateManifest(snapshot.manifest)
  if(!manifest.valid) return invalid()
  const value=manifest.value,version=value.catalogVersion
  const revisions=new Map(catalog.domain_identity.map(r => [identityKey(string(r.kind),string(r.id)),r.revision]))
  const rows=Object.fromEntries(tables.map(table => [table,[]])) as unknown as ReleaseRows
  const add=(table: ReleaseTable,row: CatalogRow) => rows[table].push(row)
  add('public_release',{catalog_version:version,schema_version:value.schemaVersion,generated_at:value.generatedAt,
    asset_manifest_version:value.assetManifestVersion,source_present:value.source!==undefined,import_report_present:value.importReport!==undefined,
    aliases_path:null,aliases_data_version:null,aliases_sha256:null,tombstones_path:null,tombstones_data_version:null,tombstones_sha256:null})
  for(const name of releaseNames) {
    const entry=name==='provenance'?value.provenance:value.datasets[name]
    const envelope=JSON.parse(snapshot.files.get(entry.path)!) as {generatedAt:string;sourceIds:string[];records:{id:string}[]}
    add('release_dataset',{catalog_version:version,name,path:entry.path,data_version:entry.dataVersion,sha256:entry.sha256,schema_version:1,generated_at:envelope.generatedAt,fixture:false})
    envelope.sourceIds.forEach((source_id,position) => add('release_source',{catalog_version:version,dataset:name,source_id,position}))
    envelope.records.forEach((record,position) => {
      const revision=name==='provenance'?undefined:revisions.get(identityKey(kinds[name],record.id))
      if(name!=='provenance' && revision===undefined) return invalid()
      add(membership[name],{catalog_version:version,id:record.id,position,...(name==='provenance'?{}:{owner_revision:revision!})})
    })
  }
  if(value.source) {
    const source=value.source
    add('release_source_snapshot',{catalog_version:version,repository:source.repository,revision:source.revision,normalization_version:source.normalizationVersion,transport:source.transport,status:source.status})
    source.sourcePaths.forEach((path,position) => add('release_source_path',{catalog_version:version,position,path:path.path,git_blob_sha:path.gitBlobSha}))
  }
  if(value.importReport) add('release_import_summary',{catalog_version:version,accepted:value.importReport.accepted,excluded:value.importReport.excluded,
    unknown_category:value.importReport.unknownCategory,unknown_cost:value.importReport.unknownCost,rejected_empty:true})
  // A caller cannot bind valid metadata to different or stale typed payload rows.
  const decoded=decodeReleaseRows(rows,catalog)
  if(canonicalJson(decoded.manifest)!==canonicalJson(snapshot.manifest)||[...snapshot.files].some(([path,text]) => decoded.files.get(path)!==text)) return invalid()
  return rows
}

export function decodeReleaseRows(rows: ReleaseRows,catalogRows: CatalogRows): SnapshotFiles {
  if(!rows||typeof rows!=='object'||Object.keys(rows).length!==tables.length) return invalid()
  for(const table of tables) {
    if(!Object.hasOwn(rows,table)||!Array.isArray(rows[table])) return invalid()
    for(const row of rows[table]) {
      if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==releaseColumns[table].length
        ||releaseColumns[table].some(column => !Object.hasOwn(row,column))
        ||Object.values(row).some(value => value!==null&&!['string','number','boolean'].includes(typeof value))) return invalid()
    }
  }
  const root=one(rows.public_release),version=string(root.catalog_version)
  for(const table of tables) if(rows[table].some(r => r.catalog_version!==version)) return invalid()
  if(['aliases_path','aliases_data_version','aliases_sha256','tombstones_path','tombstones_data_version','tombstones_sha256'].some(c => root[c]!==null))
    throw new Error('Migration-bearing snapshots require the reviewed canonical adapter')
  const datasetRows=new Map(rows.release_dataset.map(r => [string(r.name),r]))
  if(datasetRows.size!==5||rows.release_dataset.length!==5||releaseNames.some(name => !datasetRows.has(name))) return invalid()
  const entries=Object.fromEntries(releaseNames.map(name => {
    const r=datasetRows.get(name)!
    if(r.data_version!==version||r.schema_version!==1||r.fixture!==false) return invalid()
    return [name,{path:string(r.path),dataVersion:version,sha256:string(r.sha256)}]
  })) as Record<DatasetName,DatasetEntry>
  const manifest: CatalogManifest={schemaVersion:natural(root.schema_version),catalogVersion:version,generatedAt:string(root.generated_at),
    datasets:Object.fromEntries(releaseNames.filter(name => name!=='provenance').map(name => [name,entries[name]])),provenance:entries.provenance,
    aliases:null,tombstones:null,assetManifestVersion:nullable(root.asset_manifest_version)}
  if(boolean(root.source_present)) {
    const source=one(rows.release_source_snapshot)
    if(source.transport!=='public-repository'||source.status!=='pinned-snapshot') return invalid()
    manifest.source={repository:string(source.repository),revision:string(source.revision),normalizationVersion:string(source.normalization_version),
      transport:'public-repository',status:'pinned-snapshot',sourcePaths:ordered(rows.release_source_path).map(r => ({path:string(r.path),gitBlobSha:string(r.git_blob_sha)}))}
  } else if(rows.release_source_snapshot.length||rows.release_source_path.length) return invalid()
  if(boolean(root.import_report_present)) {
    const report=one(rows.release_import_summary)
    if(report.rejected_empty!==true) return invalid()
    manifest.importReport={accepted:natural(report.accepted),excluded:natural(report.excluded),unknownCategory:natural(report.unknown_category),unknownCost:natural(report.unknown_cost),rejected:[]}
  } else if(rows.release_import_summary.length) return invalid()
  const validManifest=validateManifest(manifest)
  if(!validManifest.valid) return invalid()
  const payloads=decodeCatalogRows(catalogRows)
  const identities=new Map(catalogRows.domain_identity.map(r => [identityKey(string(r.kind),string(r.id)),r]))
  const files=new Map<string,string>()
  if(rows.release_source.some(r => !releaseNames.some(name => name===r.dataset))) return invalid()
  for(const name of releaseNames) {
    const metadata=datasetRows.get(name)!,members=ordered(rows[membership[name]])
    const ids=new Set(members.map(r => string(r.id))),payload=payloads[name],byId=new Map(payload.map(r => [r.id,r]))
    // Supplied projection owns exactly this release; full-history filtering belongs
    // to the next adapter. Never hide extra records or take a latest-row fallback.
    if(ids.size!==members.length||ids.size!==byId.size||members.some(r => !byId.has(string(r.id)))) return invalid()
    if(name!=='provenance') for(const member of members) {
      const identity=identities.get(identityKey(kinds[name],string(member.id)))
      if(!identity||natural(member.owner_revision)<1||identity.revision!==member.owner_revision||identity.retired_at!==null||identity.fixture!==false) return invalid()
    }
    const sources=ordered(rows.release_source.filter(r => r.dataset===name))
    if(sources.length!==1||sources[0].source_id!=='K15') return invalid()
    const text=canonicalJson({schemaVersion:1,dataVersion:version,generatedAt:string(metadata.generated_at),sourceIds:sources.map(r => string(r.source_id)),fixture:false,
      records:members.map(r => byId.get(string(r.id)))})
    if(hash(text)!==metadata.sha256||files.has(entries[name].path)) throw new Error('Typed public release checksum mismatch')
    files.set(entries[name].path,text)
  }
  const snapshot=canonicalizeSnapshotFiles({manifest:validManifest.value,files})
  if([...files].some(([path,text]) => snapshot.files.get(path)!==text)) return invalid()
  return snapshot
}
