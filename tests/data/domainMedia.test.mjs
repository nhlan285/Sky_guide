import assert from 'node:assert/strict'
import test from 'node:test'
import { legacyItemDeliveryPath, publicMedia, roleOwners, validateMediaBindings, validateMediaRecord } from '../../src/data/domain/media.ts'
import { resolveMediaDelivery } from '../../src/server/mediaDelivery.ts'

// Synthetic metadata only; no media downloaded, copied, uploaded or published.
const hash = 'a'.repeat(64)
const media = () => ({ id: 'fixture-media', revision: 1, storageKey: `items/cards/${hash}.webp`, sha256: hash, bytes: 123,
  mimeType: 'image/webp', sourceUrl: 'https://fixture.invalid/source', sourceType: 'selfCreated', sourceRole: 'explicit source label',
  sourceRevision: 'fixture-r1', fetchedAt: '2026-10-04T00:00:00Z', updatedAt: '2026-10-04T00:00:00Z', provenanceIds: ['fixture-provenance'],
  credit: 'Synthetic test only', rightsStatus: 'verified', approvedRevision: 1,
  publicEvidenceUrl: 'https://fixture.invalid/evidence', fixture: false })
const provenance = new Set(['fixture-provenance', 'fixture-role-evidence'])
const owners = ['item', 'emote', 'call', 'sampleSet', 'event', 'instrument', 'spirit', 'season', 'location'].map(kind => ({ kind, id: `fixture-${kind}` }))
const validate = value => validateMediaRecord(value, provenance)
const binding = (role = 'itemImage', ownerKind = 'item', mediaId = 'fixture-media') => ({ ownerKind, ownerId: `fixture-${ownerKind}`, mediaId, role, provenanceIds: ['fixture-role-evidence'] })
const bindings = (values, records = [validate(media()).value]) => validateMediaBindings(values, records, owners, provenance)
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
    { storageKey: `media/${'b'.repeat(64)}.webp` }, { revision: 2 },
    { approvedRevision: null }, { publicEvidenceUrl: null }, { publicEvidenceUrl: 'file:///private' },
    { bytes: -1 }, { sha256: 'not-a-hash' }, { provenanceIds: ['missing'] },
    { sourceUrl: 'https://user:secret@fixture.invalid/source' },
    { fetchedAt: '2026-10-06T00:00:00Z' },
    { fetchedAt: '2099-10-06T00:00:00,1Z' },
    { fetchedAt: '2026-10-04T00:00:00.0001Z' },
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

test('Call audio role belongs to binding while binary identity survives projection', () => {
  const input = { ...media(), mimeType: 'audio/ogg', storageKey: `media/${hash}.ogg` }
  const parsed = validate(input)
  assert.equal(parsed.valid, true)
  assert.equal(bindings([binding('callAudio', 'call')], [parsed.value]).valid, true)
  assert.equal(Object.hasOwn(publicMedia(parsed.value, none()), 'role'), false)
  assert.equal(legacyItemDeliveryPath(parsed.value), null)
})

test('one binary can have independent valid roles/owners without changing identity', () => {
  assert.equal(bindings([binding(), binding('poster', 'emote'), binding('referenceImage')]).valid, false)
  const parsed = bindings([binding(), binding('poster', 'emote')])
  assert.equal(parsed.valid, true)
  assert.equal(parsed.value[0].mediaId, parsed.value[1].mediaId)
  const input = { ...media(), role: 'poster', relations: [{ kind: 'event', id: 'fixture-event' }] }
  const record = validate(input).value
  assert.equal(Object.hasOwn(record, 'role'), false)
  assert.equal(Object.hasOwn(record, 'relations'), false)
})

test('duplicate bindings and a second canonical image fail; multiple distinct references succeed', () => {
  const second = validate({ ...media(), id: 'fixture-media-b', sha256: 'b'.repeat(64), storageKey: `media/${'b'.repeat(64)}.webp` }).value
  const third = validate({ ...media(), id: 'fixture-media-c', sha256: 'c'.repeat(64), storageKey: `media/${'c'.repeat(64)}.webp` }).value
  const records = [validate(media()).value, second, third]
  assert.equal(bindings([binding(), binding()], records).valid, false)
  assert.equal(bindings([binding(), binding('itemImage', 'item', second.id)], records).valid, false)
  assert.equal(bindings([binding(), binding('referenceImage', 'item', second.id), binding('referenceImage', 'item', third.id)], records).valid, true)
  assert.equal(bindings([binding('referenceImage')], records).valid, true)
  assert.equal(bindings([binding('referenceImage'), binding()], records).valid, false)
  const alias = { ...records[0], id: 'fixture-media-alias' }
  assert.equal(bindings([binding(), binding('referenceImage', 'item', alias.id)], [...records, alias]).valid, false)
  assert.equal(bindings([binding('referenceImage'), binding('referenceImage', 'item', alias.id)], [...records, alias]).valid, false)
})

test('all semantic roles enforce their owner set and MIME independently', () => {
  for (const [role, ownerKind, mimeType, extension, wrongOwner] of [
    ['callAudio', 'call', 'audio/ogg', 'ogg', 'item'],
    ['callVideo', 'call', 'video/mp4', 'mp4', 'emote'],
    ['emoteVideo', 'emote', 'video/mp4', 'mp4', 'call'],
    ['musicSample', 'sampleSet', 'audio/wav', 'wav', 'call'],
    ['itemImage', 'item', 'image/webp', 'webp', 'emote'],
    ['referenceImage', 'item', 'image/webp', 'webp', 'call'],
  ]) {
    const record = validate({ ...media(), mimeType, storageKey: `media/${hash}.${extension}` }).value
    assert.equal(bindings([binding(role, ownerKind)], [record]).valid, true)
    assert.equal(bindings([binding(role, wrongOwner)], [record]).valid, false)
    const wrongMime = role.endsWith('Image') ? { ...record, mimeType: 'audio/ogg' } : { ...record, mimeType: 'image/webp' }
    assert.equal(bindings([binding(role, ownerKind)], [wrongMime]).valid, false)
  }
})

test('poster explicitly allows item/emote/call and excludes all other domain owners', () => {
  assert.deepEqual(roleOwners.poster, ['item', 'emote', 'call'])
  for (const { kind } of owners) assert.equal(bindings([binding('poster', kind)]).valid, ['item', 'emote', 'call'].includes(kind))
})

test('binding requires resolvable owner/media, distinct role evidence and strips private fields', () => {
  for (const change of [{ ownerId: 'missing' }, { mediaId: 'missing' }, { provenanceIds: [] }, { provenanceIds: ['missing'] }, { provenanceIds: ['fixture-role-evidence', 'fixture-role-evidence'] }]) {
    assert.equal(bindings([{ ...binding(), ...change }]).valid, false)
  }
  const parsed = bindings([{ ...binding(), reviewerRef: 'PRIVATE_SENTINEL', privateEvidenceRef: 'PRIVATE_SENTINEL' }])
  assert.equal(parsed.valid, true)
  assert.equal(JSON.stringify(parsed.value).includes('PRIVATE_SENTINEL'), false)
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
  for (const delivery of [{ url: 'javascript:alert(1)', expiresAt: null }, { url: 'https://fixture.invalid/file', expiresAt: '2026-10-04T00:00:00Z' }, { url: 'https://fixture.invalid/file', expiresAt: 'bad' }, { url: 'https://fixture.invalid/file', expiresAt: '2026-10-04T00:00:00,1Z' }]) {
    assert.equal(await resolveMediaDelivery(value, { resolveDelivery: async () => delivery }, registry, now), null)
  }
  assert.ok(await resolveMediaDelivery(value,{resolveDelivery:async()=>({url:'https://fixture.invalid/file',expiresAt:'2026-10-04T01:00:00.0001Z'})},registry,now))
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
