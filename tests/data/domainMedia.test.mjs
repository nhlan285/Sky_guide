import assert from 'node:assert/strict'
import test from 'node:test'
import { legacyItemDeliveryPath, publicMedia, validateMediaRecord } from '../../src/data/domain/media.ts'
import { resolveMediaDelivery } from '../../src/server/mediaDelivery.ts'

// Synthetic metadata only; no media downloaded, copied, uploaded or published.
const hash = 'a'.repeat(64)
const media = () => ({ id: 'fixture-media', revision: 1, storageKey: `items/cards/${hash}.webp`, sha256: hash, bytes: 123,
  mimeType: 'image/webp', role: 'itemImage', sourceUrl: 'https://fixture.invalid/source', sourceType: 'selfCreated', sourceRole: 'explicit item image',
  sourceRevision: 'fixture-r1', fetchedAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z', provenanceIds: ['fixture-provenance'],
  relations: [{ kind: 'item', id: 'fixture-item' }], credit: 'Synthetic test only', rightsStatus: 'verified', approvedRevision: 1,
  publicEvidenceUrl: 'https://fixture.invalid/evidence', fixture: false })
const validate = value => validateMediaRecord(value, new Set(['fixture-provenance']), [{ kind: 'item', id: 'fixture-item' }, { kind: 'call', id: 'fixture-call' }])
const none = () => ({ ids: new Set(), hashes: new Set() })

test('registry preserves legacy R2 key and public route without making delivery URL identity', () => {
  const value = validate(media())
  assert.equal(value.valid, true)
  assert.equal(legacyItemDeliveryPath(value.value), `/assets/items/cards/${hash}.webp`)
  assert.equal(validate({ ...media(), storageKey: `media/${hash}.webp` }).valid, true)
})

test('invalid key, MIME, revision, evidence and relation inputs fail closed', () => {
  for (const change of [
    { storageKey: '../../secret' }, { storageKey: 'https://fixture.invalid/image.webp' },
    { storageKey: `media/${'b'.repeat(64)}.webp` }, { role: 'callVideo' }, { revision: 2 },
    { approvedRevision: null }, { publicEvidenceUrl: null }, { publicEvidenceUrl: 'file:///private' },
    { bytes: -1 }, { sha256: 'not-a-hash' }, { provenanceIds: ['missing'] },
    { relations: [] }, { relations: [{ kind: 'item', id: 'missing' }] },
    { sourceUrl: 'https://user:secret@fixture.invalid/source' },
    { fetchedAt: '2026-10-06T00:00:00Z' },
  ]) assert.equal(validate({ ...media(), ...change }).valid, false)
})

test('public projection strips private evidence and denies uncertain/revoked/fixture media', () => {
  const input = { ...media(), privateEvidenceRef: 'PRIVATE_SENTINEL', signedUrl: 'PRIVATE_SENTINEL' }
  const parsed = validate(input).value
  assert.equal(JSON.stringify(publicMedia(parsed, none())).includes('PRIVATE_SENTINEL'), false)
  for (const rightsStatus of ['unknown', 'restricted', 'revoked']) assert.equal(publicMedia({ ...parsed, rightsStatus }, none()), null)
  assert.equal(publicMedia({ ...parsed, fixture: true }, none()), null)
  assert.equal(publicMedia(parsed, { ids: new Set([parsed.id]), hashes: new Set() }), null)
  assert.equal(publicMedia(parsed, { ids: new Set(), hashes: new Set([hash]) }), null)
})

test('Call audio has explicit domain role and survives metadata projection', () => {
  const input = { ...media(), mimeType: 'audio/ogg', role: 'callAudio', storageKey: `media/${hash}.ogg`, relations: [{ kind: 'call', id: 'fixture-call' }] }
  const parsed = validate(input)
  assert.equal(parsed.valid, true)
  assert.equal(publicMedia(parsed.value, none()).role, 'callAudio')
  assert.equal(legacyItemDeliveryPath(parsed.value), null)
})

test('provider swap keeps identity stable and denies expired/unsafe delivery', async () => {
  const value = validate(media()).value
  const registry = { current: async () => none() }
  const now = () => Date.parse('2026-10-04T01:00:00Z')
  const store = hostname => ({ resolveDelivery: async key => ({ url: `https://${hostname}/${key}`, expiresAt: '2026-10-04T02:00:00Z' }) })
  const first = await resolveMediaDelivery(value, store('a.fixture.invalid'), registry, now)
  const second = await resolveMediaDelivery(value, store('b.fixture.invalid'), registry, now)
  assert.deepEqual(first.media, second.media)
  assert.notEqual(first.delivery.url, second.delivery.url)
  assert.equal(first.cacheControl, 'no-store')
  for (const delivery of [{ url: 'javascript:alert(1)', expiresAt: null }, { url: 'https://fixture.invalid/file', expiresAt: '2026-10-04T00:00:00Z' }, { url: 'https://fixture.invalid/file', expiresAt: 'bad' }]) {
    assert.equal(await resolveMediaDelivery(value, { resolveDelivery: async () => delivery }, registry, now), null)
  }
})

test('latest revocation overlay prevents rollback resurrection and signing races', async () => {
  let calls = 0
  const value = validate(media()).value
  const revoked = { ids: new Set(), hashes: new Set([hash]) }
  const storage = { resolveDelivery: async () => { calls++; return { url: 'https://fixture.invalid/file', expiresAt: null } } }
  assert.equal(await resolveMediaDelivery(value, storage, { current: async () => revoked }), null)
  assert.equal(calls, 0)
  let reads = 0
  assert.equal(await resolveMediaDelivery(value, storage, { current: async () => ++reads === 1 ? none() : revoked }), null)
  assert.equal(calls, 1)
  assert.equal(await resolveMediaDelivery(value, storage, { current: async () => { throw new Error('private failure') } }), null)
})
