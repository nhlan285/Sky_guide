import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { stageSourceSnapshot, promoteReviewedSnapshot, recordSourceFailure } from '../../src/server/sourceSync.ts'
import { canonicalizeSnapshotFiles, createSnapshotRepository } from '../../src/server/domainSnapshot.ts'
import { createDomainApi } from '../../src/server/domainApi.ts'

const root = new URL('../../data/public/tsa-v1-74007cf878ef/', import.meta.url)
const manifest = JSON.parse(readFileSync(new URL('manifest.json', root), 'utf8'))
const files = new Map(Object.values({ ...manifest.datasets, provenance: manifest.provenance }).map(entry => [entry.path, readFileSync(new URL(entry.path, root), 'utf8')]))
const freshness = { health: 'healthy', lastSuccessAt: '2026-10-04T00:00:00Z', validUntil: null }
const catalog = (await createSnapshotRepository({ manifest, files }, freshness).readCatalog()).catalog
const identities = []
const relations = []
for (const [kind, records] of [['item', catalog.entries.map(entry => entry.item)], ['spirit', catalog.spirits], ['season', catalog.seasons]]) {
  for (const record of records) {
    identities.push({ kind, id: record.id, schemaVersion: 1, revision: 1, updatedAt: record.updatedAt, retiredAt: null, fixture: false, provenanceIds: record.provenanceIds })
    if (kind === 'item') {
      for (const id of record.seasonIds) relations.push({ type: 'itemSeason', fromId: record.id, toId: id })
      for (const id of record.spiritIds) relations.push({ type: 'itemSpirit', fromId: record.id, toId: id })
    }
    if (kind === 'spirit') for (const id of record.seasonIds) relations.push({ type: 'spiritSeason', fromId: record.id, toId: id })
  }
}
const normalized = () => ({ publicFiles: { manifest, files }, provenanceIds: catalog.provenance.map(source => source.id), identities: { identities, relations, crosswalks: [], aliases: [], tombstones: [] } })
// Synthetic local acceptance budgets, not production capacity/provider quota.
const contract = { sourceIds: new Set(['K15']), maxSnapshotBytes: 1024, maxNormalizedBytes: 8_000_000, maxRecords: 10_000, maxRelations: 20_000, retryDelaysMs: [1000, 5000] }
const empty = () => ({ revision: 0, lastKnownGood: null, freshness: null, lastAttemptAt: null, failures: 0, nextRetryAt: null, approval: null })
function memoryStore(initial = empty()) {
  let state = globalThis.structuredClone(initial)
  const sources = new Map([['K15', state]])
  return { read: async source => globalThis.structuredClone({ ...(sources.get(source) ?? empty()), revision: state.revision, lastKnownGood: state.lastKnownGood, approval: state.approval }), compareAndSwap: async (source, expected, next) => {
    if (state.revision !== expected) return false
    state = globalThis.structuredClone(next); sources.set(source, state); return true
  } }
}
const stage = (base, raw = 'synthetic upstream envelope', normalize = async () => normalized()) => stageSourceSnapshot({ sourceId: 'K15', raw, normalizationVersion: 'fixture-normalizer-v1', base, contract, normalize })
const approve = candidate => ({ contentHash: candidate.contentHash, baseRevision: candidate.baseRevision, reviewerRef: 'private-fixture-reviewer', reviewedAt: '2026-10-04T00:00:00Z' })
function mutatePublic(name, mutate) {
  const value = globalThis.structuredClone(normalized())
  const entry = name === 'provenance' ? value.publicFiles.manifest.provenance : value.publicFiles.manifest.datasets[name]
  const envelope = JSON.parse(value.publicFiles.files.get(entry.path))
  mutate(envelope)
  const text = JSON.stringify(envelope)
  value.publicFiles.files.set(entry.path, text)
  entry.sha256 = createHash('sha256').update(text).digest('hex')
  return value
}

test('promoted public bytes structurally exclude top-level and nested operational fields', async () => {
  const value = mutatePublic('items', envelope => {
    envelope.privateAudit = 'PRIVATE_SENTINEL'
    envelope.records[0].privateEvidence = 'PRIVATE_SENTINEL'
    envelope.records[0].name.reviewerRef = 'PRIVATE_SENTINEL'
    envelope.records.find(item => item.acquisitionOptions.length).acquisitionOptions[0].internalReview = 'PRIVATE_SENTINEL'
  })
  value.publicFiles.manifest.privateEvidence = 'PRIVATE_SENTINEL'
  value.publicFiles.manifest.source.privateEvidence = 'PRIVATE_SENTINEL'
  value.publicFiles.manifest.source.sourcePaths[0].reviewerRef = 'PRIVATE_SENTINEL'
  value.publicFiles.manifest.importReport.privateEvidence = 'PRIVATE_SENTINEL'
  const result = await stage(empty(), 'fixture', async () => value)
  assert.equal(result.status, 'staged')
  const store = memoryStore()
  assert.equal(await promoteReviewedSnapshot(store, result.candidate, approve(result.candidate), contract, freshness), 'promoted')
  const stored = (await store.read('K15')).lastKnownGood.publicFiles
  assert.equal([...stored.files.values()].join('').includes('PRIVATE_SENTINEL'), false)
  assert.equal(JSON.stringify(stored.manifest).includes('PRIVATE_SENTINEL'), false)
  const serialized = JSON.stringify({ manifest: stored.manifest, files: [...stored.files] })
  const restored = JSON.parse(serialized); restored.files = new Map(restored.files)
  const canonical = canonicalizeSnapshotFiles(restored)
  assert.deepEqual(canonical, stored)
  assert.equal([...canonical.files.values()].join('').includes('PRIVATE_SENTINEL'), false)
})

test('undeclared record properties in another dataset cannot survive canonicalization', async () => {
  const value = mutatePublic('spirits', envelope => { envelope.records[0].privateEvidence = { reviewer: 'PRIVATE_SENTINEL' } })
  const result = await stage(empty(), 'fixture', async () => value)
  assert.equal(result.status, 'staged')
  assert.equal([...result.candidate.publicFiles.files.values()].join('').includes('PRIVATE_SENTINEL'), false)
})

test('unknown public datasets and extra files quarantine rather than entering a release', async () => {
  for (const asDataset of [true, false]) {
    const value = globalThis.structuredClone(normalized())
    const text = JSON.stringify({ privateEvidence: 'PRIVATE_SENTINEL' })
    value.publicFiles.files.set('private.json', text)
    if (asDataset) value.publicFiles.manifest.datasets.private = { path: 'private.json', dataVersion: manifest.catalogVersion, sha256: createHash('sha256').update(text).digest('hex') }
    assert.deepEqual(await stage(empty(), 'fixture', async () => value), { status: 'quarantined', code: 'invalid_candidate' })
  }
})

test('canonical public payload preserves every legitimate K15 field and exact hash/manifest bytes', async () => {
  const result = await stage(empty())
  assert.equal(result.status, 'staged')
  const canonical = result.candidate.publicFiles
  for (const entry of Object.values({ ...canonical.manifest.datasets, provenance: canonical.manifest.provenance })) {
    const text = canonical.files.get(entry.path)
    assert.deepEqual(JSON.parse(text), JSON.parse(files.get(entry.path)))
    assert.equal(createHash('sha256').update(text).digest('hex'), entry.sha256)
  }
  assert.deepEqual(canonicalizeSnapshotFiles(canonical), canonical)
  const expectedManifest = globalThis.structuredClone(manifest)
  for (const [name, entry] of Object.entries(canonical.manifest.datasets)) expectedManifest.datasets[name].sha256 = entry.sha256
  expectedManifest.provenance.sha256 = canonical.manifest.provenance.sha256
  assert.deepEqual(canonical.manifest, expectedManifest)
  const parsed = await createSnapshotRepository(canonical, freshness).readCatalog()
  assert.deepEqual(parsed.catalog.entries, catalog.entries)
})

test('staging validates without publishing; reviewed promotion is atomic and idempotent', async () => {
  const store = memoryStore()
  const result = await stage(await store.read('K15'))
  assert.equal(result.status, 'staged')
  assert.equal((await store.read('K15')).lastKnownGood, null)
  const candidate = result.candidate
  assert.equal(await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, freshness), 'promoted')
  const state = await store.read('K15')
  assert.equal(state.revision, 1)
  assert.equal(state.approval.reviewerRef, 'private-fixture-reviewer')
  assert.equal(await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, freshness), 'unchanged')
  assert.equal((await store.read('K15')).revision, 1)
})

test('invalid/empty/oversized/parser-failed candidates quarantine without leaking raw errors', async () => {
  for (const raw of ['', 'x'.repeat(1025)]) assert.equal((await stage(empty(), raw)).status, 'quarantined')
  const failure = await stage(empty(), 'source', async () => { throw new Error('PRIVATE_SENTINEL') })
  assert.deepEqual(failure, { status: 'quarantined', code: 'invalid_candidate' })
  const missingIdentity = await stage(empty(), 'source', async () => ({ ...normalized(), identities: { identities: [], relations: [], crosswalks: [], aliases: [], tombstones: [] } }))
  assert.equal(missingIdentity.status, 'quarantined')
  const missingJoin = await stage(empty(), 'source', async () => ({ ...normalized(), identities: { ...normalized().identities, relations: [] } }))
  assert.equal(missingJoin.status, 'quarantined')
})

test('small raw input cannot expand beyond configurable normalized byte/record/relation budgets', async () => {
  const bytes = Buffer.byteLength(JSON.stringify(normalized(), (_key, value) => value instanceof Map ? [...value] : value))
  const expanded = mutatePublic('items', envelope => { envelope.records[0].name.default = 'PRIVATE_SENTINEL'.repeat(1000) })
  const bounded = { ...contract, maxNormalizedBytes: bytes + 100 }
  assert.equal((await stageSourceSnapshot({ sourceId: 'K15', raw: 'tiny', normalizationVersion: 'fixture-v1', base: empty(), contract: bounded, normalize: async () => normalized() })).status, 'staged')
  for (const [policy, normalize] of [
    [bounded, async () => expanded],
    [{ ...contract, maxRecords: 100 }, async () => normalized()],
    [{ ...contract, maxRelations: 1 }, async () => normalized()],
  ]) {
    const result = await stageSourceSnapshot({ sourceId: 'K15', raw: 'tiny', normalizationVersion: 'fixture-v1', base: empty(), contract: policy, normalize })
    assert.deepEqual(result, { status: 'quarantined', code: 'invalid_candidate' })
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false)
  }
  assert.equal((await stage(empty(), 'x'.repeat(contract.maxSnapshotBytes + 1))).status, 'quarantined')
})

test('review binds exact content and base generation; edited candidates cannot promote', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  assert.equal(await promoteReviewedSnapshot(store, candidate, { ...approve(candidate), contentHash: 'wrong' }, contract, freshness), 'rejected')
  const changed = globalThis.structuredClone(candidate)
  changed.normalizationVersion = 'changed-after-review'
  assert.equal(await promoteReviewedSnapshot(store, changed, approve(candidate), contract, freshness), 'rejected')
  assert.equal((await store.read('K15')).lastKnownGood, null)
})

test('concurrent promotions cannot overwrite another reviewed generation', async () => {
  const store = memoryStore()
  const a = (await stage(empty(), 'candidate A')).candidate
  const multiSourceContract = { ...contract, sourceIds: new Set(['K15', 'K01']) }
  const b = (await stageSourceSnapshot({ sourceId: 'K01', raw: 'synthetic second source', normalizationVersion: 'fixture-normalizer-v1', base: empty(), contract: multiSourceContract, normalize: async () => normalized() })).candidate
  const results = await Promise.all([promoteReviewedSnapshot(store, a, approve(a), multiSourceContract, freshness), promoteReviewedSnapshot(store, b, approve(b), multiSourceContract, freshness)])
  assert.deepEqual(results.sort(), ['conflict', 'promoted'])
  assert.equal((await store.read('K15')).revision, 1)
})

test('failures retain LKG, use bounded explicit retry policy and recover without rewriting data', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, freshness)
  const hash = candidate.contentHash
  for (const [time, retry] of [['2026-10-04T00:01:00Z', '2026-10-04T00:01:01.000Z'], ['2026-10-04T00:02:00Z', '2026-10-04T00:02:05.000Z'], ['2026-10-04T00:03:00Z', null]]) {
    assert.equal(await recordSourceFailure(store, 'K15', time, contract), 'recorded')
    const state = await store.read('K15')
    assert.equal(state.lastKnownGood.contentHash, hash)
    assert.equal(state.freshness.health, 'offline')
    assert.equal(state.nextRetryAt, retry)
  }
  const recovered = (await stage(await store.read('K15'))).candidate
  const later = { ...freshness, lastSuccessAt: '2026-10-04T00:04:00Z' }
  assert.equal(await promoteReviewedSnapshot(store, recovered, approve(recovered), contract, later), 'unchanged')
  assert.equal((await store.read('K15')).failures, 0)
  assert.equal((await store.read('K15')).freshness.health, 'healthy')
})

test('local snapshot export/restore preserves API payloads; not a PostgreSQL rehearsal', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, freshness)
  const before = await store.read('K15')
  const serialized = JSON.stringify({ ...before, lastKnownGood: { ...before.lastKnownGood, publicFiles: { manifest, files: [...files] } } })
  const restored = JSON.parse(serialized)
  restored.lastKnownGood.publicFiles.files = new Map(restored.lastKnownGood.publicFiles.files)
  const now = () => Date.parse('2026-10-04T01:00:00Z')
  const read = async state => {
    const adapter = createSnapshotRepository(state.lastKnownGood.publicFiles, state.freshness)
    return (await createDomainApi(adapter, now)(new globalThis.Request('https://fixture.invalid/api/items?limit=2'))).json()
  }
  assert.deepEqual(await read(restored), await read(before))
  assert.equal(JSON.stringify(await read(restored)).includes('private-fixture-reviewer'), false)
})
