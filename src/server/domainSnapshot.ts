import { createHash } from 'node:crypto'
import { validateDateTime } from '../data/core/index.ts'
import { readCatalog, validateManifest } from '../data/itemLookup/release.ts'
import type { DomainRepository, Freshness, PublicSnapshot } from '../data/domain/repository.ts'

export interface SnapshotFiles { manifest: unknown; files: ReadonlyMap<string, string> }

// This adapter never reads arbitrary paths. Caller supplies exact manifest bytes
// from an approved loader; DB adapters must pass the same publication boundary.
export function createSnapshotRepository(input: SnapshotFiles, freshness: Freshness): DomainRepository {
  const manifest = validateManifest(input.manifest)
  if (!manifest.valid) throw new Error('Invalid public snapshot manifest')
  if (manifest.value.aliases !== null || manifest.value.tombstones !== null) throw new Error('Migration-bearing snapshots require the reviewed canonical adapter')
  const datasets: Record<string, unknown> = {}
  for (const [name, entry] of Object.entries({ ...manifest.value.datasets, provenance: manifest.value.provenance })) {
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
  if (!['healthy', 'delayed', 'stale', 'offline'].includes(freshness.health) || !validateDateTime(freshness.lastSuccessAt).valid ||
    freshness.validUntil !== null && (!validateDateTime(freshness.validUntil).valid || Date.parse(freshness.validUntil) < Date.parse(freshness.lastSuccessAt))) throw new Error('Invalid source freshness')
  const snapshot: PublicSnapshot = { catalog: catalog.value, freshness: { health: freshness.health, lastSuccessAt: freshness.lastSuccessAt, validUntil: freshness.validUntil } }
  // A consumer cannot mutate the adapter's last known validated release.
  return { readCatalog: async () => structuredClone(snapshot) }
}
