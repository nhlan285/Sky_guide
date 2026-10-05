import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL } from 'node:url'
import { createSnapshotRepository } from '../../src/server/domainSnapshot.ts'
import { createDomainApi } from '../../src/server/domainApi.ts'

// Existing checked-in public release, never network/cloud data.
const root = new URL('../../data/public/tsa-v1-74007cf878ef/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'))
const files = new Map(Object.values({ ...manifest.datasets, provenance: manifest.provenance }).map(entry => [entry.path, readFileSync(new URL(entry.path, root), 'utf8')]))
const freshness = { health: 'healthy', lastSuccessAt: '2026-10-04T00:00:00Z', validUntil: '2026-10-05T00:00:00Z' }
const now = () => Date.parse('2026-10-04T01:00:00Z')
const repository = createSnapshotRepository({ manifest, files }, freshness)
const api = createDomainApi(repository, now)
const get = path => api(new globalThis.Request(`https://fixture.invalid${path}`))

test('read facade paginates stable identities and pins every following page', async () => {
  const response = await get('/api/items?limit=2')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  const first = await response.json()
  assert.equal(first.page.total, 1808)
  assert.equal(first.page.nextOffset, 2)
  const next = await (await get(`/api/items?limit=2&offset=2&version=${first.catalogVersion}`)).json()
  assert.equal(new Set([...first.data, ...next.data].map(item => item.id)).size, 4)
  assert.equal((await get('/api/items?offset=2')).status, 400)
  assert.equal((await get('/api/items?version=old-release')).status, 409)
  assert.equal((await get('/api/items/tsa-cosmetic-1211?version=old-release')).status, 409)
})

test('filters/details retain existing costs and distinguish empty/not-found/unavailable', async () => {
  const item = await (await get('/api/items/tsa-cosmetic-1211')).json()
  assert.equal(item.data.id, 'tsa-cosmetic-1211')
  assert.equal(item.data.acquisitionOptions.find(option => option.costs[0]?.sourceCurrencyLabel === 'candles').costs[0].amount, 45)
  const result = await (await get('/api/items?slot=hair&season=tsa-season-11&spirit=tsa-spirit-115&q=Anxious')).json()
  assert.ok(result.data.some(record => record.id === item.data.id))
  const empty = await (await get('/api/items?q=no-such-fixture-name')).json()
  assert.deepEqual(empty.data, [])
  assert.equal((await get('/api/items/missing')).status, 404)
  assert.equal((await get('/api/events/live')).status, 503)
  const spirits = await (await get('/api/spirits?limit=1')).json()
  assert.equal(spirits.page.total, 213)
  assert.equal((await get(`/api/spirits/${spirits.data[0].id}`)).status, 200)
})

test('invalid queries and methods never reach a provider', async () => {
  let calls = 0
  const never = createDomainApi({ readCatalog: async () => { calls++; throw new Error('private provider error') } })
  for (const path of ['/api/items?limit=0', '/api/items?limit=101', '/api/items?offset=-1', '/api/items?limit=1&limit=2', '/api/items?slot=invalid', '/api/items?sql=private', '/api/items/%FF', '/api/items/a%2Fb', '/api/spirits?spirit=bad']) {
    assert.equal((await never(new globalThis.Request(`https://fixture.invalid${path}`))).status, 400)
  }
  assert.equal((await never(new globalThis.Request('https://fixture.invalid/api/items', { method: 'POST' }))).status, 405)
  assert.equal(calls, 0)
  const failure = await never(new globalThis.Request('https://fixture.invalid/api/items'))
  assert.equal(failure.status, 503)
  assert.equal((await failure.text()).includes('private'), false)
})

test('public snapshot hashes and publication boundary fail closed', () => {
  const changed = new Map(files)
  changed.set('items.json', `${changed.get('items.json')} `)
  assert.throws(() => createSnapshotRepository({ manifest, files: changed }, freshness), /checksum/)
  for (const mutation of [value => { value.records[0].fixture = true }, value => { value.records[0].recordStatus = 'draft' }]) {
    const altered = JSON.parse(files.get('items.json')); mutation(altered)
    const text = JSON.stringify(altered)
    const alteredFiles = new Map(files); alteredFiles.set('items.json', text)
    const alteredManifest = globalThis.structuredClone(manifest)
    alteredManifest.datasets.items.sha256 = createHash('sha256').update(text).digest('hex')
    assert.throws(() => createSnapshotRepository({ manifest: alteredManifest, files: alteredFiles }, freshness), /Invalid public snapshot/)
  }
})

test('snapshot adapter is immutable and public responses exclude operational fields', async () => {
  const first = await repository.readCatalog()
  first.catalog.entries[0].item.name.default = 'mutated'
  assert.notEqual((await repository.readCatalog()).catalog.entries[0].item.name.default, 'mutated')
  const adapter = { readCatalog: async () => {
    const value = await repository.readCatalog()
    value.catalog.entries[0].item.privateEvidence = 'PRIVATE_SENTINEL'
    value.catalog.provenance[0].sourceRecordKey = 'PRIVATE_SENTINEL'
    return value
  } }
  const output = await createDomainApi(adapter, now)(new globalThis.Request('https://fixture.invalid/api/items'))
  assert.equal((await output.text()).includes('PRIVATE_SENTINEL'), false)
})

test('adapter substitution preserves response contract and stale/offline LKG labels', async () => {
  const alternate = { readCatalog: async () => globalThis.structuredClone(await repository.readCatalog()) }
  const request = () => new globalThis.Request('https://fixture.invalid/api/items?limit=1')
  assert.deepEqual(await (await createDomainApi(alternate, now)(request())).json(), await (await api(request())).json())
  for (const health of ['healthy', 'offline']) {
    const lkg = createSnapshotRepository({ manifest, files }, { ...freshness, health, validUntil: null })
    const result = await (await createDomainApi(lkg, now)(request())).json()
    assert.equal(result.freshness.health, health === 'offline' ? 'offline' : 'stale')
    assert.equal(result.data.length, 1)
  }
  const missing = createDomainApi({ readCatalog: async () => null }, now)
  assert.equal((await missing(request())).status, 503)
})
