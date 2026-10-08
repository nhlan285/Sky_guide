import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { validateDateTime } from '../data/core/index.ts'
import { validateManifest } from '../data/itemLookup/release.ts'
import type { DomainRepository, Freshness } from '../data/domain/repository.ts'
import type { CatalogRow } from './catalogRows.ts'
import { canonicalJson, canonicalizeSnapshotFiles, createSnapshotRepository } from './domainSnapshot.ts'
import type { SnapshotFiles } from './domainSnapshot.ts'

export const projectionColumns = {
  release_projection: ['catalog_version','manifest_text','manifest_sha256','materialized_at'],
  release_projection_file: ['catalog_version','dataset','path','sha256','content'],
} as const
export type ProjectionRows = Record<keyof typeof projectionColumns,CatalogRow[]>
const hash = (text: string) => createHash('sha256').update(text).digest('hex')
const invalid = (): never => {throw new Error('Invalid immutable public projection')}
const string = (value: unknown): string => typeof value==='string'?value:invalid()

// Derived public bytes only; the typed canonical tables and reviewed ingestion
// transaction own truth/history. A cache row alone is not review/promotion.
export function encodeProjectionRows(input: SnapshotFiles,materializedAt: string): ProjectionRows {
  if(!validateDateTime(materializedAt).valid) return invalid()
  const snapshot=canonicalizeSnapshotFiles(input),manifest=validateManifest(snapshot.manifest)
  if(!manifest.valid) return invalid()
  const text=canonicalJson(manifest.value),version=manifest.value.catalogVersion
  const rows: ProjectionRows={release_projection:[{catalog_version:version,manifest_text:text,manifest_sha256:hash(text),materialized_at:materializedAt}],release_projection_file:[]}
  for(const [dataset,entry] of Object.entries({...manifest.value.datasets,provenance:manifest.value.provenance})) {
    rows.release_projection_file.push({catalog_version:version,dataset,path:entry.path,sha256:entry.sha256,content:snapshot.files.get(entry.path)!})
  }
  return rows
}

// Version must come from the trusted pointer/explicit history lookup, never from
// whatever rows the provider happened to return. No canonical table is consulted.
export function decodeProjectionRows(rows: ProjectionRows,version: string): SnapshotFiles {
  if(typeof version!=='string'||!version.trim()||!rows||typeof rows!=='object'||Object.keys(rows).length!==2) return invalid()
  for(const table of Object.keys(projectionColumns) as (keyof ProjectionRows)[]) {
    if(!Object.hasOwn(rows,table)||!Array.isArray(rows[table])) return invalid()
    for(const row of rows[table]) if(!row||typeof row!=='object'||Array.isArray(row)
      ||Object.keys(row).length!==projectionColumns[table].length||projectionColumns[table].some(c => !Object.hasOwn(row,c))
      ||row.catalog_version!==version||Object.values(row).some(value => typeof value!=='string')) return invalid()
  }
  if(rows.release_projection.length!==1||rows.release_projection_file.length!==5) return invalid()
  const header=rows.release_projection[0],manifestText=string(header.manifest_text)
  if(hash(manifestText)!==header.manifest_sha256||!validateDateTime(header.materialized_at).valid) return invalid()
  const manifest=validateManifest(JSON.parse(manifestText))
  if(!manifest.valid||manifest.value.catalogVersion!==version||canonicalJson(manifest.value)!==manifestText) return invalid()
  const entries=new Map(Object.entries({...manifest.value.datasets,provenance:manifest.value.provenance}))
  const seen=new Set<string>(),files=new Map<string,string>()
  for(const row of rows.release_projection_file) {
    const dataset=string(row.dataset),entry=entries.get(dataset),content=string(row.content)
    if(!entry||seen.has(dataset)||row.path!==entry.path||row.sha256!==entry.sha256||hash(content)!==row.sha256||files.has(entry.path)) return invalid()
    seen.add(dataset);files.set(entry.path,content)
  }
  const result=canonicalizeSnapshotFiles({manifest:manifest.value,files})
  if([...files].some(([path,text]) => result.files.get(path)!==text)||canonicalJson(result.manifest)!==manifestText) return invalid()
  return result
}

export function projectionByteLength(rows: ProjectionRows,version: string): number {
  decodeProjectionRows(rows,version)
  return Buffer.byteLength(string(rows.release_projection[0].manifest_text),'utf8')
    +rows.release_projection_file.reduce((total,row) => total+Buffer.byteLength(string(row.content),'utf8'),0)
}

// Detached, validated, explicitly pinned read model; future SQL driver fetches
// these two table owners once per version, not a relational rebuild per request.
export function createProjectionRepository(rows: ProjectionRows,version: string,freshness: Freshness): DomainRepository {
  return createSnapshotRepository(decodeProjectionRows(rows,version),freshness)
}
