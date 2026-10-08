import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { createWardrobeState, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { encodeOutfitBackup, MAX_BACKUP_BYTES, parseOutfitBackup } from '../../src/features/wardrobe/backup.ts'
import { createOutfitStorage, outfitStorageKey } from '../../src/features/wardrobe/persistence.ts'

const pkg = validateDemoManifest(JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8'))).value
const selected = () => wardrobeReducer(createWardrobeState(pkg, 'fixture-demo-size-3'), { type: 'equip', slot: 'mask', itemId: 'demo-item-mask-tile' }, pkg)
const library = () => ({ outfits: [{ ...selected().selection, catalogVersion: pkg.revision, id: 'fixture-saved', name: 'Synthetic saved outfit', savedAt: '2026-01-01T00:00:00Z' }], lastOutfitId: 'fixture-saved' })
const envelope = () => JSON.parse(encodeOutfitBackup(library(), pkg).value)
const parse = value => parseOutfitBackup(JSON.stringify(value), pkg)
const storage = () => { const values = new Map(); return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) } }

test('backup roundtrip projects only outfit fields, keeps chosen base and recomputes rule', () => {
  const input = library(), before = globalThis.structuredClone(input)
  input.qrRaw = 'private-sentinel'; input.outfits[0].effectiveSizeCode = 'do-not-store'
  const encoded = encodeOutfitBackup(input, pkg); assert.equal(encoded.valid, true)
  assert.equal(encoded.value.includes('private-sentinel'), false); assert.equal(encoded.value.includes('effectiveSizeCode'), false)
  const decoded = parseOutfitBackup(encoded.value, pkg); assert.equal(decoded.valid, true); assert.deepEqual(decoded.value, before)
  assert.equal(input.qrRaw, 'private-sentinel')
  const restored = wardrobeReducer(createWardrobeState(pkg, pkg.sizes[1].code), { type: 'restore_outfit', snapshot: decoded.value.outfits[0] }, pkg)
  assert.equal(restored.selection.baseSizeCode, 'fixture-demo-size-3'); assert.equal(restored.effectiveSizeCode, 'fixture-demo-size-0')
})

test('compatible r1 backup preserves all identities; mixed revisions and unrelated versions reject', () => {
  const input = envelope(); input.packageRevision = 'demo-wardrobe-v1-r1'; input.library.outfits[0].catalogVersion = input.packageRevision
  const before = globalThis.structuredClone(input), result = parse(input)
  assert.equal(result.valid, true); assert.equal(result.value.outfits[0].catalogVersion, pkg.revision); assert.deepEqual(input, before)
  input.library.outfits[0].catalogVersion = pkg.revision; assert.equal(parse(input).valid, false)
  for (const revision of ['future', 'demo-wardrobe-v1-r0']) { input.packageRevision = revision; assert.equal(parse(input).valid, false) }
})

test('invalid format/schema/package, record references and duplicate entries reject whole import', () => {
  for (const change of [{ format: 'localStorage' }, { schemaVersion: 2 }, { packageId: 'another-package' }, { library: null }]) assert.equal(parse({ ...envelope(), ...change }).valid, false)
  for (const mutate of [value => { value.library.outfits[0].equippedBySlot.mask = ['unknown'] }, value => { value.library.outfits.push(value.library.outfits[0]) }, value => { value.library.lastOutfitId = 'absent' }]) {
    const value = envelope(); mutate(value); assert.equal(parse(value).valid, false)
  }
  assert.equal(parseOutfitBackup('private-sentinel()', pkg).valid, false)
  assert.equal(JSON.stringify(parseOutfitBackup('private-sentinel()', pkg)).includes('private-sentinel'), false)
})

test('character and UTF-8 byte limits reject large inputs; export limit includes unicode expansion', () => {
  for (const input of [null, '', 'x'.repeat(MAX_BACKUP_BYTES + 1), '😀'.repeat(MAX_BACKUP_BYTES / 3)]) assert.equal(parseOutfitBackup(input, pkg).valid, false)
  const large = library(); large.outfits = Array.from({ length: 50 }, (_, i) => ({ ...large.outfits[0], id: `fixture-${i}-${'漢'.repeat(600)}`, name: '漢'.repeat(80) })); large.lastOutfitId = large.outfits[0].id
  assert.equal(encodeOutfitBackup(large, pkg).valid, false)
})

test('validation and preview do not write; invalid import leaves stored library untouched', () => {
  const local = storage(), store = createOutfitStorage(pkg, () => local), original = library()
  store.write(original); const raw = local.getItem(outfitStorageKey(pkg))
  const incoming = envelope(); incoming.library.outfits[0].name = 'Incoming synthetic outfit'
  const parsed = parse(incoming); assert.equal(parsed.valid, true)
  assert.equal(local.getItem(outfitStorageKey(pkg)), raw); assert.deepEqual(store.read().value, original)
  const bad = parse({ ...incoming, packageId: 'other' }); assert.equal(bad.valid, false)
  assert.equal(local.getItem(outfitStorageKey(pkg)), raw)
  assert.equal(store.write(parsed.value).issue, null); assert.deepEqual(store.read().value, parsed.value)
})

test('confirmed library reset keeps draft and other storage keys; future and quota import preserve raw data', () => {
  const local = storage(), store = createOutfitStorage(pkg, () => local), state = selected(), before = globalThis.structuredClone(state)
  local.setItem('fixture-preference', 'unchanged'); store.write(library())
  assert.deepEqual(store.reset().value, { outfits: [], lastOutfitId: null })
  assert.equal(local.getItem('fixture-preference'), 'unchanged'); assert.deepEqual(state, before)
  const key = outfitStorageKey(pkg), future = JSON.stringify({ version: 2, value: 'private future state' })
  local.setItem(key, future); const protectedStore = createOutfitStorage(pkg, () => local)
  assert.equal(protectedStore.write(parse(envelope()).value).issue, 'future_version'); assert.equal(local.getItem(key), future)
  const quotaLocal = storage(); const oldStore = createOutfitStorage(pkg, () => quotaLocal); oldStore.write(library())
  const raw = quotaLocal.getItem(key), denied = createOutfitStorage(pkg, () => ({ ...quotaLocal, setItem: () => { throw new Error('quota') } }))
  assert.equal(denied.write(parse(envelope()).value).issue, 'write_failed'); assert.equal(quotaLocal.getItem(key), raw)
})
