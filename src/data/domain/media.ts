import { enumeration, failure, nullable, object, success, validateDateTime, validateId } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import { array, boolean, nonBlank } from '../catalog/shared.ts'
import type { EntityRef } from './identity.ts'
import { entityKinds } from './identity.ts'

export const mediaRoles = ['itemImage', 'referenceImage', 'poster', 'emoteVideo', 'callVideo', 'callAudio', 'musicSample'] as const
export interface MediaRecord {
  id: string; revision: number; storageKey: string; sha256: string; bytes: number
  mimeType: 'image/webp' | 'video/mp4' | 'video/webm' | 'audio/ogg' | 'audio/mpeg' | 'audio/wav'
  role: typeof mediaRoles[number]; sourceUrl: string; sourceType: 'official' | 'community' | 'selfCreated'
  sourceRole: string; sourceRevision: string; fetchedAt: string; updatedAt: string
  provenanceIds: string[]; relations: EntityRef[]; credit: string
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

export function validateMediaRecord(input: unknown, provenanceIds: ReadonlySet<string>, identities: readonly EntityRef[]): ValidationResult<MediaRecord> {
  const result = object<MediaRecord>(input, {
    id: validateId, revision: positive, storageKey: nonBlank, sha256: hash, bytes: positive,
    mimeType: enumeration(['image/webp', 'video/mp4', 'video/webm', 'audio/ogg', 'audio/mpeg', 'audio/wav']),
    role: enumeration(mediaRoles), sourceUrl: safeHttps, sourceType: enumeration(['official', 'community', 'selfCreated']),
    sourceRole: nonBlank, sourceRevision: nonBlank, fetchedAt: validateDateTime, updatedAt: validateDateTime,
    provenanceIds: array(validateId), relations: array(value => object<EntityRef>(value, { kind: enumeration(entityKinds), id: validateId })),
    credit: nonBlank, rightsStatus: enumeration(['verified', 'unknown', 'restricted', 'revoked']),
    approvedRevision: nullable(positive), publicEvidenceUrl: nullable(safeHttps), fixture: boolean,
  })
  if (!result.valid) return result
  const media = result.value
  const newKey = `media/${media.sha256}.${extensions[media.mimeType]}`
  const legacy = media.mimeType === 'image/webp' && ['thumbnails', 'cards', 'detail'].some(variant => media.storageKey === `items/${variant}/${media.sha256}.webp`)
  if (media.storageKey !== newKey && !legacy) return failure('invalid_value', 'Storage key must identify exact immutable content.')
  const expectedKind = ['itemImage', 'referenceImage', 'poster'].includes(media.role) ? 'image/' : ['emoteVideo', 'callVideo'].includes(media.role) ? 'video/' : 'audio/'
  if (!media.mimeType.startsWith(expectedKind)) return failure('invalid_value', 'Media role and MIME disagree.')
  if (!media.provenanceIds.length || new Set(media.provenanceIds).size !== media.provenanceIds.length || media.provenanceIds.some(id => !provenanceIds.has(id))) return failure('unknown_provenance', 'Media provenance must resolve.')
  if (!media.relations.length || new Set(media.relations.map(ref => JSON.stringify(ref))).size !== media.relations.length || media.relations.some(ref => !identities.some(node => node.kind === ref.kind && node.id === ref.id))) return failure('unknown_reference', 'Media relations must resolve uniquely.')
  const requiredKind = ['itemImage', 'referenceImage'].includes(media.role) ? 'item' : media.role === 'emoteVideo' ? 'emote' : ['callVideo', 'callAudio'].includes(media.role) ? 'call' : media.role === 'musicSample' ? 'sampleSet' : null
  if (requiredKind && !media.relations.some(ref => ref.kind === requiredKind)) return failure('invalid_relationship', 'Media must relate to its declared domain role.')
  if (Date.parse(media.fetchedAt) > Date.parse(media.updatedAt)) return failure('invalid_value', 'Media update precedes acquisition.')
  if (media.rightsStatus === 'verified' && (media.approvedRevision !== media.revision || !media.publicEvidenceUrl)) return failure('invalid_value', 'Verified rights require evidence and approval for this revision.')
  return result
}

export interface Revocations { ids: ReadonlySet<string>; hashes: ReadonlySet<string> }
export function publicMedia(media: MediaRecord, revoked: Revocations) {
  if (media.fixture || media.rightsStatus !== 'verified' || media.approvedRevision !== media.revision || !media.publicEvidenceUrl || revoked.ids.has(media.id) || revoked.hashes.has(media.sha256)) return null
  return { id: media.id, revision: media.revision, storageKey: media.storageKey, sha256: media.sha256,
    bytes: media.bytes, mimeType: media.mimeType, role: media.role, sourceUrl: media.sourceUrl,
    sourceType: media.sourceType, sourceRole: media.sourceRole, sourceRevision: media.sourceRevision,
    fetchedAt: media.fetchedAt, updatedAt: media.updatedAt, provenanceIds: [...media.provenanceIds],
    relations: media.relations.map(ref => ({ kind: ref.kind, id: ref.id })), credit: media.credit,
    rightsStatus: 'verified' as const, publicEvidenceUrl: media.publicEvidenceUrl }
}

export function legacyItemDeliveryPath(media: MediaRecord): string | null {
  const match = /^items\/(thumbnails|cards|detail)\/([a-f0-9]{64}\.webp)$/.exec(media.storageKey)
  return media.mimeType === 'image/webp' && match && match[2] === `${media.sha256}.webp` ? `/assets/items/${match[1]}/${match[2]}` : null
}
