import { failure, nullable, object, success, validateId } from '../../data/core/index.ts'
import type { ValidationResult } from '../../data/core/index.ts'
import { unique } from '../../data/catalog/shared.ts'
import { validateOutfitSnapshot } from '../../data/wardrobe/index.ts'
import type { OutfitSnapshot, WardrobePackage, WardrobeSelection } from '../../data/wardrobe/index.ts'
import { createVersionedStorage } from '../../shared/storage/versionedStorage.ts'
import type { KeyStorage } from '../../shared/storage/versionedStorage.ts'
import { resolveRules } from './engine.ts'

export interface OutfitLibrary { outfits: OutfitSnapshot[]; lastOutfitId: string | null }
const outfitName = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.trim().length <= 80 ? success(value.trim()) : failure('invalid_value', 'Outfit name must contain 1–80 characters.')
export function validateOutfitLibrary(input: unknown, pkg: WardrobePackage): ValidationResult<OutfitLibrary> {
  const parsed = object<OutfitLibrary>(input, { outfits: value => {
    if (!Array.isArray(value) || value.length > 50) return failure('invalid_value', 'Outfit library limit exceeded.')
    return unique(entry => {
      const outfit = validateOutfitSnapshot(entry, pkg)
      if (!outfit.valid) return outfit
      if (resolveRules(outfit.value, pkg).issue) return failure('invalid_relationship', 'Saved outfit conflicts with package rules.')
      if (!outfit.value.id || !outfit.value.savedAt) return failure('invalid_value', 'Saved outfits require an ID and timestamp.')
      const name = outfitName(outfit.value.name)
      return name.valid ? success({ ...outfit.value, id: outfit.value.id, name: name.value }) : name
    })(value)
  }, lastOutfitId: nullable(validateId) })
  if (!parsed.valid) return parsed
  if (parsed.value.lastOutfitId !== null && !parsed.value.outfits.some(outfit => outfit.id === parsed.value.lastOutfitId)) return failure('unknown_reference', 'Last saved outfit is missing.')
  return parsed
}
export const outfitStorageKey = (pkg: WardrobePackage) => `sky-guide-outfits:${pkg.id}:${pkg.revision}`
export const createOutfitStorage = (pkg: WardrobePackage, storage: () => KeyStorage) => createVersionedStorage<OutfitLibrary>({
  key: outfitStorageKey(pkg), version: 1, defaultValue: { outfits: [], lastOutfitId: null }, maxChars: 100_000,
  storage, validate: value => validateOutfitLibrary(value, pkg),
})
export function saveOutfit(library: OutfitLibrary, pkg: WardrobePackage, selection: WardrobeSelection, id: string, name: string, savedAt: string): ValidationResult<OutfitLibrary> {
  if (library.outfits.some(outfit => outfit.id === id)) return failure('duplicate_id', 'Outfit ID already exists.')
  return validateOutfitLibrary({ outfits: [...library.outfits, { ...selection, catalogVersion: pkg.revision, id, name, savedAt }], lastOutfitId: id }, pkg)
}
export function renameOutfit(library: OutfitLibrary, pkg: WardrobePackage, id: string, name: string): ValidationResult<OutfitLibrary> {
  if (!library.outfits.some(outfit => outfit.id === id)) return failure('unknown_reference', 'Outfit is missing.')
  return validateOutfitLibrary({ ...library, outfits: library.outfits.map(outfit => outfit.id === id ? { ...outfit, name } : outfit) }, pkg)
}
export function deleteOutfit(library: OutfitLibrary, pkg: WardrobePackage, id: string): ValidationResult<OutfitLibrary> {
  if (!library.outfits.some(outfit => outfit.id === id)) return failure('unknown_reference', 'Outfit is missing.')
  return validateOutfitLibrary({ outfits: library.outfits.filter(outfit => outfit.id !== id), lastOutfitId: library.lastOutfitId === id ? null : library.lastOutfitId }, pkg)
}
export function selectOutfit(library: OutfitLibrary, pkg: WardrobePackage, id: string): ValidationResult<OutfitLibrary> {
  return validateOutfitLibrary({ ...library, lastOutfitId: id }, pkg)
}
