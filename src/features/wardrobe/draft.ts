import { validateSelection } from '../../data/wardrobe/index.ts'
import { validateCompatibleOutfitSnapshot } from './compatibility.ts'
import type { OutfitSnapshot, WardrobePackage } from '../../data/wardrobe/index.ts'
import { resolveRules } from './engine.ts'

// Document-lifetime draft only. Explicit saved outfits remain the reload source.
export function createWardrobeDraft() {
  let draft: { packageId: string; snapshot: OutfitSnapshot } | null = null
  return {
    read(pkg: WardrobePackage): OutfitSnapshot | null {
      if (!draft || draft.packageId !== pkg.id) return null
      const parsed = validateCompatibleOutfitSnapshot(draft.snapshot, pkg)
      return parsed.valid && !resolveRules(parsed.value, pkg).issue ? structuredClone(parsed.value) : null
    },
    write(input: unknown, pkg: WardrobePackage): boolean {
      const parsed = validateSelection(input, pkg)
      if (!parsed.valid || resolveRules(parsed.value, pkg).issue) return false
      draft = { packageId: pkg.id, snapshot: structuredClone({ ...parsed.value, catalogVersion: pkg.revision, id: null, name: null, savedAt: null }) }
      return true
    },
  }
}
export const wardrobeDraft = createWardrobeDraft()
