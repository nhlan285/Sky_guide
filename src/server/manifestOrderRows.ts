import { validateManifest } from '../data/itemLookup/release.ts'
import type { CatalogManifest } from '../data/itemLookup/release.ts'
import type { CatalogRow } from './catalogRows.ts'

export const manifestOrderColumns = ['acceptance_revision','dataset','position'] as const
const datasets = ['items','lookup','spirits','seasons'] as const
const invalid = (): never => {throw new Error('Invalid acceptance manifest dataset order')}
const revisionValid = (n: number) => Number.isSafeInteger(n)&&n>0
function manifest(input: unknown): CatalogManifest {
  const result=validateManifest(input)
  if(!result.valid||Object.keys(result.value.datasets).length!==4||Object.keys(result.value.datasets).some(k=>!datasets.some(d=>d===k))) return invalid()
  return result.value
}

// Public canonical JSON sorts keys; the reviewed SourceSync hash retains this
// typed Record's original key order. Archive it by acceptance, never guess it.
export function encodeManifestOrderRows(input: unknown,acceptanceRevision: number): CatalogRow[] {
  if(!revisionValid(acceptanceRevision)) return invalid()
  return Object.keys(manifest(input).datasets).map((dataset,position)=>({acceptance_revision:acceptanceRevision,dataset,position}))
}
export function decodeManifestOrderRows(rows: CatalogRow[],input: unknown,acceptanceRevision: number): CatalogManifest {
  if(!revisionValid(acceptanceRevision)||!Array.isArray(rows)||rows.length!==4) return invalid()
  const value=manifest(input),ordered=[...rows]
  for(const row of ordered) if(!row||typeof row!=='object'||Array.isArray(row)||Object.keys(row).length!==3||manifestOrderColumns.some(c=>!Object.hasOwn(row,c))
    ||row.acceptance_revision!==acceptanceRevision||!datasets.some(d=>d===row.dataset)||typeof row.position!=='number'||!Number.isSafeInteger(row.position)) return invalid()
  ordered.sort((a,b)=>(a.position as number)-(b.position as number))
  if(ordered.some((r,i)=>r.position!==i)||new Set(ordered.map(r=>r.dataset)).size!==4) return invalid()
  return {...value,datasets:Object.fromEntries(ordered.map(r=>[r.dataset,value.datasets[r.dataset as string]]))}
}
