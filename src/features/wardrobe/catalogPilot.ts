import { validateWardrobePackage } from '../../data/wardrobe/index.ts'
import type { WardrobePackage } from '../../data/wardrobe/index.ts'
import type { LocalizedText } from '../../data/catalog/types.ts'
import type { DemoGeometry } from './demo/validation.ts'
import { wardrobeReducer } from './engine.ts'
import type { WardrobeState } from './engine.ts'

// Explicit bounded mapping of public identity to original illustrative geometry.
// These shapes do not reproduce the corresponding game assets or calibration.
export const catalogPilotMappings = [
  { id: 'tsa-cosmetic-6', prototype: 'demo-item-cape-split', slot: 'cape', color: null },
  { id: 'tsa-cosmetic-1011', prototype: 'demo-item-cape-round', slot: 'cape', color: '#7f8fba' },
  { id: 'tsa-cosmetic-1012', prototype: 'demo-item-cape-round', slot: 'cape', color: '#b28691' },
  { id: 'tsa-cosmetic-4', prototype: 'demo-item-mask-arc', slot: 'mask', color: null },
  { id: 'tsa-cosmetic-5', prototype: 'demo-item-hair-round', slot: 'hair', color: null },
  { id: 'tsa-cosmetic-10', prototype: 'demo-item-hair-loop', slot: 'hair', color: null },
] as const

interface PilotRecord { id: string; name: LocalizedText; slot: string; fixture: boolean; recordStatus: string; provenanceIds: string[] }
export function buildCatalogPilot(base: WardrobePackage, baseGeometry: ReadonlyMap<string, DemoGeometry>, records: readonly PilotRecord[]) {
  const pkg = structuredClone(base)
  pkg.revision = 'demo-wardrobe-v1-r3'
  const geometry = new Map(baseGeometry)
  for (const mapping of catalogPilotMappings) {
    const record = records.find(item => item.id === mapping.id)
    const prototype = base.items.find(item => item.id === mapping.prototype)
    if (!record || record.fixture || record.recordStatus !== 'published' || !record.provenanceIds.length
      || record.slot !== mapping.slot || !prototype || prototype.slot !== mapping.slot) throw new Error('Invalid source-verified wardrobe pilot.')
    const prefix = `demo-pilot-${mapping.id}-`
    const assetIds = new Map(prototype.assetIds.map(id => [id, prefix + id]))
    pkg.items.push({ id: record.id, name: record.name, slot: mapping.slot, assetIds: [...assetIds.values()], dyeRegions: [], fixture: false })
    for (const [id, nextId] of assetIds) {
      const asset = base.assets.find(value => value.id === id)
      const shapes = baseGeometry.get(id)
      if (!asset || !shapes || asset.legalStatus !== 'self_created_placeholder') throw new Error('Pilot requires original self-created geometry.')
      pkg.assets.push({ ...asset, id: nextId, capabilities: ['layer'] })
      geometry.set(nextId, { assetId: nextId, paths: shapes.paths.map(shape => ({ ...shape, regionId: null, fill: mapping.color ?? shape.fill })) })
    }
    for (const binding of base.bindings.filter(value => value.itemId === prototype.id)) {
      const next = { ...binding, id: prefix + binding.id, itemId: record.id, assetId: assetIds.get(binding.assetId)! }
      pkg.bindings.push(next)
      pkg.anchors.push(...base.anchors.filter(anchor => anchor.bindingId === binding.id).map(anchor => ({ ...anchor, id: prefix + anchor.id, bindingId: next.id, assetId: next.assetId })))
    }
  }
  const result = validateWardrobePackage(pkg, { provenanceIds: new Set(), sourceIds: new Set() })
  if (!result.valid) throw new Error('Invalid illustrative wardrobe package.')
  return { pkg: result.value, geometry }
}

export function equipCatalogPilot(state: WardrobeState, id: string, pkg: WardrobePackage): WardrobeState {
  const item = pkg.items.find(item => item.id === id && !item.fixture)
  if (!item || !catalogPilotMappings.some(mapping => mapping.id === id)) return state
  const current = state.selection.equippedBySlot[item.slot]
  return wardrobeReducer(state, current.length
    ? { type: 'replace', slot: item.slot, itemId: id, replacedItemId: current[0] }
    : { type: 'equip', slot: item.slot, itemId: id }, pkg)
}
