import assert from 'node:assert/strict'
import test from 'node:test'
import { stageWikiItems } from '../../scripts/wiki/items.mjs'
import { validateItem } from '../../src/data/catalog/items.ts'

// Synthetic module and identities; never public game data or permission evidence.
const context = Object.fromEntries(['provenanceIds', 'itemIds', 'spiritIds', 'treeIds', 'nodeIds', 'seasonIds', 'realmIds', 'mapIds', 'articleIds', 'assetIds', 'ruleIds', 'iapProductIds', 'visitIds'].map(field => [field, new Set()]))
context.provenanceIds.add('fixture-seed'); context.provenanceIds.add('fixture-wiki')
context.itemIds.add('fixture-a'); context.itemIds.add('fixture-b')
const source = () => ({
  id: 'fixture-wiki', sourceId: 'K01', sourceUrl: 'https://example.invalid/fixture',
  sourceRecordKey: 'Module:Cosmetics/data', sourceRevision: 'fixture-revision',
  retrievedAt: '2026-01-01T00:00:00Z', observedAt: null, attribution: 'Synthetic author',
  licenseNote: 'Synthetic fixture only', transformNote: 'Literal field test', verificationStatus: 'verified',
})
const seed = (id = 'fixture-a') => ({
  id, fixture: true, recordStatus: 'draft', updatedAt: '2025-01-01T00:00:00Z', provenanceIds: ['fixture-seed'],
  sourceKeys: {}, name: { default: 'Seed', translations: { vi: 'Provided name' } }, slot: 'unknown',
  rawSlot: null, accessoryAnchor: null, seasonIds: [], spiritIds: [], acquisitionOptions: [],
  assetIds: [], dyeRegions: [], dyeStatus: 'unknown', ruleIds: [], compatibility: null,
})
const mapping = (sourceKey = 'fixture', id = 'fixture-a') => ({ sourceKey, draft: seed(id), acquisitionId: `acquisition-${id}` })
const moduleText = fields => `local data = { fixture = { name = 'Source name', ${fields} } } return data`
const stage = (fields, maps = [mapping()]) => stageWikiItems(moduleText(fields), source(), maps, context)
const rejected = result => { assert.equal(result.status, 'quarantined'); assert.equal(result.candidateItems, null); assert.deepEqual(result.rawFields, []) }

test('staged fields preserve identity, supplied translation, provenance and immutable inputs', () => {
  const maps = [mapping()], provenance = source(), before = globalThis.structuredClone({ maps, provenance, context })
  const result = stageWikiItems(moduleText("item_type = 'hair', price = '5 C', icon = 'unapproved.png'"), provenance, maps, context)
  assert.equal(result.status, 'staged')
  const item = result.candidateItems[0]
  assert.equal(validateItem(item, context).valid, true)
  assert.equal(item.id, 'fixture-a'); assert.equal(item.name.default, 'Source name')
  assert.equal(item.name.translations.vi, 'Provided name'); assert.equal(item.recordStatus, 'draft')
  assert.equal(item.sourceKeys.K01, 'fixture'); assert.equal(item.updatedAt, provenance.retrievedAt)
  assert.deepEqual(item.provenanceIds, ['fixture-seed', 'fixture-wiki'])
  assert.deepEqual(item.fieldProvenance.name, ['fixture-wiki']); assert.deepEqual(item.assetIds, [])
  assert.equal(item.acquisitionOptions[0].kind, 'unknown'); assert.equal(item.acquisitionOptions[0].friendshipNodeId, null)
  assert.deepEqual({ maps, provenance, context }, before)
})

test('exact C/H/AC prices, explicit zero and free retain their meanings', () => {
  for (const [token, currency] of [['C', 'candle'], ['H', 'heart'], ['AC', 'other']]) {
    const option = stage(`price = '0 ${token}'`).candidateItems[0].acquisitionOptions[0]
    assert.equal(option.costStatus, 'known'); assert.deepEqual(option.costs, [{ currency, sourceCurrencyLabel: token, amount: 0 }])
  }
  const option = stage("price = 'free'").candidateItems[0].acquisitionOptions[0]
  assert.equal(option.costStatus, 'free'); assert.deepEqual(option.costs, [])
})

test('missing, compound, unsafe and unrecognized prices remain unknown with raw review fields', () => {
  for (const raw of [null, '', 'Free', '1C', '-1 C', '1.5 C', '2 C + 1 H', '9007199254740992 C', '$4.99']) {
    const result = stage(raw === null ? '' : `price = '${raw}'`)
    assert.equal(result.status, 'staged'); assert.equal(result.rawFields[0].rawPrice, raw)
    assert.equal(result.candidateItems[0].acquisitionOptions[0].costStatus, 'unknown')
    assert.deepEqual(result.candidateItems[0].acquisitionOptions[0].costs, [])
    assert.ok(result.reports.some(r => r.code === 'unknown_price'))
  }
})

test('only reviewed raw hair/mask/cape map automatically; outfit and typo remain unknown', () => {
  for (const raw of ['hair', 'mask', 'cape', 'outfit', 'outift', 'footwear', null]) {
    const item = stage(raw === null ? '' : `item_type = '${raw}'`).candidateItems[0]
    assert.equal(item.slot, ['hair', 'mask', 'cape'].includes(raw) ? raw : 'unknown'); assert.equal(item.rawSlot, raw)
  }
})

test('unverified, generic, unpinned, unattributed and unregistered sources quarantine', () => {
  for (const change of [{ sourceId: 'K02' }, { sourceRecordKey: 'Module:Spirit Item/data' }, { verificationStatus: 'pending' },
    { sourceRevision: null }, { sourceUrl: '' }, { attribution: ' ' }, { licenseNote: '' }, { transformNote: '' }, { id: 'unregistered' }]) {
    rejected(stageWikiItems(moduleText(''), { ...source(), ...change }, [mapping()], context))
  }
})

test('literal failures and duplicate keys quarantine without leaking source snippets or executing code', () => {
  const secret = 'private-sentinel'
  for (const text of [`local data = { fixture = ${secret}() }`, "local data = { fixture = { name = 'a', name = 'b' } }",
    "local data = { fixture = {}, fixture = {} }", 'local data = {', 'return os.execute("command")']) {
    const result = stageWikiItems(text, source(), [mapping()], context)
    rejected(result); assert.equal(JSON.stringify(result).includes(secret), false)
  }
  assert.equal(stageWikiItems(moduleText('') + '\nos.execute("must never run")', source(), [mapping()], context).status, 'staged')
  rejected(stageWikiItems('x'.repeat(1024 * 1024 + 1), source(), [mapping()], context))
})

test('empty/invalid mappings, unknown canonical IDs, conflicting keys and prior observations reject', () => {
  const conflict = mapping(); conflict.draft.sourceKeys.K01 = 'different'
  const published = mapping(); published.draft.recordStatus = 'published'
  const observed = mapping(); observed.draft.acquisitionOptions = [{ id: 'existing' }]
  for (const maps of [[], null, [null], [{ ...mapping(), acquisitionId: '' }], [mapping('fixture', 'absent')], [conflict], [published], [observed], [mapping('missing')], [mapping('__proto__')]]) rejected(stage('', maps))
  rejected(stageWikiItems(moduleText(''), source(), [mapping()], null))
})

test('duplicate crosswalk keys, items and acquisition IDs reject the whole batch', () => {
  const text = "local data = { fixture = { name = 'A' }, second = { name = 'B' } }"
  for (const maps of [[mapping(), mapping('fixture', 'fixture-b')], [mapping(), mapping('second')],
    [mapping(), { ...mapping('second', 'fixture-b'), acquisitionId: 'acquisition-fixture-a' }]]) {
    rejected(stageWikiItems(text, source(), maps, context))
  }
})

test('later invalid source row discards earlier candidates; selected keys only stage', () => {
  const text = "local data = { fixture = { name = 'A' }, second = { name = '' }, third = { name = 'C' } }"
  rejected(stageWikiItems(text, source(), [mapping(), mapping('second', 'fixture-b')], context))
  assert.equal(stageWikiItems(text, source(), [mapping()], context).candidateItems.length, 1)
  for (const fields of ["name = nil", "item_type = 5", "price = {}"])
    rejected(stageWikiItems(`local data = { fixture = { ${fields} } }`, source(), [mapping()], context))
})
