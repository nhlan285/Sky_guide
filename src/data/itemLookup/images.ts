import { enumeration, failure, nullable, object, success, validateDateTime, validateId } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import { array, nonBlank } from '../catalog/shared.ts'

// Presentation media has its own reuse evidence; factual-data licensing never approves an image.
export interface CatalogueImage {
  url: string
  sourceUrl: string
  credit: string
  license: string
  revision: string | null
  permissionUrl: string
  verifiedAt: string
  reuseStatus: 'verified'
}
export interface ImageRecord { itemId: string; image: CatalogueImage }
function httpsUrl(input: unknown): ValidationResult<string> {
  if (typeof input !== 'string') return failure('invalid_type', 'Expected an HTTPS source URL.')
  try {
    const url = new URL(input)
    if (url.protocol === 'https:' && !url.username && !url.password && input === input.trim()) return success(input)
  } catch { /* Invalid URLs cannot become image sources. */ }
  return failure('invalid_value', 'Expected an HTTPS URL without credentials.')
}
function imageUrl(input: unknown): ValidationResult<string> {
  if (typeof input === 'string' && /^\/media\/items\/[a-z0-9-]+\.(png|webp|jpe?g|avif)$/.test(input)) return success(input)
  return httpsUrl(input)
}
export function validateCatalogueImage(input: unknown): ValidationResult<CatalogueImage> {
  return object<CatalogueImage>(input, {
    url: imageUrl, sourceUrl: httpsUrl, credit: nonBlank, license: nonBlank,
    revision: nullable(nonBlank), permissionUrl: httpsUrl, verifiedAt: validateDateTime,
    reuseStatus: enumeration(['verified']),
  })
}
export function validateImageRegistry(input: unknown, itemIds: ReadonlySet<string>): ValidationResult<{ schemaVersion: 1; records: ImageRecord[] }> {
  const result = object<{ schemaVersion: 1; records: ImageRecord[] }>(input, {
    schemaVersion: value => value === 1 ? success(1 as const) : failure('invalid_value', 'Unsupported image registry version.'),
    records: array(value => object<ImageRecord>(value, { itemId: validateId, image: validateCatalogueImage })),
  })
  if (!result.valid) return result
  const seen = new Set<string>()
  for (const record of result.value.records) {
    if (!itemIds.has(record.itemId)) return failure('unknown_reference', 'Image must reference a catalogue item.')
    if (seen.has(record.itemId)) return failure('duplicate_id', 'Only one thumbnail may be assigned to an item.')
    seen.add(record.itemId)
  }
  return result
}
export function resolveItemImage(input: unknown, failedUrl: string | null = null): CatalogueImage | null {
  if (input == null) return null
  const result = validateCatalogueImage(input)
  return result.valid && result.value.url !== failedUrl ? result.value : null
}
