import { createHash } from 'node:crypto'
import { validateDateTime, validateId } from '../data/core/index.ts'
import { validateIdentityGraph } from '../data/domain/identity.ts'
import type { IdentityGraph } from '../data/domain/identity.ts'
import type { Freshness } from '../data/domain/repository.ts'
import { validateAcquisitionOptionKeys } from '../data/domain/migration.ts'
import { canonicalizeSnapshotFiles, createSnapshotRepository } from './domainSnapshot.ts'
import type { SnapshotFiles } from './domainSnapshot.ts'

export interface NormalizedCandidate {
  identities: IdentityGraph
  publicFiles: SnapshotFiles
  provenanceIds: string[]
}
export interface SyncCandidate extends NormalizedCandidate {
  sourceId: string; sourceHash: string; normalizationVersion: string
  baseRevision: number; contentHash: string
}
export interface SyncState {
  revision: number
  lastKnownGood: SyncCandidate | null
  freshness: Freshness | null
  lastAttemptAt: string | null
  failures: number
  nextRetryAt: string | null
  approval: ReviewApproval | null
}
export interface SyncStore {
  // Revision and LKG are GLOBAL across sources. Health/attempt/retry fields refer
  // to sourceId. A per-source CAS alone is unsafe for shared canonical data.
  read(sourceId: string): Promise<SyncState>
  // MUST atomically persist canonical data, projection pointer, source state and
  // audit identity. False means concurrency conflict; never partly publish.
  compareAndSwap(sourceId: string, expectedRevision: number, next: SyncState): Promise<boolean>
}
export interface SyncContract {
  sourceIds: ReadonlySet<string>
  maxSnapshotBytes: number
  // Explicit verified policy; [] disables automatic retries. No guessed delays.
  retryDelaysMs: readonly number[]
}
export interface ReviewApproval { contentHash: string; baseRevision: number; reviewerRef: string; reviewedAt: string }
const digest = (text: string) => createHash('sha256').update(text).digest('hex')
function contentHash(candidate: Omit<SyncCandidate, 'contentHash'>): string {
  // Exact normalization output is reviewed. Ordering changes require new review.
  return digest(JSON.stringify({ sourceId: candidate.sourceId, sourceHash: candidate.sourceHash,
    normalizationVersion: candidate.normalizationVersion, identities: candidate.identities,
    provenanceIds: candidate.provenanceIds, manifest: candidate.publicFiles.manifest,
    files: [...candidate.publicFiles.files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0) }))
}
function validateContract(contract: SyncContract) {
  if (!Number.isSafeInteger(contract.maxSnapshotBytes) || contract.maxSnapshotBytes <= 0 || contract.retryDelaysMs.some(delay => !Number.isSafeInteger(delay) || delay <= 0)) throw new Error('Invalid sync contract')
}
async function validateProjection(candidate: NormalizedCandidate, contract: SyncContract, previous?: IdentityGraph) {
  const identities = validateIdentityGraph(candidate.identities, new Set(candidate.provenanceIds), contract.sourceIds, previous)
  if (!identities.valid) throw new Error('Invalid canonical identity candidate')
  const publicFiles = canonicalizeSnapshotFiles(candidate.publicFiles)
  const repository = createSnapshotRepository(publicFiles, { health: 'stale', lastSuccessAt: '1970-01-01T00:00:00Z', validUntil: null })
  const snapshot = (await repository.readCatalog())!
  if (!validateAcquisitionOptionKeys(snapshot.catalog.entries.map(entry => entry.item)).valid) throw new Error('Invalid acquisition identity')
  for (const [kind, records] of [['item', snapshot.catalog.entries.map(entry => entry.item)], ['spirit', snapshot.catalog.spirits], ['season', snapshot.catalog.seasons]] as const) {
    for (const record of records) {
      const identity = identities.value.identities.find(node => node.kind === kind && node.id === record.id)
      if (!identity || identity.fixture || identity.retiredAt !== null || record.provenanceIds.some(id => !identity.provenanceIds.includes(id))) throw new Error('Public projection must resolve active canonical identities')
    }
  }
  const sameJoin = (type: 'itemSeason' | 'itemSpirit' | 'spiritSeason', id: string, expected: string[]) => {
    const actual = identities.value.relations.filter(edge => edge.type === type && edge.fromId === id).map(edge => edge.toId).sort()
    if (JSON.stringify(actual) !== JSON.stringify([...expected].sort())) throw new Error('Projection relationships differ from canonical candidate')
  }
  for (const entry of snapshot.catalog.entries) {
    sameJoin('itemSeason', entry.id, entry.item.seasonIds)
    sameJoin('itemSpirit', entry.id, entry.item.spiritIds)
  }
  for (const spirit of snapshot.catalog.spirits) sameJoin('spiritSeason', spirit.id, spirit.seasonIds)
  return { identities: identities.value, publicFiles, provenanceIds: [...candidate.provenanceIds] }
}

export async function stageSourceSnapshot(options: {
  sourceId: string; raw: string; normalizationVersion: string; base: SyncState; contract: SyncContract
  normalize: (raw: string) => Promise<NormalizedCandidate>
}): Promise<{ status: 'staged'; candidate: SyncCandidate } | { status: 'quarantined'; code: 'invalid_candidate' }> {
  try {
    const { sourceId, raw, normalizationVersion, base, contract, normalize } = options
    validateContract(contract)
    if (!contract.sourceIds.has(sourceId) || !validateId(sourceId).valid || !normalizationVersion.trim() || !raw.trim() || Buffer.byteLength(raw, 'utf8') > contract.maxSnapshotBytes || !Number.isSafeInteger(base.revision) || base.revision < 0) throw new Error('Invalid source snapshot')
    const normalized = await normalize(raw)
    const canonical = await validateProjection(normalized, contract, base.lastKnownGood?.identities)
    const value = { ...canonical, sourceId, sourceHash: digest(raw), normalizationVersion, baseRevision: base.revision }
    return { status: 'staged', candidate: { ...value, contentHash: contentHash(value) } }
  } catch {
    // Quarantine report excludes raw upstream/private exception content.
    return { status: 'quarantined', code: 'invalid_candidate' }
  }
}

export async function promoteReviewedSnapshot(store: SyncStore, candidate: SyncCandidate, approval: ReviewApproval, contract: SyncContract, freshness: Freshness): Promise<'promoted' | 'unchanged' | 'conflict' | 'rejected'> {
  try {
    candidate = structuredClone(candidate)
    approval = structuredClone(approval)
    freshness = structuredClone(freshness)
    validateContract(contract)
    if (!contract.sourceIds.has(candidate.sourceId) || contentHash(candidate) !== candidate.contentHash) return 'rejected'
    const current = await store.read(candidate.sourceId)
    const canonical = await validateProjection(candidate, contract, current.lastKnownGood?.identities)
    candidate = { ...canonical, sourceId: candidate.sourceId, sourceHash: candidate.sourceHash,
      normalizationVersion: candidate.normalizationVersion, baseRevision: candidate.baseRevision, contentHash: candidate.contentHash }
    if (contentHash(candidate) !== candidate.contentHash) return 'rejected'
    createSnapshotRepository(candidate.publicFiles, freshness)
    if (current.lastAttemptAt && Date.parse(freshness.lastSuccessAt) < Date.parse(current.lastAttemptAt)) return 'rejected'
    if (current.lastKnownGood?.contentHash === candidate.contentHash) {
      if (JSON.stringify(current.freshness) === JSON.stringify(freshness) && current.failures === 0) return 'unchanged'
      const recovered = { ...current, revision: current.revision + 1, freshness: structuredClone(freshness), lastAttemptAt: freshness.lastSuccessAt, failures: 0, nextRetryAt: null }
      return await store.compareAndSwap(candidate.sourceId, current.revision, recovered) ? 'unchanged' : 'conflict'
    }
    if (current.revision !== candidate.baseRevision) return 'conflict'
    if (approval.contentHash !== candidate.contentHash || approval.baseRevision !== current.revision || !approval.reviewerRef.trim() || !validateDateTime(approval.reviewedAt).valid) return 'rejected'
    if (Date.parse(approval.reviewedAt) > Date.parse(freshness.lastSuccessAt)) return 'rejected'
    if (current.lastAttemptAt && Date.parse(freshness.lastSuccessAt) < Date.parse(current.lastAttemptAt)) return 'rejected'
    const next: SyncState = { revision: current.revision + 1, lastKnownGood: structuredClone(candidate), freshness: structuredClone(freshness),
      lastAttemptAt: freshness.lastSuccessAt, failures: 0, nextRetryAt: null, approval: structuredClone(approval) }
    return await store.compareAndSwap(candidate.sourceId, current.revision, next) ? 'promoted' : 'conflict'
  } catch { return 'rejected' }
}

export async function recordSourceFailure(store: SyncStore, sourceId: string, attemptedAt: string, contract: SyncContract): Promise<'recorded' | 'conflict' | 'rejected'> {
  try {
    validateContract(contract)
    if (!contract.sourceIds.has(sourceId) || !validateDateTime(attemptedAt).valid) return 'rejected'
    const current = await store.read(sourceId)
    if (current.lastAttemptAt && Date.parse(attemptedAt) < Date.parse(current.lastAttemptAt)) return 'rejected'
    const delay = contract.retryDelaysMs[current.failures]
    const next: SyncState = { ...current, revision: current.revision + 1, failures: current.failures + 1,
      lastAttemptAt: attemptedAt, nextRetryAt: delay === undefined ? null : new Date(Date.parse(attemptedAt) + delay).toISOString(),
      freshness: current.freshness ? { ...current.freshness, health: 'offline' } : null }
    return await store.compareAndSwap(sourceId, current.revision, next) ? 'recorded' : 'conflict'
  } catch { return 'rejected' }
}
