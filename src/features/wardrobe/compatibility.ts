import { validateOutfitSnapshot } from '../../data/wardrobe/index.ts'
import type { WardrobePackage } from '../../data/wardrobe/index.ts'

const demoId = 'demo-wardrobe-v1'
const previousRevision = 'demo-wardrobe-v1-r1'
const currentRevision = 'demo-wardrobe-v1-r2'
const pilotRevision = 'demo-wardrobe-v1-r3'
export function acceptsOutfitRevision(revision: unknown, pkg: WardrobePackage): boolean {
  return revision === pkg.revision || (pkg.id === demoId && (
    pkg.revision === currentRevision && revision === previousRevision
    || pkg.revision === pilotRevision && (revision === previousRevision || revision === currentRevision)))
}
// Exact identity-preserving demo transition only. Every field is validated anew;
// no aliases, dropped items, inferred rules or generic revision fallback.
export function validateCompatibleOutfitSnapshot(input: unknown, pkg: WardrobePackage) {
  if (input && typeof input === 'object' && !Array.isArray(input) && 'catalogVersion' in input && acceptsOutfitRevision(input.catalogVersion, pkg)) {
    return validateOutfitSnapshot({ ...input, catalogVersion: pkg.revision }, pkg)
  }
  return validateOutfitSnapshot(input, pkg)
}
export function outfitLibraryRevision(pkg: WardrobePackage): string {
  return pkg.id === demoId && (pkg.revision === currentRevision || pkg.revision === pilotRevision) ? previousRevision : pkg.revision
}
