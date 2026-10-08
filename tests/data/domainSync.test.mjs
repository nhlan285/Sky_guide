import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { createHash } from 'node:crypto'
import { Buffer } from 'node:buffer'
import { candidateReviewHash, stageSourceSnapshot, promoteReviewedSnapshot, recordSourceFailure, validateStoredSyncCandidate } from '../../src/server/sourceSync.ts'
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
const empty = () => ({ revision: 0, lastKnownGood: null, lastPromotedAt: null, freshness: null, lastAttemptAt: null, failures: 0, nextRetryAt: null, approval: null })
function memoryStore(initial = empty()) {
  let state = globalThis.structuredClone(initial)
  const sources = new Map([['K15', state]])
  return { read: async source => globalThis.structuredClone({ ...(sources.get(source) ?? empty()), revision: state.revision, lastKnownGood: state.lastKnownGood, lastPromotedAt: state.lastPromotedAt, approval: state.approval }), compareAndSwap: async (source, expected, next) => {
    if (state.revision !== expected) return false
    state = globalThis.structuredClone(next); sources.set(source, state); return true
  } }
}
const timing = base => {
  const fetched = Math.max(base.lastAttemptAt ? Date.parse(base.lastAttemptAt) + 1000 : 0, base.lastPromotedAt ? Date.parse(base.lastPromotedAt) + 1000 : 0, Date.parse('2026-10-04T00:00:00Z'))
  return { fetchedAt: new Date(fetched).toISOString(), now: () => fetched + 1000 }
}
const stage = (base, raw = 'synthetic upstream envelope', normalize = async () => normalized()) => stageSourceSnapshot({ sourceId: 'K15', raw, normalizationVersion: 'fixture-normalizer-v1', base, contract, normalize, ...timing(base) })
const approve = candidate => ({ contentHash: candidate.contentHash, candidateHash: candidateReviewHash(candidate), baseRevision: candidate.baseRevision, reviewerRef: 'private-fixture-reviewer', reviewedAt: new Date(Date.parse(candidate.stagedAt) + 1000).toISOString() })
const promotion = candidate => ({ validUntil: null, now: () => Date.parse(candidate.stagedAt) + 2000 })

test('future review fractions and comma instants cannot publish or poison source attempts', async () => {
  const {candidate} = await stage(empty())
  const at = new Date(promotion(candidate).now()).toISOString()
  await assert.rejects(()=>validateStoredSyncCandidate({...candidate,fetchedAt:'2099-10-07T00:00:00,1Z'},contract))
  for (const reviewedAt of [at.replace('.000Z',',0001Z'), at.replace('.000Z','.0001Z'), '2099-10-07T00:00:00,1Z']) {
    const store=memoryStore()
    assert.equal(await promoteReviewedSnapshot(store,candidate,{...approve(candidate),reviewedAt},contract,promotion(candidate)),'rejected')
    assert.equal((await store.read('K15')).revision,0)
    assert.equal(await recordSourceFailure(store,'K15',reviewedAt,{...contract,retryDelaysMs:[]},promotion(candidate).now),'rejected')
    assert.equal((await store.read('K15')).lastAttemptAt,null)
  }
  const store=memoryStore()
  assert.equal(await recordSourceFailure(store,'K15','2026-10-04T00:00:00,9999Z',{...contract,retryDelaysMs:[1]},()=>Date.parse('2026-10-04T00:00:01Z')),'recorded')
  assert.equal((await store.read('K15')).nextRetryAt,'2026-10-04T00:00:01.0009Z')
  assert.equal(await recordSourceFailure(store,'K15','2026-10-04T01:00:00.9998+01',contract,()=>Date.parse('2026-10-04T00:00:01Z')),'rejected')
  assert.throws(()=>createSnapshotRepository({manifest,files},{health:'healthy',lastSuccessAt:at.replace('.000Z','.0001Z'),validUntil:at}))
})

test('source staging rejects a future comma or sub-millisecond fetch', async () => {
  for(const fetchedAt of ['2099-10-07T00:00:00,1Z','2026-10-04T00:00:00.0001Z']) {
    const result=await stageSourceSnapshot({sourceId:'K15',raw:'fixture',normalizationVersion:'fixture',base:empty(),contract,normalize:async()=>normalized(),fetchedAt,now:()=>Date.parse('2026-10-04T00:00:00Z')})
    assert.equal(result.status,'quarantined')
  }
})
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
  assert.equal(await promoteReviewedSnapshot(store, result.candidate, approve(result.candidate), contract, promotion(result.candidate)), 'promoted')
  const stored = (await store.read('K15')).lastKnownGood.publicFiles
  assert.equal([...stored.files.values()].join('').includes('PRIVATE_SENTINEL'), false)
  assert.equal(JSON.stringify(stored.manifest).includes('PRIVATE_SENTINEL'), false)
  const serialized = JSON.stringify({ manifest: stored.manifest, files: [...stored.files] })
  const restored = JSON.parse(serialized); restored.files = new Map(restored.files)
  const canonical = canonicalizeSnapshotFiles(restored)
  assert.deepEqual(canonical, stored)
  assert.equal([...canonical.files.values()].join('').includes('PRIVATE_SENTINEL'), false)
  const reStaged = await stage(empty(), 'restore fixture', async () => ({ identities: result.candidate.identities, publicFiles: restored, provenanceIds: result.candidate.provenanceIds }))
  const restoredStore = memoryStore()
  assert.equal(await promoteReviewedSnapshot(restoredStore, reStaged.candidate, approve(reStaged.candidate), contract, promotion(reStaged.candidate)), 'promoted')
  assert.equal([...(await restoredStore.read('K15')).lastKnownGood.publicFiles.files.values()].join('').includes('PRIVATE_SENTINEL'), false)
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
  assert.equal(await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, promotion(candidate)), 'promoted')
  const state = await store.read('K15')
  assert.equal(state.revision, 1)
  assert.equal(state.approval.reviewerRef, 'private-fixture-reviewer')
  assert.equal(await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, promotion(candidate)), 'unchanged')
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
  const bounded = { ...contract, maxNormalizedBytes: bytes + 1000 }
  assert.equal((await stageSourceSnapshot({ sourceId: 'K15', raw: 'tiny', normalizationVersion: 'fixture-v1', base: empty(), contract: bounded, normalize: async () => normalized(), ...timing(empty()) })).status, 'staged')
  for (const [policy, normalize] of [
    [bounded, async () => expanded],
    [{ ...contract, maxRecords: 100 }, async () => normalized()],
    [{ ...contract, maxRelations: 1 }, async () => normalized()],
  ]) {
    const result = await stageSourceSnapshot({ sourceId: 'K15', raw: 'tiny', normalizationVersion: 'fixture-v1', base: empty(), contract: policy, normalize, ...timing(empty()) })
    assert.deepEqual(result, { status: 'quarantined', code: 'invalid_candidate' })
    assert.equal(JSON.stringify(result).includes('PRIVATE_SENTINEL'), false)
  }
  assert.equal((await stage(empty(), 'x'.repeat(contract.maxSnapshotBytes + 1))).status, 'quarantined')
})

test('review binds exact content and base generation; edited candidates cannot promote', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  assert.equal(await promoteReviewedSnapshot(store, candidate, { ...approve(candidate), contentHash: 'wrong' }, contract, promotion(candidate)), 'rejected')
  const changed = globalThis.structuredClone(candidate)
  changed.normalizationVersion = 'changed-after-review'
  assert.equal(await promoteReviewedSnapshot(store, changed, approve(candidate), contract, promotion(candidate)), 'rejected')
  assert.equal((await store.read('K15')).lastKnownGood, null)
})

test('concurrent promotions cannot overwrite another reviewed generation', async () => {
  const store = memoryStore()
  const a = (await stage(empty(), 'candidate A')).candidate
  const multiSourceContract = { ...contract, sourceIds: new Set(['K15', 'K01']) }
  const b = (await stageSourceSnapshot({ sourceId: 'K01', raw: 'synthetic second source', normalizationVersion: 'fixture-normalizer-v1', base: empty(), contract: multiSourceContract, normalize: async () => normalized(), ...timing(empty()) })).candidate
  const results = await Promise.all([promoteReviewedSnapshot(store, a, approve(a), multiSourceContract, promotion(a)), promoteReviewedSnapshot(store, b, approve(b), multiSourceContract, promotion(b))])
  assert.deepEqual(results.sort(), ['conflict', 'promoted'])
  assert.equal((await store.read('K15')).revision, 1)
})

test('failures retain LKG, use bounded explicit retry policy and recover without rewriting data', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, promotion(candidate))
  const hash = candidate.contentHash
  for (const [time, retry] of [['2026-10-04T00:01:00Z', '2026-10-04T00:01:01.000Z'], ['2026-10-04T00:02:00Z', '2026-10-04T00:02:05.000Z'], ['2026-10-04T00:03:00Z', null]]) {
    assert.equal(await recordSourceFailure(store, 'K15', time, contract, () => Date.parse(time) + 1000), 'recorded')
    const state = await store.read('K15')
    assert.equal(state.lastKnownGood.contentHash, hash)
    assert.equal(state.freshness.health, 'offline')
    assert.equal(state.nextRetryAt, retry)
  }
  const recovered = (await stage(await store.read('K15'))).candidate
  const later = { validUntil: null, now: () => Date.parse('2026-10-04T00:04:00Z') }
  assert.equal(await promoteReviewedSnapshot(store, recovered, approve(recovered), contract, later), 'unchanged')
  assert.equal((await store.read('K15')).failures, 0)
  assert.equal((await store.read('K15')).freshness.health, 'healthy')
})

test('local snapshot export/restore preserves API payloads; not a PostgreSQL rehearsal', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, promotion(candidate))
  const before = await store.read('K15')
  const serialized = JSON.stringify({ ...before, lastKnownGood: { ...before.lastKnownGood, publicFiles: { manifest: before.lastKnownGood.publicFiles.manifest, files: [...before.lastKnownGood.publicFiles.files] } } })
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

test('non-equal fetch/stage/review/promote instants have explicit server-clock ordering', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  const approval = approve(candidate)
  assert.ok(Date.parse(candidate.fetchedAt) < Date.parse(candidate.stagedAt))
  assert.ok(Date.parse(candidate.stagedAt) < Date.parse(approval.reviewedAt))
  for (const [value, reviewed, options] of [
    [candidate, { ...approval, reviewedAt: candidate.fetchedAt }, promotion(candidate)],
    [candidate, { ...approval, reviewedAt: '2026-10-04T00:00:10Z' }, promotion(candidate)],
    [candidate, approval, { validUntil: null, now: () => Date.parse(approval.reviewedAt) - 1 }],
    [candidate, approval, { validUntil: null, now: () => NaN }],
    [{ ...candidate, fetchedAt: '2026-10-03T00:00:00Z' }, approval, promotion(candidate)],
    [candidate, { ...approval, candidateHash: 'wrong' }, promotion(candidate)],
  ]) assert.equal(await promoteReviewedSnapshot(store, value, reviewed, contract, options), 'rejected')
  assert.equal((await store.read('K15')).revision, 0)
  assert.equal(await promoteReviewedSnapshot(store, candidate, approval, contract, promotion(candidate)), 'promoted')
  const state = await store.read('K15')
  assert.equal(state.lastAttemptAt, candidate.fetchedAt)
  assert.equal(state.lastPromotedAt, new Date(promotion(candidate).now()).toISOString())
  assert.equal(state.freshness.lastSuccessAt, state.lastPromotedAt)
  assert.ok(Date.parse(approval.reviewedAt) < Date.parse(state.lastPromotedAt))
  for (const fetchedAt of ['invalid', '2026-10-04T00:01:00Z']) {
    const result = await stageSourceSnapshot({ sourceId: 'K15', raw: 'fixture', normalizationVersion: 'fixture-v1', base: empty(), contract, normalize: async () => normalized(), ...timing(empty()), fetchedAt })
    assert.equal(result.status, 'quarantined')
  }
})

test('same-content recovery requires new valid review and an old retry cannot rewrite health', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, promotion(candidate))
  await recordSourceFailure(store, 'K15', '2026-10-04T00:01:00Z', contract, () => Date.parse('2026-10-04T00:01:01Z'))
  const before = await store.read('K15')
  const recovered = (await stage(before)).candidate
  for (const change of [{ reviewerRef: '' }, { candidateHash: 'wrong' }, { baseRevision: 0 }, { reviewedAt: recovered.fetchedAt }]) {
    assert.equal(await promoteReviewedSnapshot(store, recovered, { ...approve(recovered), ...change }, contract, promotion(recovered)), 'rejected')
  }
  assert.deepEqual(await store.read('K15'), before)
  assert.equal(await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, { validUntil: null, now: () => Date.parse('2026-10-04T00:01:10Z') }), 'unchanged')
  assert.deepEqual(await store.read('K15'), before)
  assert.equal(await promoteReviewedSnapshot(store, recovered, approve(recovered), contract, promotion(recovered)), 'unchanged')
  const after = await store.read('K15')
  assert.equal(after.lastKnownGood.contentHash, before.lastKnownGood.contentHash)
  assert.deepEqual(after.lastKnownGood.publicFiles, before.lastKnownGood.publicFiles)
  assert.equal(after.failures, 0)
  assert.equal(after.freshness.health, 'healthy')
  assert.ok(Date.parse(after.lastPromotedAt) > Date.parse(before.lastPromotedAt))
})

test('stale, duplicate or future attempts cannot regress audit/retry state', async () => {
  const store = memoryStore()
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), contract, promotion(candidate))
  assert.equal(await recordSourceFailure(store, 'K15', candidate.stagedAt, contract, promotion(candidate).now), 'rejected')
  const attempt = '2026-10-04T00:01:00Z'
  const clock = () => Date.parse(attempt) + 1000
  assert.equal(await recordSourceFailure(store, 'K15', attempt, contract, clock), 'recorded')
  const before = await store.read('K15')
  for (const completedAt of [attempt, '2026-10-04T00:00:59Z', '2026-10-04T00:02:00Z']) {
    assert.equal(await recordSourceFailure(store, 'K15', completedAt, contract, clock), 'rejected')
    assert.deepEqual(await store.read('K15'), before)
  }
  const staleStage = await stageSourceSnapshot({ sourceId: 'K15', raw: 'fixture', normalizationVersion: 'fixture-v1', base: before, contract, normalize: async () => normalized(), fetchedAt: candidate.fetchedAt, now: () => Date.parse(attempt) + 2000 })
  assert.equal(staleStage.status, 'quarantined')
})

test('two sources keep independent health/failure/retry while sharing one canonical generation', async () => {
  // K01 is a synthetic trigger over the K15 compatibility projection, not a real
  // upstream import. No source request or scheduler exists in this test.
  const policy = { ...contract, sourceIds: new Set(['K15', 'K01']) }
  const store = memoryStore()
  const forSource = async sourceId => {
    const base = await store.read(sourceId)
    return (await stageSourceSnapshot({ sourceId, raw: `fixture-${sourceId}`, normalizationVersion: 'fixture-v1', base, contract: policy, normalize: async () => normalized(), ...timing(base) })).candidate
  }
  const health = state => ({ freshness: state.freshness, lastAttemptAt: state.lastAttemptAt, failures: state.failures, nextRetryAt: state.nextRetryAt })
  for (const source of ['K15', 'K01']) {
    const candidate = await forSource(source)
    assert.equal(await promoteReviewedSnapshot(store, candidate, approve(candidate), policy, promotion(candidate)), 'promoted')
  }
  const healthyK15 = health(await store.read('K15'))
  const pointer = (await store.read('K15')).lastKnownGood.contentHash
  assert.equal(await recordSourceFailure(store, 'K01', '2026-10-04T00:00:10Z', policy, () => Date.parse('2026-10-04T00:00:11Z')), 'recorded')
  assert.deepEqual(health(await store.read('K15')), healthyK15)
  assert.equal((await store.read('K01')).freshness.health, 'offline')
  assert.equal((await store.read('K01')).nextRetryAt, '2026-10-04T00:00:11.000Z')
  const failedK01 = health(await store.read('K01'))
  assert.equal(await recordSourceFailure(store, 'K15', '2026-10-04T00:00:12Z', policy, () => Date.parse('2026-10-04T00:00:13Z')), 'recorded')
  assert.deepEqual(health(await store.read('K01')), failedK01)
  assert.equal(await recordSourceFailure(store, 'K01', '2026-10-04T00:00:14Z', policy, () => Date.parse('2026-10-04T00:00:15Z')), 'recorded')
  assert.equal((await store.read('K01')).failures, 2)
  assert.equal((await store.read('K15')).failures, 1)
  assert.equal((await store.read('K01')).nextRetryAt, '2026-10-04T00:00:19.000Z')
  assert.equal((await store.read('K15')).nextRetryAt, '2026-10-04T00:00:13.000Z')
  assert.equal((await store.read('K15')).lastKnownGood.contentHash, pointer)
  assert.equal((await store.read('K01')).revision, 5)
  const recovery = await forSource('K15')
  assert.equal(await promoteReviewedSnapshot(store, recovery, approve(recovery), policy, promotion(recovery)), 'promoted')
  assert.equal((await store.read('K15')).failures, 0)
  assert.equal((await store.read('K01')).failures, 2)
  assert.equal((await store.read('K01')).freshness.health, 'offline')
  assert.equal((await store.read('K01')).revision, 6)
})

test('two-source concurrent promotions conflict globally and restaging preserves both sources', async () => {
  const store = memoryStore()
  const policy = { ...contract, sourceIds: new Set(['K15', 'K01']) }
  const forSource = async sourceId => {
    const base = await store.read(sourceId)
    return (await stageSourceSnapshot({ sourceId, raw: `fixture-${sourceId}`, normalizationVersion: 'fixture-v1', base, contract: policy, normalize: async () => normalized(), ...timing(base) })).candidate
  }
  const candidates = await Promise.all(['K15', 'K01'].map(forSource))
  const results = await Promise.all(candidates.map(candidate => promoteReviewedSnapshot(store, candidate, approve(candidate), policy, promotion(candidate))))
  assert.deepEqual([...results].sort(), ['conflict', 'promoted'])
  assert.equal((await store.read('K01')).revision, 1)
  const loser = candidates[results.indexOf('conflict')].sourceId
  const refreshed = await forSource(loser)
  assert.equal(await promoteReviewedSnapshot(store, refreshed, approve(refreshed), policy, promotion(refreshed)), 'promoted')
  const a = await store.read('K15'), b = await store.read('K01')
  assert.equal(a.revision, 2); assert.equal(b.revision, 2)
  assert.equal(a.freshness.health, 'healthy'); assert.equal(b.freshness.health, 'healthy')
  assert.equal(a.lastKnownGood.contentHash, b.lastKnownGood.contentHash)
  assert.equal(a.lastPromotedAt, b.lastPromotedAt)
})

test('a second source cannot regress the global promotion clock', async () => {
  const store = memoryStore()
  const policy = { ...contract, sourceIds: new Set(['K15', 'K01']) }
  const { candidate } = await stage(empty())
  await promoteReviewedSnapshot(store, candidate, approve(candidate), policy, promotion(candidate))
  const base = await store.read('K01')
  const options = { sourceId: 'K01', raw: 'fixture', normalizationVersion: 'fixture-v1', base, contract: policy, normalize: async () => normalized(), ...timing(empty()) }
  assert.equal((await stageSourceSnapshot(options)).status, 'quarantined')
  // Simulate a malformed restored base lacking the known global timestamp.
  const restored = await stageSourceSnapshot({ ...options, base: { ...base, lastPromotedAt: null } })
  const before = await store.read('K01')
  assert.equal(await promoteReviewedSnapshot(store, restored.candidate, approve(restored.candidate), policy, { validUntil: null, now: () => Date.parse(approve(restored.candidate).reviewedAt) + 500 }), 'rejected')
  assert.deepEqual(await store.read('K01'), before)
})
