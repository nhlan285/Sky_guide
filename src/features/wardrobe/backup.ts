import { failure, success } from '../../data/core/index.ts'
import type { ValidationResult } from '../../data/core/index.ts'
import type { WardrobePackage } from '../../data/wardrobe/index.ts'
import { acceptsOutfitRevision } from './compatibility.ts'
import { validateOutfitLibrary } from './persistence.ts'
import type { OutfitLibrary } from './persistence.ts'

export const MAX_BACKUP_BYTES = 100_000
const format = 'sky-guide-outfit-library'
const bounded = (text: string) => text.length <= MAX_BACKUP_BYTES && new TextEncoder().encode(text).byteLength <= MAX_BACKUP_BYTES

export function encodeOutfitBackup(input: unknown, pkg: WardrobePackage): ValidationResult<string> {
  const library = validateOutfitLibrary(input, pkg)
  if (!library.valid) return library
  const text = JSON.stringify({ format, schemaVersion: 1, packageId: pkg.id, packageRevision: pkg.revision, library: library.value }, null, 2)
  return bounded(text) ? success(text) : failure('invalid_value', 'Outfit backup exceeds the application size limit.')
}

export function parseOutfitBackup(text: unknown, pkg: WardrobePackage): ValidationResult<OutfitLibrary> {
  if (typeof text !== 'string' || !bounded(text)) return failure('invalid_value', 'Expected a bounded outfit backup JSON string.')
  let input: unknown
  try { input = JSON.parse(text) }
  catch { return failure('invalid_value', 'Outfit backup is not valid JSON.') }
  if (!input || typeof input !== 'object' || Array.isArray(input) || !('format' in input) || input.format !== format ||
      !('schemaVersion' in input) || input.schemaVersion !== 1 || !('packageId' in input) || input.packageId !== pkg.id ||
      !('packageRevision' in input) || !acceptsOutfitRevision(input.packageRevision, pkg) || !('library' in input)) {
    return failure('invalid_value', 'Outfit backup format or package version is unsupported.')
  }
  const raw = input.library
  if (!raw || typeof raw !== 'object' || !('outfits' in raw) || !Array.isArray(raw.outfits) ||
      raw.outfits.some(outfit => !outfit || typeof outfit !== 'object' || outfit.catalogVersion !== input.packageRevision)) {
    return failure('invalid_value', 'Outfit backup revisions do not match its envelope.')
  }
  return validateOutfitLibrary(raw, pkg)
}
