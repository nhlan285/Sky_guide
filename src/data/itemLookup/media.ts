import { enumeration, failure, nullable, object, success, validateDateTime, validateId } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import { array, nonBlank } from '../catalog/shared.ts'
import { validateCatalogueImage } from './images.ts'
import type { CatalogueImage } from './images.ts'

interface MediaContext { sourceLabel: string; note: string | null }
export interface VerifiedMedia extends CatalogueImage, MediaContext {}
export interface ReferenceMedia extends MediaContext {
  url: null
  sourceUrl: string
  identitySourceUrl: string
  credit: string | null
  revision: string | null
  checkedAt: string
  reuseStatus: 'reference-only'
}
export type CatalogueMedia = VerifiedMedia | ReferenceMedia
export type GalleryMedia = CatalogueMedia & { kind: 'worn-preview' | 'reference' }
export interface ItemImages { primary: CatalogueMedia | null; gallery: GalleryMedia[] }
function https(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return failure('invalid_type', 'Expected a public HTTPS source URL.')
  try {
    const url = new URL(input)
    if (url.protocol === 'https:' && !url.username && !url.password && input.trim() === input) return success(input)
  } catch { /* No inferred source URL. */ }
  return failure('invalid_value', 'Invalid media source URL.')
}
export function validateMedia(input: unknown): ValidationResult<CatalogueMedia> {
  if (input && typeof input === 'object' && 'reuseStatus' in input && input.reuseStatus === 'reference-only') {
    return object<ReferenceMedia>(input, {
      url: value => value === null ? success(null) : failure('invalid_value', 'Uncleared references must not contain an embeddable URL.'),
      sourceUrl: https, identitySourceUrl: https, sourceLabel: nonBlank, note: nonBlank,
      credit: nullable(nonBlank), revision: nullable(nonBlank), checkedAt: validateDateTime, reuseStatus: enumeration(['reference-only']),
    })
  }
  const approved = validateCatalogueImage(input)
  if (!approved.valid) return approved
  const context = object<MediaContext>(input, { sourceLabel: nonBlank, note: nullable(nonBlank) })
  return context.valid ? success({ ...approved.value, ...context.value }) : context
}
export function validateItemImages(input: unknown): ValidationResult<ItemImages> {
  return object<ItemImages>(input, {
    primary: value => value === undefined ? success(null) : nullable(validateMedia)(value),
    gallery: value => value === undefined ? success([]) : array(entry => {
      const media = validateMedia(entry)
      if (!media.valid) return media
      const kind = object<{ kind: GalleryMedia['kind'] }>(entry, { kind: enumeration(['worn-preview', 'reference']) })
      return kind.valid ? success({ ...media.value, kind: kind.value.kind }) : kind
    })(value),
  })
}
export function validateMediaRegistry(input: unknown, ids: ReadonlySet<string>): ValidationResult<{ schemaVersion: 1; records: { itemId: string; images: ItemImages }[] }> {
  const result = object<{ schemaVersion: 1; records: { itemId: string; images: ItemImages }[] }>(input, {
    schemaVersion: value => value === 1 ? success(1 as const) : failure('invalid_value', 'Unsupported media registry version.'),
    records: array(value => object(value, { itemId: validateId, images: validateItemImages })),
  })
  if (!result.valid) return result
  const seen = new Set<string>()
  for (const entry of result.value.records) {
    if (!ids.has(entry.itemId)) return failure('unknown_reference', 'Media must reference a known item.')
    if (seen.has(entry.itemId)) return failure('duplicate_id', 'Duplicate item media mapping.')
    seen.add(entry.itemId)
  }
  return result
}
export function displayMedia(input: unknown, failedUrl: string | null = null): VerifiedMedia | null {
  const result = validateMedia(input)
  return result.valid && result.value.reuseStatus === 'verified' && result.value.url !== failedUrl ? result.value : null
}
export function imageSources(images: ItemImages | null | undefined): CatalogueMedia[] {
  return images ? [...(images.primary ? [images.primary] : []), ...images.gallery] : []
}
