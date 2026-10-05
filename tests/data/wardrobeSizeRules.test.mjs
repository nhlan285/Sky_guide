import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { validateOutfitSnapshot, validateWardrobePackage } from '../../src/data/wardrobe/index.ts'
import { createWardrobeState, resolveRules, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { deriveRenderModel } from '../../src/features/wardrobe/model.ts'
import { acceptsOutfitRevision, validateCompatibleOutfitSnapshot } from '../../src/features/wardrobe/compatibility.ts'
import { createOutfitStorage, outfitStorageKey } from '../../src/features/wardrobe/persistence.ts'
import { decodeOutfitShare, encodeOutfitShare } from '../../src/features/wardrobe/share.ts'

const pkg = validateDemoManifest(JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8'))).value
const previous = { ...pkg, revision: 'demo-wardrobe-v1-r1', rules: [] }
const initial = () => createWardrobeState(pkg, 'fixture-demo-size-2')
const reduce = (state, action) => wardrobeReducer(state, action, pkg)
const mask = 'demo-item-mask-tile'
const snapshot = () => ({ ...initial().selection, catalogVersion: previous.revision, id: 'saved-demo', name: 'Old outfit', savedAt: '2026-01-01T00:00:00Z' })

test('visible fixture override keeps base scale through changes and removal/replacement/reset', () => {
  let state = reduce(initial(), { type: 'equip', slot: 'mask', itemId: mask })
  assert.equal(state.effectiveSizeCode, 'fixture-demo-size-0'); assert.equal(state.selection.baseSizeCode, 'fixture-demo-size-2')
  assert.deepEqual(state.appliedRuleIds, ['demo-rule-tile-small']); assert.equal(pkg.rules[0].fixture, true)
  assert.match(pkg.rules[0].reason, /Not a Sky game rule/)
  for (const size of pkg.sizes) {
    state = reduce(state, { type: 'set_base_size', sizeCode: size.code })
    assert.equal(state.selection.baseSizeCode, size.code); assert.equal(state.effectiveSizeCode, 'fixture-demo-size-0')
    const model = deriveRenderModel(pkg, state.selection, state.effectiveSizeCode)
    assert.deepEqual(model.warnings, []); assert.equal(model.size.code, 'fixture-demo-size-0')
  }
  for (const action of [{ type: 'unequip', slot: 'mask', itemId: mask }, { type: 'reset_slot', slot: 'mask' },
    { type: 'replace', slot: 'mask', itemId: 'demo-item-mask-arc', replacedItemId: mask }, { type: 'reset_outfit' }]) {
    const restored = reduce(state, action)
    assert.equal(restored.effectiveSizeCode, state.selection.baseSizeCode); assert.deepEqual(restored.appliedRuleIds, [])
  }
})

test('all actual demo presets retain matching anchors without double-scaling after repeated changes', () => {
  let state = initial()
  for (let index = 0; index < 24; index++) {
    state = reduce(state, { type: 'set_base_size', sizeCode: pkg.sizes[index % 4].code })
    const model = deriveRenderModel(pkg, state.selection, state.effectiveSizeCode)
    assert.deepEqual(model.warnings, []); assert.equal(model.size.code, state.selection.baseSizeCode)
  }
  state = reduce(state, { type: 'set_base_size', sizeCode: initial().selection.baseSizeCode })
  assert.deepEqual(deriveRenderModel(pkg, state.selection, state.effectiveSizeCode), deriveRenderModel(pkg, initial().selection, initial().effectiveSizeCode))
})

test('conflict rejects candidate action and missing calibration does not silently fall back', () => {
  const conflict = { ...pkg, rules: [...pkg.rules, { ...pkg.rules[0], id: 'demo-rule-conflict', triggerItemIds: ['demo-item-hair-round'], targetSizeCode: 'fixture-demo-size-3' }] }
  assert.equal(validateWardrobePackage(conflict, { provenanceIds: new Set(), sourceIds: new Set() }).valid, false)
  const state = wardrobeReducer(initial(), { type: 'equip', slot: 'mask', itemId: mask }, conflict)
  const rejected = wardrobeReducer(state, { type: 'equip', slot: 'hair', itemId: 'demo-item-hair-round' }, conflict)
  assert.equal(rejected.issue, 'rule_conflict'); assert.deepEqual(rejected.selection, state.selection)
  assert.deepEqual(rejected.issueRuleIds, ['demo-rule-conflict', 'demo-rule-tile-small'])
  assert.deepEqual(wardrobeReducer(rejected, { type: 'unequip', slot: 'mask', itemId: mask }, conflict).issueRuleIds, [])
  assert.equal(rejected.effectiveSizeCode, state.effectiveSizeCode)
  const corrupted = { ...state.selection, equippedBySlot: { ...state.selection.equippedBySlot, hair: ['demo-item-hair-round'] } }
  assert.deepEqual(resolveRules(corrupted, conflict), resolveRules(corrupted, { ...conflict, rules: [...conflict.rules].reverse() }))
  const missing = { ...pkg, anchors: pkg.anchors.filter(anchor => anchor.sizeCode !== state.effectiveSizeCode) }
  const model = deriveRenderModel(missing, state.selection, state.effectiveSizeCode)
  assert.deepEqual(model.warnings, ['missing_anchor']); assert.deepEqual(model.layers, [])
  assert.equal(deriveRenderModel(pkg, state.selection, 'missing').size, undefined)
})

test('only exact demo r1->r2 transition revalidates full snapshots without mutating input', () => {
  const old = snapshot(), before = globalThis.structuredClone(old)
  assert.equal(validateOutfitSnapshot(old, pkg).valid, false) // generic validator remains strict
  const migrated = validateCompatibleOutfitSnapshot(old, pkg)
  assert.equal(migrated.valid, true); assert.equal(migrated.value.catalogVersion, pkg.revision)
  assert.deepEqual({ ...migrated.value, catalogVersion: old.catalogVersion }, old); assert.deepEqual(old, before)
  for (const revision of ['future', 'demo-wardrobe-v1-r0', null]) assert.equal(acceptsOutfitRevision(revision, pkg), false)
  assert.equal(acceptsOutfitRevision(old.catalogVersion, { ...pkg, id: 'another-demo' }), false)
  old.equippedBySlot.mask = ['unknown-item']; assert.equal(validateCompatibleOutfitSnapshot(old, pkg).valid, false)
})

test('existing r1 library is read in place and not rewritten until explicit save', () => {
  const old = snapshot(), envelope = JSON.stringify({ version: 1, value: { outfits: [old], lastOutfitId: old.id } })
  const values = new Map([[outfitStorageKey(previous), envelope]])
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }
  assert.equal(outfitStorageKey(pkg), outfitStorageKey(previous))
  const store = createOutfitStorage(pkg, () => storage), result = store.read()
  assert.equal(result.issue, null); assert.equal(result.value.outfits[0].catalogVersion, pkg.revision)
  assert.equal(values.get(outfitStorageKey(previous)), envelope)
  assert.equal(store.write(result.value).issue, null)
  assert.equal(JSON.parse(values.get(outfitStorageKey(pkg))).value.outfits[0].catalogVersion, pkg.revision)
})

test('future library remains protected during demo transition', () => {
  const raw = JSON.stringify({ version: 2, value: { privateFixture: true } })
  const storage = { getItem: () => raw, setItem: () => assert.fail('must not overwrite'), removeItem: () => assert.fail('must not remove') }
  const store = createOutfitStorage(pkg, () => storage)
  assert.equal(store.read().issue, 'future_version')
  assert.equal(store.write({ outfits: [], lastOutfitId: null }).issue, 'future_version')
})

test('real r1 encoded link restores chosen base and recomputes current fixture rule', async () => {
  const state = wardrobeReducer(createWardrobeState(previous, 'fixture-demo-size-3'), { type: 'equip', slot: 'mask', itemId: mask }, previous)
  const link = await encodeOutfitShare(state.selection, previous); assert.equal(link.ok, true)
  const decoded = await decodeOutfitShare(link.value, pkg); assert.equal(decoded.ok, true)
  assert.equal(decoded.value.catalogVersion, pkg.revision); assert.deepEqual(decoded.value.equippedBySlot, state.selection.equippedBySlot)
  const restored = reduce(initial(), { type: 'restore_outfit', snapshot: decoded.value })
  assert.equal(restored.selection.baseSizeCode, 'fixture-demo-size-3'); assert.equal(restored.effectiveSizeCode, 'fixture-demo-size-0')
  assert.equal(restored.issue, null)
})
