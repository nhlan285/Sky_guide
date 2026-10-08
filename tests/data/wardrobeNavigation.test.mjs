import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL, URLSearchParams } from 'node:url'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { createWardrobeState, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { createWardrobeDraft } from '../../src/features/wardrobe/draft.ts'
import { wardrobeItemIntent, wardrobeItemUrl, wasWardrobeIntentApplied } from '../../src/features/wardrobe/navigation.ts'

const pkg = validateDemoManifest(JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8'))).value
const initial = () => createWardrobeState(pkg, pkg.sizes[0].code)

test('document draft restores unsaved selections/dye/base size without creating durable data', () => {
  const session = createWardrobeDraft()
  let state = wardrobeReducer(initial(), { type: 'random_outfit', seed: 27 }, pkg)
  const cape = pkg.items.find(item => item.id === state.selection.equippedBySlot.cape[0])
  const region = cape.dyeRegions[0]
  state = wardrobeReducer(state, { type: 'set_dye', itemId: cape.id, regionId: region.id, color: region.allowedColors[1] }, pkg)
  assert.equal(session.write(state.selection, pkg), true)
  const returning = wardrobeReducer(initial(), { type: 'restore_outfit', snapshot: session.read(pkg) }, pkg)
  assert.deepEqual(returning.selection, state.selection)
  assert.equal(session.read(pkg).id, null)
  assert.equal(createWardrobeDraft().read(pkg), null, 'new document has no memory draft')
})

test('draft is isolated from mutations, rejects invalid writes and incompatible packages', () => {
  const session = createWardrobeDraft()
  const selection = initial().selection
  assert.equal(session.write(selection, pkg), true)
  selection.baseSizeCode = 'modified'
  const stored = session.read(pkg)
  stored.baseSizeCode = 'modified again'
  assert.equal(session.read(pkg).baseSizeCode, pkg.sizes[0].code)
  assert.equal(session.write({}, pkg), false)
  assert.equal(session.read(pkg).baseSizeCode, pkg.sizes[0].code)
  assert.equal(session.read({ ...pkg, revision: 'changed' }), null)
  assert.equal(session.read({ ...pkg, id: 'another-package' }), null)
})

test('item round-trip preserves lookup filters/page and never accepts arbitrary return paths', () => {
  const search = '?q=rose+cape&category=cosmetic&slot=cape&season=season-a&spirit=spirit-b&acquisition=shop&page=3&returnUrl=https%3A%2F%2Fevil.example&token=PRIVATE'
  const target = new URL(wardrobeItemUrl('item:a / b', search), 'https://sky.example')
  const intent = wardrobeItemIntent(target.search)
  assert.equal(intent.requested, true)
  assert.equal(intent.id, 'item:a / b')
  const back = new URL(intent.returnUrl, target.origin)
  assert.equal(back.origin, 'https://sky.example')
  assert.equal(back.pathname, '/items/item%3Aa%20%2F%20b')
  for (const key of ['q', 'category', 'slot', 'season', 'spirit', 'acquisition', 'page']) assert.equal(back.searchParams.get(key), new URLSearchParams(search).get(key))
  assert.equal(back.searchParams.has('returnUrl'), false)
  assert.equal(back.searchParams.has('token'), false)
  assert.equal(back.searchParams.has('item'), false)
})

test('missing and excessive item intents recover to the contextual item list', () => {
  assert.equal(wardrobeItemIntent('?q=cape').requested, false)
  for (const value of ['', ' ', 'x'.repeat(201)]) {
    const intent = wardrobeItemIntent('?q=cape&item=' + encodeURIComponent(value))
    assert.equal(intent.id, null)
    assert.equal(intent.returnUrl, '/items?q=cape')
  }
})

test('consumed lookup navigation survives reload without consuming fresh or different item actions', () => {
  const id = 'tsa-cosmetic-1011'
  assert.equal(wasWardrobeIntentApplied({ wardrobeAppliedItem: id }, id), true)
  for (const state of [null, {}, [], { wardrobeAppliedItem: 'tsa-cosmetic-1012' }, { item: id }]) {
    assert.equal(wasWardrobeIntentApplied(state, id), false)
  }
  assert.equal(wasWardrobeIntentApplied({ wardrobeAppliedItem: null }, null), false)
})
