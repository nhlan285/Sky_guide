import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { createWardrobeState, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { deriveRenderModel, regionColor, transformAssetPoint } from '../../src/features/wardrobe/model.ts'
import { createOutfitStorage, saveOutfit } from '../../src/features/wardrobe/persistence.ts'
import { decodeOutfitShare, encodeOutfitShare } from '../../src/features/wardrobe/share.ts'

const parsed = validateDemoManifest(JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8')))
assert.equal(parsed.valid, true)
const pkg = parsed.value
const cape = 'demo-item-cape-split', tile = 'demo-item-mask-tile', arc = 'demo-item-mask-arc'
const region = 'demo-region-fabric', color = '#b28691'
const reduce = (state, action) => wardrobeReducer(state, action, pkg)
const initial = () => createWardrobeState(pkg, 'fixture-demo-size-2')
function memoryStorage() {
  const values = new Map()
  let writes = 0
  return {
    get writes() { return writes },
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { writes++; values.set(key, value) },
    removeItem: key => values.delete(key),
  }
}
function rendered(state, effectiveSize, items) {
  assert.equal(state.issue, null)
  assert.equal(state.effectiveSizeCode, effectiveSize)
  const model = deriveRenderModel(pkg, state.selection, state.effectiveSizeCode)
  assert.deepEqual(model.warnings, [])
  assert.equal(model.size.code, effectiveSize)
  assert.deepEqual([...new Set(model.layers.map(layer => layer.binding.itemId).filter(Boolean))].sort(), [...items].sort())
  // Compare geometry across transitions, without reproducing the transform formula.
  return model.layers.map(layer => ({
    id: layer.binding.id,
    pivot: transformAssetPoint(layer, model.size, layer.binding.pivotX, layer.binding.pivotY),
    corner: transformAssetPoint(layer, model.size, 0, 0),
  }))
}
async function shareRestore(state) {
  const encoded = await encodeOutfitShare(state.selection, pkg)
  assert.equal(encoded.ok, true)
  const decoded = await decodeOutfitShare(encoded.value, pkg)
  assert.equal(decoded.ok, true)
  const restored = reduce(initial(), { type: 'restore_outfit', snapshot: decoded.value })
  assert.equal(restored.issue, null)
  assert.deepEqual(restored.selection, state.selection)
  return restored
}
function reload(local) {
  const result = createOutfitStorage(pkg, () => local).read()
  assert.equal(result.issue, null)
  const snapshot = result.value.outfits.find(outfit => outfit.id === result.value.lastOutfitId)
  assert.ok(snapshot)
  return { library: result.value, state: reduce(initial(), { type: 'restore_outfit', snapshot }) }
}

for (const size of pkg.sizes) test(`workflow equip/base/override/remove/dye/share/save/reload continues at ${size.code}`, async () => {
  const local = memoryStorage()
  let state = reduce(initial(), { type: 'equip', slot: 'cape', itemId: cape })
  state = reduce(state, { type: 'set_base_size', sizeCode: size.code })
  const originalGeometry = rendered(state, size.code, [cape])
  state = reduce(state, { type: 'equip', slot: 'mask', itemId: tile })
  rendered(state, 'fixture-demo-size-0', [cape, tile])
  assert.equal(state.selection.baseSizeCode, size.code)
  assert.deepEqual(state.appliedRuleIds, ['demo-rule-tile-small'])

  const accepted = state
  state = reduce(state, { type: 'equip', slot: 'mask', itemId: arc })
  assert.equal(state.issue, 'capacity_exceeded')
  assert.deepEqual(state.selection, accepted.selection)
  assert.deepEqual(deriveRenderModel(pkg, state.selection, state.effectiveSizeCode), deriveRenderModel(pkg, accepted.selection, accepted.effectiveSizeCode))
  const sharedRejected = await shareRestore(state)
  assert.deepEqual(sharedRejected.appliedRuleIds, accepted.appliedRuleIds)
  state = reduce(sharedRejected, { type: 'unequip', slot: 'mask', itemId: tile })
  assert.deepEqual(rendered(state, size.code, [cape]), originalGeometry)
  state = reduce(state, { type: 'set_dye', itemId: cape, regionId: region, color })
  assert.equal(regionColor(pkg, cape, region, state.selection), color)
  state = await shareRestore(state)
  assert.deepEqual(rendered(state, size.code, [cape]), originalGeometry)
  assert.equal(regionColor(pkg, cape, region, state.selection), color)
  assert.equal(local.writes, 0)

  const library = saveOutfit({ outfits: [], lastOutfitId: null }, pkg, state.selection, 'fixture-sequence', 'Sequence', '2026-10-06T00:00:00Z')
  assert.equal(library.valid, true)
  assert.equal(createOutfitStorage(pkg, () => local).write(library.value).issue, null)
  assert.equal(local.writes, 1)
  state = reload(local).state
  assert.deepEqual(state.selection, {
    schemaVersion: 1, baseSizeCode: size.code,
    equippedBySlot: { mask: [], hair: [], cape: [cape], top: [], bottom: [], accessory: [] },
    dyeByItemRegion: { [cape]: { [region]: color } },
  })
  assert.deepEqual(rendered(state, size.code, [cape]), originalGeometry)
  assert.equal(regionColor(pkg, cape, region, state.selection), color)
  for (let cycle = 0; cycle < 6; cycle++) {
    state = reduce(state, { type: 'equip', slot: 'mask', itemId: tile })
    rendered(state, 'fixture-demo-size-0', [cape, tile])
    state = reduce(state, { type: 'unequip', slot: 'mask', itemId: tile })
    assert.deepEqual(rendered(state, size.code, [cape]), originalGeometry)
    assert.equal(regionColor(pkg, cape, region, state.selection), color)
  }
  assert.equal(local.writes, 1)
})

test('saved active override survives unsaved edits, reload and a second explicit save', async () => {
  const local = memoryStorage()
  let state = reduce(initial(), { type: 'equip', slot: 'cape', itemId: cape })
  state = reduce(state, { type: 'set_base_size', sizeCode: 'fixture-demo-size-3' })
  state = reduce(state, { type: 'set_dye', itemId: cape, regionId: region, color })
  state = reduce(state, { type: 'equip', slot: 'mask', itemId: tile })
  state = await shareRestore(state)
  const savedSelection = globalThis.structuredClone(state.selection)
  const savedGeometry = rendered(state, 'fixture-demo-size-0', [cape, tile])
  const saved = saveOutfit({ outfits: [], lastOutfitId: null }, pkg, state.selection, 'fixture-first', 'First', '2026-10-06T00:00:00Z')
  assert.equal(saved.valid, true)
  assert.equal(createOutfitStorage(pkg, () => local).write(saved.value).issue, null)

  state = reduce(state, { type: 'replace', slot: 'mask', itemId: arc, replacedItemId: tile })
  state = reduce(state, { type: 'set_base_size', sizeCode: 'fixture-demo-size-1' })
  state = reduce(state, { type: 'reset_item_colors', itemId: cape })
  rendered(state, 'fixture-demo-size-1', [cape, arc])
  assert.equal(regionColor(pkg, cape, region, state.selection), undefined)
  assert.equal(local.writes, 1)

  const restored = reload(local)
  state = restored.state
  assert.deepEqual(restored.library, saved.value)
  assert.deepEqual(state.selection, savedSelection)
  assert.deepEqual(rendered(state, 'fixture-demo-size-0', [cape, tile]), savedGeometry)
  assert.equal(state.selection.baseSizeCode, 'fixture-demo-size-3')
  assert.equal(regionColor(pkg, cape, region, state.selection), color)
  state = reduce(state, { type: 'unequip', slot: 'mask', itemId: tile })
  rendered(state, 'fixture-demo-size-3', [cape])
  const secondSelection = globalThis.structuredClone(state.selection)
  const second = saveOutfit(restored.library, pkg, state.selection, 'fixture-second', 'Second', '2026-10-06T01:00:00Z')
  assert.equal(second.valid, true)
  assert.deepEqual(second.value.outfits[0], saved.value.outfits[0])
  assert.equal(createOutfitStorage(pkg, () => local).write(second.value).issue, null)
  const latest = reload(local)
  assert.equal(latest.library.lastOutfitId, 'fixture-second')
  assert.deepEqual(latest.state.selection, secondSelection)
  rendered(latest.state, 'fixture-demo-size-3', [cape])
  const firstAgain = reduce(latest.state, { type: 'restore_outfit', snapshot: latest.library.outfits[0] })
  assert.deepEqual(firstAgain.selection, savedSelection)
  assert.deepEqual(rendered(firstAgain, 'fixture-demo-size-0', [cape, tile]), savedGeometry)
  assert.equal(local.writes, 2)
})
