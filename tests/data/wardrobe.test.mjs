import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { deserialize, serialize } from 'node:v8'
import {
  SLOTS, validateAsset, validateColor, validateDyeRegion, validateOutfitSnapshot,
  validateSelection, validateWardrobePackage, findAnchor,
} from '../../src/data/wardrobe/index.ts'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { createWardrobeState, wardrobeReducer, resolveRules } from '../../src/features/wardrobe/engine.ts'
import { characterTransform, deriveRenderModel, layerTransform, regionColor, resolveShapeDye, transformAssetPoint } from '../../src/features/wardrobe/model.ts'

const raw = JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8'))
const context = { provenanceIds: new Set(), sourceIds: new Set() }
const parsed = validateDemoManifest(raw)
assert.equal(parsed.valid, true)
const pkg = parsed.value
const base = 'fixture-demo-size-2'
const initial = () => createWardrobeState(pkg, base)
const item = (slot, index = 0) => pkg.items.filter(value => value.slot === slot)[index]
const reduce = (state, action, config = pkg) => wardrobeReducer(state, action, config)
const equip = (state, slot, index = 0, config = pkg) => reduce(state, { type: 'equip', slot, itemId: item(slot, index).id }, config)
const clone = value => deserialize(serialize(value))
const copy = () => clone(raw)
const invalid = mutate => { const input = copy(); mutate(input); assert.equal(validateWardrobePackage(input, context).valid, false) }
const rule = (id, triggers, target, priority = 10) => ({ id, triggerItemIds: triggers, effect: 'set_effective_size', targetSizeCode: target, priority, reason: 'Synthetic behavioral test only', fixture: true, provenanceIds: [] })

test('production demo validates and is separate from the Phase 0 test fixture/public catalog', () => {
  assert.equal(parsed.value.packageKind, 'self_created_demo')
  assert.equal(pkg.config.fixture, true)
  assert.match(parsed.value.disclosure, /Not Sky assets/)
  assert.equal(pkg.items.length, 12)
  for (const slot of SLOTS) assert.equal(pkg.items.filter(entry => entry.slot === slot).length, 2)
  for (const asset of pkg.assets) {
    assert.equal(asset.legalStatus, 'self_created_placeholder')
    assert.equal(asset.placeholder, true)
    assert.equal(asset.fixture, true)
    assert.equal(asset.sourceId, null)
    assert.equal(asset.path, null)
    assert.deepEqual(asset.provenanceIds, [])
    assert.match(asset.id, /^demo-/)
  }
  assert.ok(!JSON.stringify(raw).includes('tests/fixtures'))
})
test('manifest validators project declared fields only', () => {
  const input = copy(); input.privateEvidence = 'must not reach output'; input.assets[0].privateTicket = 'private'
  const result = validateDemoManifest(input)
  assert.equal(result.valid, true)
  assert.ok(!('privateEvidence' in result.value))
  assert.ok(!('privateTicket' in result.value.assets[0]))
})
test('invalid and non-finite scales are rejected', () => {
  for (const value of [0, -1, Infinity, NaN, '1']) {
    invalid(input => { input.sizes[0].scaleX = value })
    invalid(input => { input.bindings[0].scale = value })
  }
})
test('missing anchor is rejected for every supported size', () => invalid(input => { input.anchors.splice(0, 1) }))
test('binding/model/asset/calibration revisions must match', () => {
  for (const key of ['revision', 'modelRevision', 'assetRevision', 'calibrationRevision']) invalid(input => { input.bindings[0][key] = 'stale-revision' })
  invalid(input => { input.anchors[0].bindingRevision = 'stale-revision' })
})
test('unknown binding and silhouette references are rejected', () => {
  invalid(input => { input.config.silhouetteBindingIds[0] = 'demo-missing-binding' })
  invalid(input => { input.anchors[0].bindingId = 'demo-missing-binding' })
  invalid(input => { input.bindings[1].itemId = 'demo-missing-item' })
  invalid(input => { input.bindings[1].assetId = 'demo-missing-asset' })
})
test('duplicate policies, IDs and composite keys are rejected', () => {
  invalid(input => { input.config.slotPolicies.push(input.config.slotPolicies[0]) })
  for (const collection of ['items', 'assets', 'bindings', 'anchors', 'sizes']) invalid(input => { input[collection].push(clone(input[collection][0])) })
  invalid(input => { input.anchors.push({ ...input.anchors[0], id: 'demo-another-anchor' }) })
})
test('invalid capacity, z-index, rotation, pivot and coordinates are rejected', () => {
  invalid(input => { input.config.slotPolicies[0].maxItems = 0 })
  invalid(input => { input.config.slotPolicies[0].maxItems = 1.2 })
  invalid(input => { input.bindings[0].zIndex = .5 })
  invalid(input => { input.bindings[0].rotationDeg = Infinity })
  invalid(input => { input.bindings[0].pivotX = 1.01 })
  invalid(input => { input.anchors[0].x = -.1 })
})
test('rule schema rejects malformed targets, empty/duplicate/unknown triggers', () => {
  for (const bad of [
    rule('demo-rule-a', [], base), rule('demo-rule-a', [item('mask').id, item('mask').id], base),
    rule('demo-rule-a', ['demo-unknown'], base), rule('demo-rule-a', [item('mask').id], null),
    rule('demo-rule-a', [item('mask').id], 'fixture-demo-missing'),
    { ...rule('demo-rule-a', [item('mask').id], base), effect: 'reject_combination' },
  ]) invalid(input => { input.rules = [bad] })
})
test('same-priority rules that can coexist and target different sizes are rejected', () => {
  invalid(input => { input.rules = [rule('demo-rule-a', [item('mask').id], base), rule('demo-rule-b', [item('hair').id], pkg.sizes[0].code)] })
})
test('capacity-aware rule conflicts: mutually exclusive triggers are accepted, multi-item capacity reveals conflict', () => {
  const input = copy()
  input.rules = [rule('demo-rule-a', [item('mask').id], base), rule('demo-rule-b', [item('mask', 1).id], pkg.sizes[0].code)]
  assert.equal(validateWardrobePackage(input, context).valid, true)
  input.config.slotPolicies.find(value => value.slot === 'mask').maxItems = 2
  assert.equal(validateWardrobePackage(input, context).valid, false)
})
test('same target or different priorities are valid; explicit rejected combinations cannot coexist', () => {
  const input = copy()
  input.rules = [rule('demo-rule-a', [item('mask').id], base), rule('demo-rule-b', [item('hair').id], base)]
  assert.equal(validateWardrobePackage(input, context).valid, true)
  input.rules[1].targetSizeCode = pkg.sizes[0].code; input.rules[1].priority = 20
  assert.equal(validateWardrobePackage(input, context).valid, true)
  input.rules[1].priority = 10
  input.rules.push({ ...rule('demo-rule-reject', [item('mask').id, item('hair').id], null), effect: 'reject_combination' })
  assert.equal(validateWardrobePackage(input, context).valid, true)
})
test('dye schema rejects arbitrary CSS/color payloads and unknown masks', () => {
  for (const color of ['red', '#123', '#12345678', 'url(https://example.invalid)', '#zzzzzz', 1]) assert.equal(validateColor(color).valid, false)
  assert.deepEqual(validateColor('#ABCDEF'), { valid: true, value: '#abcdef' })
  invalid(input => { input.items.find(value => value.dyeRegions.length).dyeRegions[0].maskAssetId = 'demo-unknown-mask' })
  invalid(input => { input.items.find(value => value.dyeRegions.length).dyeRegions[0].allowedColors = ['invalid'] })
  const region = item('cape').dyeRegions[0]
  assert.equal(validateDyeRegion({ ...region, allowedColors: [] }).valid, false)
})
test('full assets default to pending and permission requires explicit evidence', () => {
  const asset = { ...raw.assets[0], kind: 'paper_doll_layer', placeholder: false }
  delete asset.legalStatus
  assert.equal(validateAsset(asset, context).value.legalStatus, 'pending_legal_confirmation')
  assert.equal(validateAsset({ ...asset, legalStatus: 'permission_confirmed' }, context).valid, false)
  assert.equal(validateAsset({ ...asset, legalStatus: 'self_created_placeholder' }, context).valid, false)
  assert.equal(validateDemoManifest({ ...raw, assets: [asset, ...raw.assets.slice(1)] }).valid, false)
})
test('production demo rejects external paths, non-demo identity, missing geometry and undeclared dye tags', () => {
  for (const mutate of [
    value => { value.assets[0].path = 'https://example.invalid/asset.svg' },
    value => { value.items[0].id = 'real-looking-id' },
    value => { value.geometry.pop() },
    value => { value.geometry[0].paths[0].regionId = 'demo-unlisted-region' },
    value => { value.geometry[0].paths[0].d = '<script>bad</script>' },
    value => { value.geometry.push(value.geometry[0]) },
  ]) { const input = copy(); mutate(input); assert.equal(validateDemoManifest(input).valid, false) }
})
test('outfit snapshot validates version, revision, item/slot references and color payloads without derived state', () => {
  const snapshot = { ...initial().selection, catalogVersion: pkg.revision, id: null, name: null, savedAt: null, effectiveSizeCode: 'bad' }
  const result = validateOutfitSnapshot(snapshot, pkg)
  assert.equal(result.valid, true)
  assert.ok(!('effectiveSizeCode' in result.value))
  assert.equal(validateOutfitSnapshot({ ...snapshot, catalogVersion: 'stale' }, pkg).valid, false)
  assert.equal(validateSelection({ ...snapshot, schemaVersion: 2 }, pkg).valid, false)
  assert.equal(validateSelection({ ...snapshot, equippedBySlot: { ...snapshot.equippedBySlot, cape: [item('mask').id] } }, pkg).valid, false)
  assert.equal(validateSelection({ ...snapshot, dyeByItemRegion: { 'demo-unknown': { 'demo-region-panel': '#6599a2' } } }, pkg).valid, false)
})

test('pure equip leaves inputs untouched and changes only the declared slot', () => {
  const state = initial(), original = clone(state)
  const next = equip(state, 'cape')
  assert.deepEqual(state, original)
  assert.deepEqual(next.selection.equippedBySlot.cape, [item('cape').id])
  assert.deepEqual(next.selection.equippedBySlot.hair, [])
  assert.equal(next.issue, null)
})
test('single-slot overflow is rejected; replacement is explicit and removes the named item', () => {
  const state = equip(initial(), 'cape')
  const overflow = equip(state, 'cape', 1)
  assert.equal(overflow.issue, 'capacity_exceeded')
  assert.deepEqual(overflow.selection, state.selection)
  const next = reduce(state, { type: 'replace', slot: 'cape', itemId: item('cape', 1).id, replacedItemId: item('cape').id })
  assert.deepEqual(next.selection.equippedBySlot.cape, [item('cape', 1).id])
})
test('multi-item slot policy permits two distinct items, rejects overflow and validates duplicate restore', () => {
  const input = copy(); input.config.slotPolicies.find(value => value.slot === 'accessory').maxItems = 2
  input.items.push({ ...clone(item('accessory')), id: 'demo-third-accessory' })
  const config = validateWardrobePackage(input, context).value
  let state = createWardrobeState(config, base)
  state = equip(equip(state, 'accessory', 0, config), 'accessory', 1, config)
  assert.equal(state.selection.equippedBySlot.accessory.length, 2)
  const overflow = reduce(state, { type: 'equip', slot: 'accessory', itemId: 'demo-third-accessory' }, config)
  assert.equal(overflow.issue, 'capacity_exceeded')
  assert.deepEqual(overflow.selection, state.selection)
  const replacement = reduce(state, { type: 'replace', slot: 'accessory', itemId: 'demo-third-accessory', replacedItemId: item('accessory').id }, config)
  assert.deepEqual(replacement.selection.equippedBySlot.accessory, ['demo-third-accessory', item('accessory', 1).id])
  const duplicate = { ...state.selection, equippedBySlot: { ...state.selection.equippedBySlot, accessory: [item('accessory').id, item('accessory').id] } }
  assert.equal(validateSelection(duplicate, config).valid, false)
  const over = { ...state.selection, equippedBySlot: { ...state.selection.equippedBySlot, accessory: [...state.selection.equippedBySlot.accessory, 'demo-third'] } }
  assert.equal(validateSelection(over, config).valid, false)
})
test('unequip, reset slot and reset outfit work without clearing other item dyes', () => {
  let state = equip(equip(initial(), 'cape'), 'top')
  const region = item('top').dyeRegions[0]
  state = reduce(state, { type: 'set_dye', itemId: item('top').id, regionId: region.id, color: '#6599a2' })
  const removed = reduce(state, { type: 'unequip', slot: 'cape', itemId: item('cape').id })
  assert.deepEqual(removed.selection.equippedBySlot.cape, [])
  const reset = reduce(state, { type: 'reset_slot', slot: 'cape' })
  assert.deepEqual(reset.selection.dyeByItemRegion[item('top').id], { [region.id]: '#6599a2' })
  assert.deepEqual(reduce(reset, { type: 'reset_outfit' }), initial())
})
test('changing size is explicit, validated and does not lose selected items/dyes', () => {
  const state = equip(initial(), 'cape')
  const next = reduce(state, { type: 'set_base_size', sizeCode: pkg.sizes[0].code })
  assert.equal(next.selection.baseSizeCode, pkg.sizes[0].code)
  assert.equal(next.effectiveSizeCode, pkg.sizes[0].code)
  assert.deepEqual(next.selection.equippedBySlot, state.selection.equippedBySlot)
  assert.equal(reduce(next, { type: 'set_base_size', sizeCode: 'invalid' }).issue, 'invalid_action')
})
test('Q08 override preserves base size and removal restores it after repeated size changes', () => {
  const config = { ...pkg, rules: [rule('demo-rule-small', [item('accessory').id], pkg.sizes[0].code)] }
  let state = createWardrobeState(config, base)
  state = equip(state, 'accessory', 0, config)
  assert.equal(state.selection.baseSizeCode, base)
  assert.equal(state.effectiveSizeCode, pkg.sizes[0].code)
  state = reduce(state, { type: 'set_base_size', sizeCode: pkg.sizes[3].code }, config)
  assert.equal(state.effectiveSizeCode, pkg.sizes[0].code)
  state = reduce(state, { type: 'unequip', slot: 'accessory', itemId: item('accessory').id }, config)
  assert.equal(state.selection.baseSizeCode, pkg.sizes[3].code)
  assert.equal(state.effectiveSizeCode, pkg.sizes[3].code)
})
test('priority and runtime conflicts are deterministic but conflicts reject selection', () => {
  const config = { ...pkg, rules: [rule('demo-rule-z', [item('mask').id], pkg.sizes[0].code), rule('demo-rule-a', [item('hair').id], pkg.sizes[3].code, 20)] }
  let state = equip(equip(createWardrobeState(config, base), 'mask', 0, config), 'hair', 0, config)
  assert.equal(state.effectiveSizeCode, pkg.sizes[3].code)
  state = reduce(state, { type: 'unequip', slot: 'hair', itemId: item('hair').id }, config)
  assert.equal(state.effectiveSizeCode, pkg.sizes[0].code)
  config.rules[1].priority = 10
  const conflict = equip(state, 'hair', 0, config)
  assert.equal(conflict.issue, 'rule_conflict')
  assert.deepEqual(conflict.selection, state.selection)
  const selection = { ...state.selection, equippedBySlot: { ...state.selection.equippedBySlot, hair: [item('hair').id] } }
  const resolved = resolveRules(selection, config)
  assert.equal(resolved.issue, 'rule_conflict')
  assert.equal(resolved.effectiveSizeCode, pkg.sizes[3].code)
})
test('unknown IDs, wrong slots, invalid replace and stale config cannot mutate selection', () => {
  const state = equip(initial(), 'cape')
  for (const action of [
    { type: 'equip', slot: 'cape', itemId: 'demo-unknown' },
    { type: 'equip', slot: 'cape', itemId: item('mask').id },
    { type: 'equip', slot: 'unknown', itemId: item('mask').id },
    { type: 'replace', slot: 'cape', itemId: item('cape', 1).id, replacedItemId: 'unknown' },
    { type: 'unequip', slot: 'cape', itemId: 'unknown' },
  ]) { const next = reduce(state, action); assert.equal(next.issue, 'invalid_action'); assert.deepEqual(next.selection, state.selection) }
  assert.equal(reduce(state, { type: 'reset_outfit' }, { ...pkg, revision: 'changed' }).issue, 'revision_mismatch')
})
test('dye controls validate declared palette and region, then reset region/item colors', () => {
  const state = equip(initial(), 'cape'), region = item('cape').dyeRegions[0]
  const next = reduce(state, { type: 'set_dye', itemId: item('cape').id, regionId: region.id, color: '#6599A2' })
  assert.equal(next.issue, null)
  assert.equal(next.selection.dyeByItemRegion[item('cape').id][region.id], '#6599a2')
  for (const action of [
    { type: 'set_dye', itemId: item('cape').id, regionId: 'bad', color: '#6599a2' },
    { type: 'set_dye', itemId: item('cape').id, regionId: region.id, color: '#ffffff' },
    { type: 'set_dye', itemId: item('cape').id, regionId: region.id, color: 'url(bad)' },
    { type: 'set_dye', itemId: item('cape').id, regionId: region.id, color: null },
    { type: 'set_dye', itemId: item('top').id, regionId: 'demo-region-panel', color: '#6599a2' },
  ]) { const failed = reduce(next, action); assert.equal(failed.issue, 'invalid_dye'); assert.deepEqual(failed.selection, next.selection) }
  assert.deepEqual(reduce(next, { type: 'reset_region', itemId: item('cape').id, regionId: region.id }).selection.dyeByItemRegion, {})
  assert.deepEqual(reduce(next, { type: 'reset_item_colors', itemId: item('cape').id }).selection.dyeByItemRegion, {})
})
test('random outfit is reproducible, legal across seeds, and respects rejected combinations', () => {
  const config = { ...pkg, rules: [{ ...rule('demo-no-pair', [item('mask').id, item('hair').id], null), effect: 'reject_combination' }] }
  for (let seed = 0; seed < 100; seed++) {
    const a = reduce(initial(), { type: 'random_outfit', seed }, config), b = reduce(initial(), { type: 'random_outfit', seed }, config)
    assert.deepEqual(a, b)
    assert.equal(a.issue, null)
    assert.equal(validateSelection(a.selection, config).valid, true)
    for (const ids of Object.values(a.selection.equippedBySlot)) assert.ok(ids.length <= 1)
  }
})

test('renderer orders z-index ascending, splits cape around silhouette, then breaks ties by binding ID', () => {
  const state = equip(equip(initial(), 'cape'), 'top')
  const model = deriveRenderModel(pkg, state.selection, state.effectiveSizeCode)
  assert.deepEqual(model.layers.map(layer => layer.binding.zIndex), [-10, 0, 20, 30])
  assert.equal(model.layers.filter(layer => layer.binding.itemId === item('cape').id).length, 2)
  const config = clone(pkg)
  for (const binding of config.bindings) binding.zIndex = 0
  config.bindings.reverse()
  const ordered = deriveRenderModel(config, state.selection, base).layers.map(layer => layer.binding.id)
  assert.deepEqual(ordered, [...ordered].sort())
})
test('anchor lookup uses effective size and complete revision key, never stale/base fallback', () => {
  const binding = pkg.bindings.find(entry => entry.itemId === item('cape').id)
  assert.equal(findAnchor(pkg, binding, pkg.sizes[0].code).sizeCode, pkg.sizes[0].code)
  assert.equal(findAnchor(pkg, { ...binding, revision: 'old' }, base), undefined)
  assert.equal(findAnchor(pkg, binding, 'missing'), undefined)
  const config = { ...pkg, anchors: pkg.anchors.filter(anchor => anchor.sizeCode !== pkg.sizes[0].code) }
  const state = equip(initial(), 'cape')
  const model = deriveRenderModel(config, state.selection, pkg.sizes[0].code)
  assert.deepEqual(model.layers, [])
  assert.ok(model.warnings.includes('missing_anchor'))
})
test('scale applies exactly once after the local anchor/pivot/rotation transform', () => {
  const state = equip(initial(), 'cape')
  const model = deriveRenderModel(pkg, state.selection, base), layer = model.layers[0]
  const custom = { ...layer, binding: { ...layer.binding, scale: .5, rotationDeg: 90, pivotX: .2, pivotY: .3 }, anchor: { ...layer.anchor, x: .4, y: .6 } }
  const size = { ...model.size, scaleX: .8, scaleY: .7 }
  const point = transformAssetPoint(custom, size, .6, .5)
  assert.ok(Math.abs(point.x - .34) < 1e-12)
  assert.ok(Math.abs(point.y - .83) < 1e-12)
  assert.match(layerTransform(custom), /scale\(0.5\)/)
  assert.match(characterTransform(size), /scale\(0.8 0.7\)/)
  let next = state
  for (let i = 0; i < 30; i++) next = reduce(next, { type: 'set_base_size', sizeCode: pkg.sizes[i % 4].code })
  next = reduce(next, { type: 'set_base_size', sizeCode: base })
  assert.deepEqual(deriveRenderModel(pkg, next.selection, base), model)
})
test('render helpers skip missing assets/model revisions/sizes with explicit warnings', () => {
  const state = equip(initial(), 'cape')
  assert.deepEqual(deriveRenderModel(pkg, state.selection, 'missing').warnings, ['missing_size'])
  assert.ok(deriveRenderModel({ ...pkg, assets: [] }, state.selection, base).warnings.includes('missing_asset'))
  const config = clone(pkg); config.bindings[0].modelRevision = 'old'
  assert.ok(deriveRenderModel(config, state.selection, base).warnings.includes('revision_mismatch'))
})
test('dye affects only declared geometry and missing mask geometry never recolors an entire item', () => {
  let state = equip(initial(), 'cape'), region = item('cape').dyeRegions[0]
  state = reduce(state, { type: 'set_dye', itemId: item('cape').id, regionId: region.id, color: '#b28691' })
  const layer = deriveRenderModel(pkg, state.selection, base).layers.find(entry => entry.binding.itemId === item('cape').id)
  const geometry = new Map(parsed.value.geometry.map(entry => [entry.assetId, entry]))
  const [fabric, trim] = geometry.get(layer.asset.id).paths
  assert.equal(resolveShapeDye(pkg, geometry, layer, fabric, state.selection).color, '#b28691')
  assert.equal(resolveShapeDye(pkg, geometry, layer, trim, state.selection), undefined)
  geometry.delete(region.maskAssetId)
  assert.equal(resolveShapeDye(pkg, geometry, layer, fabric, state.selection), undefined)
  const config = clone(pkg); config.items.find(entry => entry.id === item('cape').id).dyeRegions[0].maskAssetId = null
  assert.equal(regionColor(config, item('cape').id, region.id, state.selection), undefined)
})
