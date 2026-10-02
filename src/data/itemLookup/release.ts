import type { CatalogContext, Item, SeasonEvent, Spirit } from '../catalog/index.ts'
import { validateItems, validateSeasonEvents, validateSpirits } from '../catalog/index.ts'
import { enumeration, failure, nullable, object, success, validateDateTime, validateSourceRecords, validateString } from '../core/index.ts'
import type { SourceRecord, ValidationResult, Validator } from '../core/index.ts'
import { array, nonBlank, record } from '../catalog/shared.ts'
import { natural, validateLookupEntry, validateLookupMetadataList } from './model.ts'
import type { LookupEntry, LookupMetadata } from './model.ts'

export interface DatasetEntry { path: string; dataVersion: string; sha256: string }
export interface CatalogManifest {
  schemaVersion: number
  catalogVersion: string
  generatedAt: string
  datasets: Record<string, DatasetEntry>
  provenance: DatasetEntry
  aliases: DatasetEntry | null
  tombstones: DatasetEntry | null
  assetManifestVersion: string | null
}
const supportedVersion = (value: unknown) => value === 1 ? success(1) : failure('invalid_value', 'Unsupported catalogue schema version.')
const relativePath: Validator<string> = value => typeof value === 'string' && /^[a-z][a-z0-9-]*\.json$/.test(value) ? success(value) : failure('invalid_value', 'Expected a release-local JSON filename.')
const sha: Validator<string> = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? success(value) : failure('invalid_value', 'Expected SHA-256.')
const datasetEntry: Validator<DatasetEntry> = value => object(value, { path: relativePath, dataVersion: nonBlank, sha256: sha })
export function validateManifest(input: unknown): ValidationResult<CatalogManifest> {
  return object<CatalogManifest>(input, { schemaVersion: supportedVersion, catalogVersion: nonBlank, generatedAt: validateDateTime,
    datasets: record(datasetEntry), provenance: datasetEntry, aliases: nullable(datasetEntry), tombstones: nullable(datasetEntry), assetManifestVersion: nullable(validateString) })
}
export function hasDataset(manifest: CatalogManifest, id: string): boolean { return Object.hasOwn(manifest.datasets, id) }
export function validateEnvelope(input: unknown, version: string): ValidationResult<unknown[]> {
  const result = object<{ schemaVersion: number; dataVersion: string; generatedAt: string; sourceIds: string[]; records: unknown[]; fixture: boolean }>(input, {
    schemaVersion: supportedVersion, dataVersion: nonBlank, generatedAt: validateDateTime,
    sourceIds: array(enumeration(['K15'])), records: array(value => success(value)),
    fixture: value => value === false ? success(false) : failure('invalid_value', 'Public datasets must be non-fixture.'),
  })
  if (!result.valid) return result
  return result.value.dataVersion === version && result.value.sourceIds.length === 1 ? success(result.value.records) : failure('invalid_value', 'Dataset version/source does not match release.')
}
export interface ItemCatalog { entries: LookupEntry[]; spirits: Spirit[]; seasons: SeasonEvent[]; provenance: SourceRecord[]; manifest: CatalogManifest }
export function readCatalog(manifestInput: unknown, datasets: Record<string, unknown>): ValidationResult<ItemCatalog> {
  const manifestResult = validateManifest(manifestInput)
  if (!manifestResult.valid) return manifestResult
  const manifest = manifestResult.value
  const records: Record<string, unknown[]> = {}
  for (const id of ['items', 'lookup', 'spirits', 'seasons', 'provenance']) {
    const entry = id === 'provenance' ? manifest.provenance : manifest.datasets[id]
    if (!entry || !Object.hasOwn(datasets, id)) return failure('unknown_reference', 'Catalogue dataset unavailable.')
    if (entry.dataVersion !== manifest.catalogVersion) return failure('invalid_value', 'Mixed catalogue releases are not supported.')
    const result = validateEnvelope(datasets[id], entry.dataVersion)
    if (!result.valid) return result
    records[id] = result.value
  }
  const provenance = validateSourceRecords(records.provenance, new Set(['K15']))
  if (!provenance.valid) return provenance
  const ids = (values: unknown[]) => new Set(values.map(value => value !== null && typeof value === 'object' && 'id' in value && typeof value.id === 'string' ? value.id : ''))
  const context: CatalogContext = { provenanceIds: new Set(provenance.value.map(p => p.id)), itemIds: ids(records.items), spiritIds: ids(records.spirits), seasonIds: ids(records.seasons),
    treeIds: new Set(), nodeIds: new Set(), realmIds: new Set(), mapIds: new Set(), articleIds: new Set(), assetIds: new Set(), ruleIds: new Set(), iapProductIds: new Set(), visitIds: new Set() }
  const items: ValidationResult<Item[]> = validateItems(records.items, context)
  const spirits = validateSpirits(records.spirits, context)
  const seasons = validateSeasonEvents(records.seasons, context)
  const lookup = validateLookupMetadataList(records.lookup)
  if (!items.valid) return items
  if (!spirits.valid) return spirits
  if (!seasons.valid) return seasons
  if (!lookup.valid) return lookup
  if ([...items.value, ...spirits.value, ...seasons.value].some(entry => entry.fixture || entry.recordStatus !== 'published')) return failure('invalid_value', 'Unpublished/fixture domain records cannot enter the catalogue.')
  const byId = new Map<string, LookupMetadata>(lookup.value.map(entry => [entry.id, entry]))
  if (byId.size !== lookup.value.length || byId.size !== items.value.length || !items.value.length) return failure('invalid_relationship', 'Catalogue metadata must match every item exactly once; empty imports are invalid.')
  const entries: LookupEntry[] = []
  for (const item of items.value) {
    const result = validateLookupEntry(item, byId.get(item.id), context)
    if (!result.valid) return result
    entries.push(result.value)
  }
  entries.sort((a, b) => a.item.name.default.localeCompare(b.item.name.default, 'en') || a.upstreamId - b.upstreamId)
  return success({ entries, spirits: spirits.value, seasons: seasons.value, provenance: provenance.value, manifest })
}

export interface ImportSummary { accepted: number; excluded: number; unknownCategory: number; unknownCost: number }
export const validateImportSummary: Validator<ImportSummary> = value => object(value, { accepted: natural, excluded: natural, unknownCategory: natural, unknownCost: natural })
