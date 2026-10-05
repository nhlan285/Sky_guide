import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { Buffer } from 'node:buffer'
import { gzipSync, gunzipSync } from 'node:zlib'
import { validateDemoManifest } from '../../src/features/wardrobe/demo/validation.ts'
import { createWardrobeState, wardrobeReducer } from '../../src/features/wardrobe/engine.ts'
import { decodeOutfitShare, encodeOutfitShare, MAX_SHARE_BYTES, MAX_SHARE_FRAGMENT, outfitShareUrl } from '../../src/features/wardrobe/share.ts'

const pkg = validateDemoManifest(JSON.parse(readFileSync(new URL('../../src/features/wardrobe/demo/manifest.json', import.meta.url), 'utf8'))).value
const initial = () => createWardrobeState(pkg, pkg.sizes[0].code)
const fragment = value => '#outfit=v1.' + gzipSync(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url')
const payload = () => ({ ...initial().selection, catalogVersion: pkg.revision })

test('share survives blank-session decode and reducer restore with nondefault dye/base size', async () => {
  let state = wardrobeReducer(initial(), { type: 'random_outfit', seed: 17 }, pkg)
  const cape = pkg.items.find(item => item.id === state.selection.equippedBySlot.cape[0])
  const region = cape.dyeRegions.find(region => region.allowedColors?.length)
  state = wardrobeReducer(state, { type: 'set_dye', itemId: cape.id, regionId: region.id, color: region.allowedColors[0] }, pkg)
  const encoded = await encodeOutfitShare(state.selection, pkg)
  assert.equal(encoded.ok, true)
  assert.ok(encoded.value.length < MAX_SHARE_FRAGMENT)
  const decoded = await decodeOutfitShare(encoded.value, pkg)
  assert.equal(decoded.ok, true)
  const restored = wardrobeReducer(initial(), { type: 'restore_outfit', snapshot: decoded.value }, pkg)
  assert.deepEqual(restored.selection, state.selection)
  assert.equal(restored.effectiveSizeCode, state.effectiveSizeCode)
  assert.equal(restored.issue, null)
})

test('share projection never carries local IDs, names, timestamps, effective state or private fields', async () => {
  const result = await encodeOutfitShare({ ...payload(), id: 'PRIVATE', name: 'PRIVATE', savedAt: 'PRIVATE', privateQr: 'PRIVATE', effectiveSizeCode: 'PRIVATE', assetUrl: 'https://PRIVATE' }, pkg)
  assert.equal(result.ok, true)
  const json = gunzipSync(Buffer.from(result.value.split('.')[1], 'base64url')).toString()
  assert.equal(json.includes('PRIVATE'), false)
  const decoded = await decodeOutfitShare(fragment({ ...payload(), privateQr: 'PRIVATE', id: 'PRIVATE', name: 'PRIVATE', savedAt: 'PRIVATE' }), pkg)
  assert.equal(decoded.ok, true)
  assert.equal(JSON.stringify(decoded.value).includes('PRIVATE'), false)
})

test('malformed transport, truncated gzip, invalid UTF8 and JSON fail safely', async () => {
  for (const value of ['', '#main-content', '#outfit=v1.', '#outfit=v1.%2B', '#outfit=v1.a', '#outfit=v1.AAA', fragment('not json'), fragment('null'), fragment('[]'), '#outfit=v1.' + gzipSync(Buffer.from([0xff, 0xfe])).toString('base64url')]) {
    assert.equal((await decodeOutfitShare(value, pkg)).ok, false, value)
  }
  const good = fragment(payload())
  assert.equal((await decodeOutfitShare(good.slice(0, -4), pkg)).ok, false)
  assert.equal((await decodeOutfitShare(good + '=', pkg)).ok, false)
})

test('schema/transport/package versions and unsupported IDs/dye never apply', async () => {
  assert.equal((await decodeOutfitShare('#outfit=v2.abc', pkg)).issue, 'version')
  for (const mutate of [v => { v.schemaVersion = 99 }, v => { v.catalogVersion = 'future' }, v => { v.baseSizeCode = 'missing' }, v => { v.equippedBySlot.cape = ['https://untrusted.example/asset'] }, v => { v.dyeByItemRegion = { unknown: { region: '#ffffff' } } }]) {
    const value = payload(); mutate(value)
    assert.equal((await decodeOutfitShare(fragment(value), pkg)).ok, false)
  }
  assert.equal((await encodeOutfitShare({}, pkg)).issue, 'invalid')
})

test('compressed input and decompressed output are bounded before parsing', async () => {
  assert.equal((await decodeOutfitShare('#outfit=v1.' + 'A'.repeat(MAX_SHARE_FRAGMENT), pkg)).issue, 'too_large')
  const bomb = fragment(' '.repeat(MAX_SHARE_BYTES + 1))
  assert.ok(bomb.length < MAX_SHARE_FRAGMENT)
  assert.equal((await decodeOutfitShare(bomb, pkg)).issue, 'too_large')
})

test('empty outfit is shareable and URL strips unrelated query/path while preserving fragment', async () => {
  const encoded = await encodeOutfitShare(initial().selection, pkg)
  assert.equal(encoded.ok, true)
  assert.equal((await decodeOutfitShare(encoded.value, pkg)).ok, true)
  assert.equal(outfitShareUrl('https://sky.example/private?token=PRIVATE', encoded.value), `https://sky.example/wardrobe${encoded.value}`)
  for (const origin of ['javascript:alert(1)', 'file:///private', 'https://user:password@sky.example', 'invalid']) assert.equal(outfitShareUrl(origin, encoded.value), null)
})

test('unavailable compression APIs return a recoverable issue', async () => {
  const compression = globalThis.CompressionStream
  const decompression = globalThis.DecompressionStream
  try {
    globalThis.CompressionStream = undefined
    globalThis.DecompressionStream = undefined
    assert.equal((await encodeOutfitShare(initial().selection, pkg)).issue, 'unsupported')
    assert.equal((await decodeOutfitShare(fragment(payload()), pkg)).issue, 'unsupported')
  } finally {
    globalThis.CompressionStream = compression
    globalThis.DecompressionStream = decompression
  }
})
