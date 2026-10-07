import { createHash } from 'node:crypto'
import { validateDateTime, validateId, compareInstants, addInstantMilliseconds } from '../data/core/index.ts'
import { validateIdentityGraph } from '../data/domain/identity.ts'
import type { IdentityGraph } from '../data/domain/identity.ts'
import type { Freshness } from '../data/domain/repository.ts'
import { validateAcquisitionOptionKeys } from '../data/domain/migration.ts'
import { canonicalizeSnapshotFiles, canonicalJson, createSnapshotRepository } from './domainSnapshot.ts'
import type { SnapshotFiles } from './domainSnapshot.ts'

export interface NormalizedCandidate {
  identities: IdentityGraph
  publicFiles: SnapshotFiles
  provenanceIds: string[]
}
export interface SyncCandidate extends NormalizedCandidate {
  sourceId: string; sourceHash: string; normalizationVersion: string
  baseRevision: number; contentHash: string
  fetchedAt: string; stagedAt: string
}
export interface SyncState {
  revision: number
  lastKnownGood: SyncCandidate | null
  lastPromotedAt: string | null
  freshness: Freshness | null
  lastAttemptAt: string | null
  failures: number
  nextRetryAt: string | null
  approval: ReviewApproval | null
}
export interface SyncStore {
  // Revision, LKG, lastPromotedAt and approval are GLOBAL. Health/attempt/retry refer
  // to sourceId. A per-source CAS alone is unsafe for shared canonical data.
  read(sourceId: string): Promise<SyncState>
  // MUST atomically persist canonical data, projection pointer, source state and
  // audit identity. False means concurrency conflict; never partly publish.
  compareAndSwap(sourceId: string, expectedRevision: number, next: SyncState): Promise<boolean>
}
export interface SyncContract {
  sourceIds: ReadonlySet<string>
  maxSnapshotBytes: number
  maxNormalizedBytes: number
  maxRecords: number
  maxRelations: number
  // Explicit verified policy; [] disables automatic retries. No guessed delays.
  retryDelaysMs: readonly number[]
}
export interface ReviewApproval { contentHash: string; candidateHash: string; baseRevision: number; reviewerRef: string; reviewedAt: string }
export interface PromotionOptions { validUntil: string | null; now?: () => number }
const digest = (text: string) => createHash('sha256').update(text).digest('hex')
function serverInstant(now: () => number): string {
  const epoch = now()
  if (!Number.isSafeInteger(epoch)) throw new Error('Invalid server clock')
  const instant = new Date(epoch).toISOString()
  if (!validateDateTime(instant).valid) throw new Error('Invalid server clock')
  return instant
}
export function candidateReviewHash(candidate: SyncCandidate): string {
  return digest(JSON.stringify([candidate.contentHash, candidate.baseRevision, candidate.fetchedAt, candidate.stagedAt]))
}
function contentHash(candidate: Omit<SyncCandidate, 'contentHash'>): string {
  // Exact normalization output is reviewed. Ordering changes require new review.
  return digest(JSON.stringify({ sourceId: candidate.sourceId, sourceHash: candidate.sourceHash,
    normalizationVersion: candidate.normalizationVersion, identities: candidate.identities,
    provenanceIds: candidate.provenanceIds, manifest: candidate.publicFiles.manifest,
    files: [...candidate.publicFiles.files].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0) }))
}
function validateContract(contract: SyncContract) {
  if ([contract.maxSnapshotBytes, contract.maxNormalizedBytes, contract.maxRecords, contract.maxRelations].some(limit => !Number.isSafeInteger(limit) || limit <= 0) || contract.retryDelaysMs.some(delay => !Number.isSafeInteger(delay) || delay <= 0)) throw new Error('Invalid sync contract')
}
export { validateContract as validateSyncContract }
function enforceNormalizedLimits(candidate: NormalizedCandidate, contract: SyncContract) {
  // Bound all returned metadata/graph/serialized files before parsing records.
  // This guards output acceptance, not CPU/memory allocation inside a normalizer.
  const graph = candidate.identities
  if (graph.relations.length > contract.maxRelations) throw new Error('Normalized relationship limit exceeded')
  let count = graph.identities.length + graph.crosswalks.length + graph.aliases.length + graph.tombstones.length + candidate.provenanceIds.length
  if (count > contract.maxRecords) throw new Error('Normalized record limit exceeded')
  let publicBytes = 0
  for (const text of candidate.publicFiles.files.values()) {
    publicBytes += Buffer.byteLength(text, 'utf8')
    if (publicBytes > contract.maxNormalizedBytes) throw new Error('Normalized public byte limit exceeded')
    const envelope = JSON.parse(text)
    if (!Array.isArray(envelope.records)) throw new Error('Invalid public record envelope')
    count += envelope.records.length
    if (count > contract.maxRecords) throw new Error('Normalized record limit exceeded')
  }
  const text = JSON.stringify(candidate, (_key, value) => value instanceof Map ? [...value] : value)
  if (Buffer.byteLength(text, 'utf8') > contract.maxNormalizedBytes) throw new Error('Normalized snapshot byte limit exceeded')
}
async function validateProjection(candidate: NormalizedCandidate, contract: SyncContract, previous?: IdentityGraph) {
  enforceNormalizedLimits(candidate, contract)
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
  const canonical = { identities: identities.value, publicFiles, provenanceIds: [...candidate.provenanceIds] }
  enforceNormalizedLimits(canonical, contract)
  return canonical
}

export async function stageSourceSnapshot(options: {
  sourceId: string; raw: string; normalizationVersion: string; base: SyncState; contract: SyncContract
  normalize: (raw: string) => Promise<NormalizedCandidate>
  fetchedAt: string; now?: () => number
}): Promise<{ status: 'staged'; candidate: SyncCandidate } | { status: 'quarantined'; code: 'invalid_candidate' }> {
  try {
    const { sourceId, raw, normalizationVersion, base, contract, normalize, fetchedAt, now = Date.now } = options
    validateContract(contract)
    if (!contract.sourceIds.has(sourceId) || !validateId(sourceId).valid || !normalizationVersion.trim() || !raw.trim() || Buffer.byteLength(raw, 'utf8') > contract.maxSnapshotBytes || !Number.isSafeInteger(base.revision) || base.revision < 0) throw new Error('Invalid source snapshot')
    const normalized = await normalize(raw)
    const canonical = await validateProjection(normalized, contract, base.lastKnownGood?.identities)
    const stagedAt = serverInstant(now)
    if (!validateDateTime(fetchedAt).valid || compareInstants(fetchedAt, stagedAt) > 0 || base.lastAttemptAt && compareInstants(fetchedAt, base.lastAttemptAt) < 0 || base.lastPromotedAt && compareInstants(stagedAt, base.lastPromotedAt) < 0) throw new Error('Invalid source lifecycle')
    const value = { ...canonical, sourceId, sourceHash: digest(raw), normalizationVersion, baseRevision: base.revision, fetchedAt, stagedAt }
    const candidate = { ...value, contentHash: contentHash(value) }
    enforceNormalizedLimits(candidate, contract)
    return { status: 'staged', candidate }
  } catch {
    // Quarantine report excludes raw upstream/private exception content.
    return { status: 'quarantined', code: 'invalid_candidate' }
  }
}

// Restore an accepted historical candidate through the SAME canonical projection,
// identity and budget boundary as staging. A SQL review tuple or graph checksum
// alone cannot prove the public files/graph still match the reviewed content.
// No current clock/previous graph is imposed: this is a pinned historical read.
export async function validateStoredSyncCandidate(input: SyncCandidate,contract: SyncContract): Promise<SyncCandidate> {
  validateContract(contract)
  const candidate=structuredClone(input)
  if(!contract.sourceIds.has(candidate.sourceId)||!validateId(candidate.sourceId).valid||!/^[a-f0-9]{64}$/.test(candidate.sourceHash)
    ||!candidate.normalizationVersion.trim()||!Number.isSafeInteger(candidate.baseRevision)||candidate.baseRevision<0
    ||![candidate.fetchedAt,candidate.stagedAt].every(t=>validateDateTime(t).valid)||compareInstants(candidate.fetchedAt,candidate.stagedAt)>0
    ||contentHash(candidate)!==candidate.contentHash) throw new Error('Invalid stored sync candidate')
  const canonical=await validateProjection(candidate,contract)
  const result={...canonical,sourceId:candidate.sourceId,sourceHash:candidate.sourceHash,normalizationVersion:candidate.normalizationVersion,
    baseRevision:candidate.baseRevision,contentHash:candidate.contentHash,fetchedAt:candidate.fetchedAt,stagedAt:candidate.stagedAt}
  if(contentHash(result)!==candidate.contentHash) throw new Error('Invalid stored sync candidate')
  enforceNormalizedLimits(result,contract)
  return result
}

export async function promoteReviewedSnapshot(store: SyncStore, candidate: SyncCandidate, approval: ReviewApproval, contract: SyncContract, options: PromotionOptions): Promise<'promoted' | 'unchanged' | 'conflict' | 'rejected'> {
  try {
    candidate = structuredClone(candidate)
    approval = { contentHash: approval.contentHash, candidateHash: approval.candidateHash, baseRevision: approval.baseRevision, reviewerRef: approval.reviewerRef, reviewedAt: approval.reviewedAt }
    validateContract(contract)
    if (!contract.sourceIds.has(candidate.sourceId) || contentHash(candidate) !== candidate.contentHash) return 'rejected'
    const current = await store.read(candidate.sourceId)
    const canonical = await validateProjection(candidate, contract, current.lastKnownGood?.identities)
    candidate = { ...canonical, sourceId: candidate.sourceId, sourceHash: candidate.sourceHash,
      normalizationVersion: candidate.normalizationVersion, baseRevision: candidate.baseRevision, contentHash: candidate.contentHash,
      fetchedAt: candidate.fetchedAt, stagedAt: candidate.stagedAt }
    if (contentHash(candidate) !== candidate.contentHash) return 'rejected'
    const promotedAt = serverInstant(options.now ?? Date.now)
    if (![candidate.fetchedAt, candidate.stagedAt, approval.reviewedAt].every(time => validateDateTime(time).valid) ||
      compareInstants(candidate.fetchedAt, candidate.stagedAt) > 0 || compareInstants(candidate.stagedAt, approval.reviewedAt) > 0 || compareInstants(approval.reviewedAt, promotedAt) > 0) return 'rejected'
    if (approval.contentHash !== candidate.contentHash || approval.candidateHash !== candidateReviewHash(candidate) || approval.baseRevision !== candidate.baseRevision || !approval.reviewerRef.trim()) return 'rejected'
    if (current.revision !== candidate.baseRevision) {
      // Retry an already accepted transaction without changing health/audit. A
      // fresh stage/review is required to recover a failed newer source attempt.
      return current.lastKnownGood && candidateReviewHash(current.lastKnownGood) === candidateReviewHash(candidate) && canonicalJson(current.approval) === canonicalJson(approval) ? 'unchanged' : 'conflict'
    }
    if (current.lastAttemptAt && compareInstants(candidate.fetchedAt, current.lastAttemptAt) < 0 || current.lastPromotedAt && compareInstants(promotedAt, current.lastPromotedAt) < 0 || current.freshness && compareInstants(promotedAt, current.freshness.lastSuccessAt) < 0 || current.revision >= Number.MAX_SAFE_INTEGER) return 'rejected'
    const freshness: Freshness = { health: 'healthy', lastSuccessAt: promotedAt, validUntil: options.validUntil }
    createSnapshotRepository(candidate.publicFiles, freshness)
    const unchanged = current.lastKnownGood?.contentHash === candidate.contentHash
    const next: SyncState = { revision: current.revision + 1, lastKnownGood: structuredClone(candidate), freshness: structuredClone(freshness),
      lastPromotedAt: promotedAt, lastAttemptAt: candidate.fetchedAt, failures: 0, nextRetryAt: null, approval: structuredClone(approval) }
    return await store.compareAndSwap(candidate.sourceId, current.revision, next) ? unchanged ? 'unchanged' : 'promoted' : 'conflict'
  } catch { return 'rejected' }
}

export async function recordSourceFailure(store: SyncStore, sourceId: string, completedAt: string, contract: SyncContract, now: () => number = Date.now): Promise<'recorded' | 'conflict' | 'rejected'> {
  try {
    validateContract(contract)
    if (!contract.sourceIds.has(sourceId) || !validateDateTime(completedAt).valid || compareInstants(completedAt, serverInstant(now)) > 0) return 'rejected'
    const current = await store.read(sourceId)
    if (current.lastAttemptAt && compareInstants(completedAt, current.lastAttemptAt) <= 0 || current.freshness && compareInstants(completedAt, current.freshness.lastSuccessAt) < 0 || current.revision >= Number.MAX_SAFE_INTEGER) return 'rejected'
    const delay = contract.retryDelaysMs[current.failures]
    const next: SyncState = { ...current, revision: current.revision + 1, failures: current.failures + 1,
      lastAttemptAt: completedAt, nextRetryAt: delay === undefined ? null : addInstantMilliseconds(completedAt, delay),
      freshness: current.freshness ? { ...current.freshness, health: 'offline' } : null }
    return await store.compareAndSwap(sourceId, current.revision, next) ? 'recorded' : 'conflict'
  } catch { return 'rejected' }
}
