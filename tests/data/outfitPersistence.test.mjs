import assert from 'node:assert/strict'
import test from 'node:test'
import { createWardrobeState, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { createOutfitStorage, deleteOutfit, outfitStorageKey, renameOutfit, saveOutfit, selectOutfit, validateOutfitLibrary } from '../../src/features/wardrobe/persistence.ts'

const parsed = validateDemoManifest(JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8')))
assert.equal(parsed.valid, true)
const demoPackage = parsed.value
const demoDefaultSize = 'fixture-demo-size-2'
const empty = () => ({ outfits: [], lastOutfitId: null })
const selection = () => {
  let state = wardrobeReducer(createWardrobeState(demoPackage, demoDefaultSize), { type: 'random_outfit', seed: 42 }, demoPackage)
  const cape = demoPackage.items.find(item => item.id === state.selection.equippedBySlot.cape[0])
  const region = cape.dyeRegions.find(region => region.allowedColors?.length)
  state = wardrobeReducer(state, { type: 'set_dye', itemId: cape.id, regionId: region.id, color: region.allowedColors[0] }, demoPackage)
  state = wardrobeReducer(state, { type: 'set_base_size', sizeCode: demoPackage.sizes[0].code }, demoPackage)
  assert.equal(state.issue, null)
  assert.ok(Object.keys(state.selection.dyeByItemRegion).length)
  return state.selection
}
const save = (library = empty(), id = 'fixture-outfit-a', name = 'Demo outfit') => saveOutfit(library, demoPackage, selection(), id, name, '2026-10-04T00:00:00Z')
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } }

test('saved selection/base/dye survives a new storage instance and reducer restoration', () => {
  const local = storage()
  const library = save().value
  createOutfitStorage(demoPackage, () => local).write(library)
  const restored = createOutfitStorage(demoPackage, () => local).read().value
  assert.deepEqual(restored, library)
  const state = wardrobeReducer(createWardrobeState(demoPackage, demoDefaultSize), { type: 'restore_outfit', snapshot: restored.outfits[0] }, demoPackage)
  assert.equal(state.issue, null)
  assert.deepEqual(state.selection, selection())
  assert.equal('name' in state.selection, false)
})

test('rename/delete/select affect only the addressed outfit and missing IDs fail', () => {
  const original = save(save().value, 'fixture-outfit-b', 'Second').value
  const renamed = renameOutfit(original, demoPackage, 'fixture-outfit-a', '  Renamed  ').value
  assert.equal(renamed.outfits[0].name, 'Renamed')
  assert.deepEqual(renamed.outfits[1], original.outfits[1])
  assert.equal(original.outfits[0].name, 'Demo outfit')
  const selected = selectOutfit(renamed, demoPackage, 'fixture-outfit-a').value
  const removed = deleteOutfit(selected, demoPackage, 'fixture-outfit-a').value
  assert.deepEqual(removed.outfits, [original.outfits[1]])
  assert.equal(removed.lastOutfitId, null)
  assert.equal(renameOutfit(original, demoPackage, 'missing', 'Name').valid, false)
  assert.equal(deleteOutfit(original, demoPackage, 'missing').valid, false)
  assert.equal(selectOutfit(original, demoPackage, 'missing').valid, false)
})

test('library bounds and invalid IDs/revisions/names fail closed', () => {
  assert.equal(save(empty(), 'fixture-a', ' ').valid, false)
  assert.equal(save(empty(), 'fixture-a', 'x'.repeat(81)).valid, false)
  const original = save().value
  assert.equal(save(original).valid, false)
  for (const mutate of [v => { v.outfits[0].catalogVersion = 'old' }, v => { v.outfits[0].baseSizeCode = 'missing' }, v => { v.outfits[0].equippedBySlot.cape = ['missing'] }, v => { v.lastOutfitId = 'missing' }, v => { v.outfits = Array(51).fill(v.outfits[0]) }]) {
    const value = globalThis.structuredClone(original); mutate(value)
    assert.equal(validateOutfitLibrary(value, demoPackage).valid, false)
  }
  assert.notEqual(outfitStorageKey(demoPackage), outfitStorageKey({ ...demoPackage, revision: 'another-revision' }))
})

test('restore rejects malformed snapshots and never trusts persisted effective state', () => {
  const initial = createWardrobeState(demoPackage, demoDefaultSize)
  assert.equal(wardrobeReducer(initial, { type: 'restore_outfit', snapshot: {} }, demoPackage).selection, initial.selection)
  const snapshot = { ...save().value.outfits[0], effectiveSizeCode: 'malicious', privateQr: 'PRIVATE_SENTINEL' }
  const library = validateOutfitLibrary({ outfits: [snapshot], lastOutfitId: snapshot.id }, demoPackage).value
  assert.equal(JSON.stringify(library).includes('PRIVATE_SENTINEL'), false)
  const restored = wardrobeReducer(initial, { type: 'restore_outfit', snapshot }, demoPackage)
  assert.notEqual(restored.effectiveSizeCode, 'malicious')
  assert.equal(restored.issue, null)
})

test('quota failure preserves the entire local library for the current session and retry', () => {
  const local = storage(); const write = local.setItem
  local.setItem = () => { throw new Error('quota') }
  const store = createOutfitStorage(demoPackage, () => local)
  const library = save().value
  assert.equal(store.write(library).issue, 'write_failed')
  assert.deepEqual(store.read().value, library)
  local.setItem = write
  assert.equal(store.retry().persistence, 'persistent')
  assert.deepEqual(createOutfitStorage(demoPackage, () => local).read().value, library)
})
