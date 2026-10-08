import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { createHash } from 'node:crypto'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { buildCatalogPilot, equipCatalogPilot } from '../../src/features/wardrobe/catalogPilot.ts'
import { createWardrobeState, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { deriveRenderModel } from '../../src/features/wardrobe/model.ts'
import { createOutfitStorage, outfitStorageKey, saveOutfit } from '../../src/features/wardrobe/persistence.ts'
import { encodeOutfitShare, decodeOutfitShare } from '../../src/features/wardrobe/share.ts'
import { encodeOutfitBackup, parseOutfitBackup } from '../../src/features/wardrobe/backup.ts'
import { validateCompatibleOutfitSnapshot } from '../../src/features/wardrobe/compatibility.ts'

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'))
const base = validateDemoManifest(read('../../src/features/wardrobe/demo/manifest.json')).value
const pilot = read('../../src/features/wardrobe/catalog-pilot.json')
const baseGeometry = new Map(base.geometry.map(g => [g.assetId, g]))
const { pkg, geometry } = buildCatalogPilot(base, baseGeometry, pilot.records)
const initial = () => createWardrobeState(pkg, 'fixture-demo-size-2')

test('bounded pilot records and names/slots/provenance exactly match immutable K15 source', () => {
  const path = '../../data/public/tsa-v1-74007cf878ef/items.json'
  const bytes = readFileSync(new URL(path, import.meta.url))
  const source = JSON.parse(bytes)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), pilot.sourceDatasetSha256)
  assert.equal(source.dataVersion, pilot.sourceCatalogVersion)
  assert.equal(pilot.records.length, 6)
  for (const record of pilot.records) assert.deepEqual(record, source.records.find(item => item.id === record.id))
  const broken = JSON.parse(JSON.stringify(pilot.records)); broken[0].slot = 'unknown'
  assert.throws(() => buildCatalogPilot(base, baseGeometry, broken))
  broken[0] = { ...pilot.records[0], fixture: true }
  assert.throws(() => buildCatalogPilot(base, baseGeometry, broken))
  assert.equal(validateDemoManifest({ ...base, items: pkg.items }).valid, false, 'original demo fixture gate stays strict')
})
test('real item IDs replace only compatible slot, preserve other outfit, and genuinely change render layers', () => {
  const outfit = wardrobeReducer(initial(), { type: 'random_outfit', seed: 27 }, pkg)
  const blue = equipCatalogPilot(outfit, 'tsa-cosmetic-1011', pkg)
  assert.deepEqual(blue.selection.equippedBySlot.cape, ['tsa-cosmetic-1011'])
  for (const slot of ['mask', 'hair', 'top', 'bottom', 'accessory']) assert.deepEqual(blue.selection.equippedBySlot[slot], outfit.selection.equippedBySlot[slot])
  const red = equipCatalogPilot(blue, 'tsa-cosmetic-1012', pkg)
  const layers = state => deriveRenderModel(pkg, state.selection, state.effectiveSizeCode).layers.filter(layer => layer.binding.slot === 'cape')
  assert.equal(layers(red).length, 2)
  assert.ok(layers(red).every(layer => layer.binding.itemId === 'tsa-cosmetic-1012'))
  assert.notDeepEqual(layers(blue).map(layer => geometry.get(layer.asset.id)), layers(red).map(layer => geometry.get(layer.asset.id)))
  assert.deepEqual(pkg.items.find(item => item.id === 'tsa-cosmetic-1012').dyeRegions, [], 'no invented game dye support')
  assert.equal(equipCatalogPilot(red, 'tsa-cosmetic-999999', pkg), red, 'unsupported item keeps exact state')
  assert.equal(deriveRenderModel(pkg, red.selection, red.effectiveSizeCode).warnings.length, 0)
})
test('saved outfit, reload, backup and share retain real identity and all other selections', async () => {
  const outfit = equipCatalogPilot(equipCatalogPilot(initial(), 'tsa-cosmetic-5', pkg), 'tsa-cosmetic-1011', pkg)
  const saved = saveOutfit({ outfits: [], lastOutfitId: null }, pkg, outfit.selection, 'outfit-pilot', 'Pilot', '2026-10-08T00:00:00Z')
  assert.equal(saved.valid, true)
  const values = new Map(); const storage = () => ({ getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) })
  const first = createOutfitStorage(pkg, storage)
  const written = first.write(saved.value); assert.equal(written.issue, null); assert.equal(written.persistence, 'persistent')
  const reloaded = createOutfitStorage(pkg, storage).read().value.outfits[0]
  assert.deepEqual(wardrobeReducer(initial(), { type: 'restore_outfit', snapshot: reloaded }, pkg).selection, outfit.selection)
  const share = await encodeOutfitShare(outfit.selection, pkg); assert.equal(share.ok, true)
  const decoded = await decodeOutfitShare(share.value, pkg); assert.equal(decoded.ok, true)
  assert.deepEqual(decoded.value.equippedBySlot, outfit.selection.equippedBySlot)
  const backup = encodeOutfitBackup(saved.value, pkg); assert.equal(backup.valid, true)
  assert.deepEqual(parseOutfitBackup(backup.value, pkg).value, saved.value)
})
test('existing r1/r2 demo outfits and storage keys remain compatible without accepting arbitrary revisions', () => {
  assert.equal(outfitStorageKey(pkg), outfitStorageKey(base))
  const old = createWardrobeState(base, 'fixture-demo-size-2').selection
  for (const catalogVersion of ['demo-wardrobe-v1-r1', 'demo-wardrobe-v1-r2']) assert.equal(validateCompatibleOutfitSnapshot({ ...old, catalogVersion, id: null, name: null, savedAt: null }, pkg).valid, true)
  assert.equal(validateCompatibleOutfitSnapshot({ ...old, catalogVersion: 'future', id: null, name: null, savedAt: null }, pkg).valid, false)
  assert.equal(pkg.items.length, base.items.length + 6)
  assert.deepEqual(pkg.rules, base.rules, 'no invented game compatibility rules')
})
