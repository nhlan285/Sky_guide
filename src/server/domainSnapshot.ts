import { createHash } from 'node:crypto'
import { validateDateTime } from '../data/core/index.ts'
import { readCatalog, validateManifest } from '../data/itemLookup/release.ts'
import type { DomainRepository, Freshness, PublicSnapshot } from '../data/domain/repository.ts'
import type { ItemCatalog } from '../data/itemLookup/release.ts'
import { validateLookupMetadata } from '../data/itemLookup/model.ts'

export interface SnapshotFiles { manifest: unknown; files: ReadonlyMap<string, string> }
const datasetNames = ['items', 'lookup', 'spirits', 'seasons'] as const

// Only validated public structures reach this serializer. Arrays retain source
// order; object insertion order cannot change the public digest.
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_key, entry) => entry !== null && typeof entry === 'object' && !Array.isArray(entry)
    ? Object.fromEntries(Object.keys(entry).sort().map(key => [key, entry[key]])) : entry)
}

function readSnapshot(input: SnapshotFiles): { catalog: ItemCatalog; datasets: Record<string, unknown> } {
  const manifest = validateManifest(input.manifest)
  if (!manifest.valid) throw new Error('Invalid public snapshot manifest')
  if (manifest.value.aliases !== null || manifest.value.tombstones !== null) throw new Error('Migration-bearing snapshots require the reviewed canonical adapter')
  const keys = Object.keys(manifest.value.datasets)
  if (keys.length !== datasetNames.length || keys.some(key => !datasetNames.some(name => name === key))) throw new Error('Unapproved public snapshot dataset')
  const entries = Object.entries({ ...manifest.value.datasets, provenance: manifest.value.provenance })
  const paths = new Set(entries.map(([, entry]) => entry.path))
  if (paths.size !== entries.length || input.files.size !== paths.size || [...input.files.keys()].some(path => !paths.has(path))) throw new Error('Unexpected public snapshot files')
  const datasets: Record<string, unknown> = {}
  for (const [name, entry] of entries) {
    const text = input.files.get(entry.path)
    if (text === undefined || createHash('sha256').update(text).digest('hex') !== entry.sha256) throw new Error('Public snapshot checksum mismatch')
    datasets[name] = JSON.parse(text)
  }
  const catalog = readCatalog(manifest.value, datasets)
  if (!catalog.valid) throw new Error('Invalid public snapshot data')
  for (const source of catalog.value.provenance) {
    if (!source.sourceUrl || !['verified', 'stale'].includes(source.verificationStatus)) throw new Error('Unverified public provenance')
    const url = new URL(source.sourceUrl)
    if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Unsafe public provenance URL')
  }
  return { catalog: catalog.value, datasets }
}

// Promoted bytes are rebuilt from validator output, never caller JSON. Envelope
// metadata is explicitly projected after readCatalog validates it. Keep all
// legitimate K15 payload fields and ordering; regenerate hashes from these bytes.
export function canonicalizeSnapshotFiles(input: SnapshotFiles): SnapshotFiles {
  const { catalog, datasets } = readSnapshot(input)
  const manifest = structuredClone(catalog.manifest)
  const values = {
    items: catalog.entries.map(entry => entry.item),
    lookup: catalog.entries.map(entry => {
      const metadata = validateLookupMetadata(entry)
      if (!metadata.valid) throw new Error('Invalid public lookup metadata')
      return metadata.value
    }),
    spirits: catalog.spirits, seasons: catalog.seasons, provenance: catalog.provenance,
  }
  const files = new Map<string, string>()
  for (const name of [...datasetNames, 'provenance'] as const) {
    const entry = name === 'provenance' ? manifest.provenance : manifest.datasets[name]
    const envelope = datasets[name] as { generatedAt: string; records: { id: string }[] }
    const byId = new Map(values[name].map(record => [record.id, record]))
    const text = canonicalJson({ schemaVersion: 1, dataVersion: entry.dataVersion,
      generatedAt: envelope.generatedAt, sourceIds: ['K15'], fixture: false,
      records: envelope.records.map(record => byId.get(record.id)) })
    files.set(entry.path, text)
    entry.sha256 = createHash('sha256').update(text).digest('hex')
  }
  return { manifest, files }
}

// This adapter never reads arbitrary paths. Caller supplies exact manifest bytes
// from an approved loader; DB adapters must pass the same publication boundary.
export function createSnapshotRepository(input: SnapshotFiles, freshness: Freshness): DomainRepository {
  const { catalog } = readSnapshot(input)
  if (!['healthy', 'delayed', 'stale', 'offline'].includes(freshness.health) || !validateDateTime(freshness.lastSuccessAt).valid ||
    freshness.validUntil !== null && (!validateDateTime(freshness.validUntil).valid || Date.parse(freshness.validUntil) < Date.parse(freshness.lastSuccessAt))) throw new Error('Invalid source freshness')
  const snapshot: PublicSnapshot = { catalog, freshness: { health: freshness.health, lastSuccessAt: freshness.lastSuccessAt, validUntil: freshness.validUntil } }
  // A consumer cannot mutate the adapter's last known validated release.
  return { readCatalog: async () => structuredClone(snapshot) }
}
