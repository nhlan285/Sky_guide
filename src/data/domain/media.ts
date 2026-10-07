import { enumeration, failure, nullable, object, success, validateDateTime, validateId, compareInstants } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import { array, boolean, nonBlank } from '../catalog/shared.ts'
import type { EntityRef } from './identity.ts'

export const mediaRoles = ['itemImage', 'referenceImage', 'poster', 'emoteVideo', 'callVideo', 'callAudio', 'musicSample'] as const
export type MediaRole = typeof mediaRoles[number]
export const mediaOwnerKinds = ['item', 'emote', 'call', 'sampleSet'] as const
export const roleOwners: Record<MediaRole, readonly typeof mediaOwnerKinds[number][]> = {
  itemImage: ['item'], referenceImage: ['item'], poster: ['item', 'emote', 'call'],
  emoteVideo: ['emote'], callVideo: ['call'], callAudio: ['call'], musicSample: ['sampleSet'],
}
export interface MediaBinding {
  ownerKind: typeof mediaOwnerKinds[number]; ownerId: string; mediaId: string
  role: MediaRole; provenanceIds: string[]
}
export interface MediaRecord {
  id: string; revision: number; storageKey: string; sha256: string; bytes: number
  mimeType: 'image/webp' | 'video/mp4' | 'video/webm' | 'audio/ogg' | 'audio/mpeg' | 'audio/wav'
  sourceUrl: string; sourceType: 'official' | 'community' | 'selfCreated'
  sourceRole: string; sourceRevision: string; fetchedAt: string; updatedAt: string
  provenanceIds: string[]; credit: string
  rightsStatus: 'verified' | 'unknown' | 'restricted' | 'revoked'
  approvedRevision: number | null; publicEvidenceUrl: string | null; fixture: boolean
}
const extensions = { 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mpeg': 'mp3', 'audio/wav': 'wav' } as const
const positive = (input: unknown) => typeof input === 'number' && Number.isSafeInteger(input) && input > 0 ? success(input) : failure('invalid_value', 'Expected a positive safe integer.')
const hash = (input: unknown) => typeof input === 'string' && /^[a-f0-9]{64}$/.test(input) ? success(input) : failure('invalid_value', 'Expected SHA-256.')
export function safeHttps(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return failure('invalid_type', 'Expected HTTPS URL.')
  try {
    const url = new URL(input)
    return url.protocol === 'https:' && !url.username && !url.password ? success(input) : failure('invalid_value', 'Unsafe URL.')
  } catch { return failure('invalid_value', 'Invalid URL.') }
}

export function validateMediaRecord(input: unknown, provenanceIds: ReadonlySet<string>): ValidationResult<MediaRecord> {
  const result = object<MediaRecord>(input, {
    id: validateId, revision: positive, storageKey: nonBlank, sha256: hash, bytes: positive,
    mimeType: enumeration(['image/webp', 'video/mp4', 'video/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav']),
    sourceUrl: safeHttps, sourceType: enumeration(['official', 'community', 'selfCreated']),
    sourceRole: nonBlank, sourceRevision: nonBlank, fetchedAt: validateDateTime, updatedAt: validateDateTime,
    provenanceIds: array(validateId),
    credit: nonBlank, rightsStatus: enumeration(['verified', 'unknown', 'restricted', 'revoked']),
    approvedRevision: nullable(positive), publicEvidenceUrl: nullable(safeHttps), fixture: boolean,
  })
  if (!result.valid) return result
  const media = result.value
  const newKey = `media/${media.sha256}.${extensions[media.mimeType]}`
  const legacy = media.mimeType === 'image/webp' && ['thumbnails', 'cards', 'detail'].some(variant => media.storageKey === `items/${variant}/${media.sha256}.webp`)
  if (media.storageKey !== newKey && !legacy) return failure('invalid_value', 'Storage key must identify exact immutable content.')
  if (!media.provenanceIds.length || new Set(media.provenanceIds).size !== media.provenanceIds.length || media.provenanceIds.some(id => !provenanceIds.has(id))) return failure('unknown_provenance', 'Media provenance must resolve.')
  if (compareInstants(media.fetchedAt, media.updatedAt) > 0) return failure('invalid_value', 'Media update precedes acquisition.')
  if (media.rightsStatus === 'verified' && (media.approvedRevision !== media.revision || !media.publicEvidenceUrl)) return failure('invalid_value', 'Verified rights require evidence and approval for this revision.')
  return result
}

// Caller supplies validated binary records and an active owner identity registry.
// Evidence proves the reviewed role mapping; it does not grant binary rights.
export function validateMediaBindings(input: unknown, media: readonly MediaRecord[], owners: readonly EntityRef[], provenanceIds: ReadonlySet<string>): ValidationResult<MediaBinding[]> {
  const parsed = array(value => object<MediaBinding>(value, {
    ownerKind: enumeration(mediaOwnerKinds), ownerId: validateId, mediaId: validateId,
    role: enumeration(mediaRoles), provenanceIds: array(validateId),
  }))(input)
  if (!parsed.valid) return parsed
  const records = new Map(media.map(record => [record.id, record]))
  if (records.size !== media.length) return failure('duplicate_id', 'Duplicate media identity.')
  const bindings = new Set<string>()
  const primaries = new Map<string, string>()
  const references = new Map<string, Set<string>>()
  for (const binding of parsed.value) {
    const record = records.get(binding.mediaId)
    if (!record || !owners.some(owner => owner.kind === binding.ownerKind && owner.id === binding.ownerId)) return failure('unknown_reference', 'Binding foreign keys must resolve.')
    if (!roleOwners[binding.role].includes(binding.ownerKind)) return failure('invalid_relationship', 'Invalid media role owner.')
    const mime = ['itemImage', 'referenceImage', 'poster'].includes(binding.role) ? 'image/' : ['emoteVideo', 'callVideo'].includes(binding.role) ? 'video/' : 'audio/'
    if (!record.mimeType.startsWith(mime)) return failure('invalid_relationship', 'Binding role and MIME disagree.')
    if (!binding.provenanceIds.length || new Set(binding.provenanceIds).size !== binding.provenanceIds.length || binding.provenanceIds.some(id => !provenanceIds.has(id))) return failure('unknown_provenance', 'Binding role requires evidence.')
    const key = JSON.stringify([binding.ownerKind, binding.ownerId, binding.mediaId, binding.role])
    if (bindings.has(key)) return failure('duplicate_id', 'Duplicate media binding.')
    bindings.add(key)
    if (binding.role === 'itemImage') {
      if (primaries.has(binding.ownerId)) return failure('invalid_relationship', 'Item can have at most one canonical image.')
      primaries.set(binding.ownerId, record.sha256)
    }
    if (binding.role === 'referenceImage') {
      const hashes = references.get(binding.ownerId) ?? new Set<string>()
      if (hashes.has(record.sha256)) return failure('duplicate_id', 'Duplicate item reference content.')
      hashes.add(record.sha256); references.set(binding.ownerId, hashes)
    }
  }
  for (const [itemId, hash] of primaries) if (references.get(itemId)?.has(hash)) return failure('invalid_relationship', 'Primary image cannot also be an item reference.')
  return parsed
}

export interface Revocations { ids: ReadonlySet<string>; hashes: ReadonlySet<string> }
export function publicMedia(media: MediaRecord, revoked: Revocations) {
  if (media.fixture || media.rightsStatus !== 'verified' || media.approvedRevision !== media.revision || !media.publicEvidenceUrl || revoked.ids.has(media.id) || revoked.hashes.has(media.sha256)) return null
  return { id: media.id, revision: media.revision, storageKey: media.storageKey, sha256: media.sha256,
    bytes: media.bytes, mimeType: media.mimeType, sourceUrl: media.sourceUrl,
    sourceType: media.sourceType, sourceRole: media.sourceRole, sourceRevision: media.sourceRevision,
    fetchedAt: media.fetchedAt, updatedAt: media.updatedAt, provenanceIds: [...media.provenanceIds],
    credit: media.credit,
    rightsStatus: 'verified' as const, publicEvidenceUrl: media.publicEvidenceUrl }
}

export function legacyItemDeliveryPath(media: MediaRecord): string | null {
  const match = /^items\/(thumbnails|cards|detail)\/([a-f0-9]{64}\.webp)$/.exec(media.storageKey)
  return media.mimeType === 'image/webp' && match && match[2] === `${media.sha256}.webp` ? `/assets/items/${match[1]}/${match[2]}` : null
}
