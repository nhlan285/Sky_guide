import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { URL, URLSearchParams } from 'node:url'
import { catalogResult } from '../../src/data/itemLookup/catalog.ts'
import { clearFilters, costRepresentation, filterEntries, filtersFromParams, lookupById, updateFilterParams, validateLookupMetadata } from '../../src/data/itemLookup/model.ts'
import { hasDataset, readCatalog, validateEnvelope, validateManifest } from '../../src/data/itemLookup/release.ts'
import { classify, normalizeCost, normalizeRecord, normalizeSources } from '../../scripts/tsa/normalize.mjs'
import { offers, parseSource, revision } from '../../scripts/tsa/source.mjs'
import { destinations } from '../../src/features/constellation/celestialAtlas.ts'

assert.equal(catalogResult.valid, true)
const catalog = catalogResult.value
const context = { provenanceIds: new Set(catalog.provenance.map(p => p.id)), itemIds: new Set(catalog.entries.map(e => e.id)), spiritIds: new Set(catalog.spirits.map(s => s.id)), seasonIds: new Set(catalog.seasons.map(s => s.id)),
  ...Object.fromEntries(['treeIds', 'nodeIds', 'realmIds', 'mapIds', 'articleIds', 'assetIds', 'ruleIds', 'iapProductIds', 'visitIds'].map(key => [key, new Set()])) }
const sample = catalog.entries.find(e => e.identifier === 'AnxiousAnglerHair')
const filter = overrides => ({ ...clearFilters(), ...overrides })

test('published source-derived records pass existing domain validators and retain verified sample costs', () => {
  assert.equal(catalog.entries.length, 1808)
  assert.equal(catalog.spirits.length, 213)
  assert.equal(catalog.seasons.length, 30)
  assert.equal(sample.id, 'tsa-cosmetic-1211')
  assert.equal(sample.category, 'hair')
  assert.deepEqual(sample.item.seasonIds, ['tsa-season-11'])
  assert.deepEqual(sample.item.spiritIds, ['tsa-spirit-115'])
  assert.equal(sample.item.acquisitionOptions.find(o => o.costs[0]?.sourceCurrencyLabel === 'candles').costs[0].amount, 45)
  assert.equal(sample.item.acquisitionOptions.find(o => o.costs[0]?.sourceCurrencyLabel === 'seasonalCandles').costs[0].amount, 14)
  assert.ok(catalog.entries.every(e => e.item.recordStatus === 'published' && !e.item.fixture && !e.item.assetIds.length))
})
test('stable numeric identity is independent of display name', () => {
  const raw = { upstreamId: 999999, identifier: 'SyntheticTestHair', name: 'Synthetic name', offers: [], defaultUnlocked: false, enumProvenanceId: [...context.provenanceIds][0], nameProvenanceIds: [[...context.provenanceIds][0]], provenanceIds: [[...context.provenanceIds][0]] }
  const one = normalizeRecord(raw, context)
  const two = normalizeRecord({ ...raw, name: 'Changed label' }, context)
  assert.equal(one.valid, true)
  assert.equal(two.valid, true)
  assert.equal(one.item.id, two.item.id)
  assert.equal(one.item.id, 'tsa-cosmetic-999999')
  assert.equal(one.item.acquisitionOptions.length, 0)
  assert.equal(normalizeRecord({ ...raw, upstreamId: -1 }, context).valid, false)
})
test('category requires explicit structure/naming evidence and ambiguous categories stay unknown', () => {
  assert.equal(classify('UnmappedSynthetic').category, 'unknown')
  assert.equal(classify('SyntheticCape').category, 'cape')
  assert.equal(classify('UnmappedSynthetic', ['Hair']).category, 'hair')
  assert.equal(classify('SyntheticCape', ['Hair', 'Mask']).category, 'unknown')
  assert.equal(classify('EmoteSynthetic1').category, 'expression')
  assert.ok(catalog.entries.filter(e => ['outfit', 'shoes', 'expression', 'music-sheet', 'prop'].includes(e.category)).every(e => e.item.slot === 'unknown'))
})
test('invalid normalized metadata is rejected; duplicate acquisition references cannot enter', () => {
  assert.equal(validateLookupMetadata({ ...sample, id: 'wrong-id' }).valid, false)
  assert.equal(validateLookupMetadata({ ...sample, category: 'made-up' }).valid, false)
  assert.equal(validateLookupMetadata({ ...sample, offers: [sample.offers[0], sample.offers[0]] }).valid, false)
  assert.throws(() => normalizeCost({ candles: -1 }), /Invalid source cost/)
  assert.throws(() => normalizeCost({ hearts: '4' }), /Invalid source cost/)
})
test('missing/free/zero and unverified monetary units remain distinct', () => {
  assert.deepEqual(normalizeCost(null), { costs: [], costStatus: 'unknown' })
  assert.equal(normalizeCost({ candles: 0 }).costStatus, 'known')
  assert.equal(normalizeCost({ money: 4.99 }).costStatus, 'unknown')
  assert.equal(costRepresentation({ costStatus: 'known', costs: [{ amount: 0 }] }), 'amounts')
  assert.equal(costRepresentation({ costStatus: 'unknown', costs: [] }), 'unknown')
  assert.equal(costRepresentation({ costStatus: 'free', costs: [] }), 'free')
  assert.equal(lookupById(catalog.entries, 'tsa-cosmetic-4').item.acquisitionOptions[0].costStatus, 'free')
})
test('source provenance preserves pinned revision, community attribution and original paths', () => {
  assert.ok(catalog.provenance.every(p => p.sourceId === 'K15' && p.sourceRevision === revision && p.sourceUrl.includes(revision) && p.licenseNote.includes('MIT') && p.observedAt === null))
  assert.ok(sample.offers.every(o => o.sourceUrl.includes(revision) && /#L\d+$/.test(o.sourceUrl)))
})
test('static parser supports literal aliases/multi-item offers without executing TypeScript', () => {
  const source = parseSource('synthetic.ts', 'const call = Cosmetic.Synthetic; const data = [{cosmetic: call, cost: {candles: 0}}, {cosmetic: [Cosmetic.Synthetic, Cosmetic.Other], cost: {hearts: 2}}]')
  const nodes = source.statements[1].declarationList.declarations[0].initializer
  const output = offers(nodes, { cosmetics: { Synthetic: 500, Other: 501 } }, { path: 'synthetic.ts', acquisition: 'shop' })
  assert.deepEqual(output.map(o => o.upstreamId), [500, 500, 501])
  assert.equal(output[0].costs.candles, 0)
  assert.equal(output[1].pack, true)
  const unsafe = parseSource('synthetic.ts', 'const data = [{cosmetic: Cosmetic.Synthetic, cost: calculateCost()}]')
  assert.throws(() => offers(unsafe.statements[0].declarationList.declarations[0].initializer, { cosmetics: { Synthetic: 500 } }, { path: 'synthetic.ts' }), /Nonliteral cost/)
  assert.throws(() => parseSource('broken.ts', 'const broken = {'), /Cannot parse/)
  assert.throws(() => normalizeSources(new Map(), revision), /Missing required public source/)
})
test('import output is reproducible when source fetch completion order changes', () => {
  // Entirely synthetic domain definitions; no upstream raw source is stored in tests.
  const prefix = 'packages/utility/source/'
  const sources = new Map([
    ['cosmetics.ts', 'export enum Cosmetic { SyntheticHair = 500, OtherHair = 501 } export enum CosmeticCommon { Hair = 1 }'],
    ['season.ts', 'export const SeasonId = { Synthetic: 90 } as const'],
    ['utility/spirits.ts', 'export const SpiritId = { Alpha: 90, Beta: 91 } as const'],
    ['catalogue.ts', 'export const nothing = 1'],
    ['locales/en-gb.ts', 'export default {"cosmetic-names":{}, seasons:{[SeasonId.Synthetic]:"Synthetic season"}, spirits:{[SpiritId.Alpha]:"Synthetic Alpha",[SpiritId.Beta]:"Synthetic Beta"}, "cosmetic-common-names":{[CosmeticCommon.Hair]:"Hair"}}'],
    ['kingdom/seasons/synthetic/index.ts', 'export default new Season({id:SeasonId.Synthetic})'],
    ['kingdom/seasons/synthetic/alpha.ts', 'export default new SeasonalSpirit({id:SpiritId.Alpha, seasonId:SeasonId.Synthetic, offer:{current:[[{cosmetic:Cosmetic.SyntheticHair, translation:CosmeticCommon.Hair, cost:{candles:7}}]]}})'],
    ['kingdom/seasons/synthetic/beta.ts', 'export default new SeasonalSpirit({id:SpiritId.Beta, seasonId:SeasonId.Synthetic, offer:{current:[[{cosmetic:Cosmetic.OtherHair, translation:CosmeticCommon.Hair}]]}})'],
  ].map(([path, text]) => [prefix + path, text]))
  assert.deepEqual(normalizeSources(sources, revision), normalizeSources(new Map([...sources].reverse()), revision))
})

test('local search supports exact/case/partial names, simple whitespace and stable identifiers', () => {
  assert.ok(filterEntries(catalog.entries, filter({ query: sample.item.name.default })).some(e => e.id === sample.id))
  assert.deepEqual(filterEntries(catalog.entries, filter({ query: 'ANXIOUS ANGLER' })), filterEntries(catalog.entries, filter({ query: 'anxious angler' })))
  assert.ok(filterEntries(catalog.entries, filter({ query: 'anxious' })).length > 1)
  assert.deepEqual(filterEntries(catalog.entries, filter({ query: '  Anxious   Angler  ' })), filterEntries(catalog.entries, filter({ query: 'Anxious Angler' })))
  assert.equal(filterEntries(catalog.entries, filter({ query: 'AnxiousAnglerHair' }))[0].id, sample.id)
  assert.equal(filterEntries(catalog.entries, filter({ query: 'no-such-item-zzzz' })).length, 0)
})
test('category, slot, season, spirit and acquisition filters each produce actual intersections', () => {
  for (const [key, value, matches] of [
    ['category', 'hair', e => e.category === 'hair'], ['slot', 'cape', e => e.item.slot === 'cape'],
    ['season', 'tsa-season-11', e => e.item.seasonIds.includes('tsa-season-11')],
    ['spirit', 'tsa-spirit-115', e => e.item.spiritIds.includes('tsa-spirit-115')],
    ['acquisition', 'spirit-seasonal', e => e.offers.some(o => o.acquisition === 'spirit-seasonal')],
  ]) {
    const results = filterEntries(catalog.entries, filter({ [key]: value }))
    assert.ok(results.length > 0)
    assert.ok(results.every(matches))
  }
  const combined = filterEntries(catalog.entries, filter({ query: 'Angler', category: 'hair', season: 'tsa-season-11', spirit: 'tsa-spirit-115' }))
  assert.deepEqual(combined.map(e => e.id), [sample.id])
  assert.equal(filterEntries(catalog.entries, clearFilters()).length, 1808)
  assert.equal(filterEntries(catalog.entries, filter({ category: 'hair', slot: 'cape' })).length, 0)
})
test('URL filters preserve independent values across detail/back links and changes', () => {
  const previous = new URLSearchParams('q=Angler&category=hair&season=tsa-season-11&spirit=tsa-spirit-115&page=3')
  const params = updateFilterParams(previous, 'category', 'mask')
  const state = filtersFromParams(params)
  assert.equal(state.query, 'Angler')
  assert.equal(state.season, 'tsa-season-11')
  assert.equal(state.spirit, 'tsa-spirit-115')
  assert.equal(state.category, 'mask')
  assert.equal(previous.get('category'), 'hair')
  assert.equal(params.has('page'), false)
  assert.equal(updateFilterParams(params, 'category', '').has('category'), false)
  assert.deepEqual(filtersFromParams(new URLSearchParams()), clearFilters())
})
test('detail lookup resolves stable IDs and returns null for invalid/unknown IDs', () => {
  assert.equal(lookupById(catalog.entries, sample.id), sample)
  assert.equal(lookupById(catalog.entries, 'unknown-id'), null)
  const unknown = catalog.entries.find(e => !e.item.acquisitionOptions.length)
  assert.ok(unknown)
  assert.equal(lookupById(catalog.entries, unknown.id).item.acquisitionOptions.length, 0)
})

const releasePath = new URL('../../data/public/tsa-v1-74007cf878ef/', import.meta.url)
const releaseFiles = Object.fromEntries(['items', 'lookup', 'spirits', 'seasons', 'provenance'].map(key => [key, JSON.parse(readFileSync(new URL(`${key}.json`, releasePath), 'utf8'))]))
const manifest = JSON.parse(readFileSync(new URL('manifest.json', releasePath), 'utf8'))
test('public release checksums/envelopes match one immutable manifest and contain no fixture/game assets', () => {
  assert.equal(validateManifest(manifest).valid, true)
  for (const entry of [...Object.values(manifest.datasets), manifest.provenance]) {
    assert.equal(createHash('sha256').update(readFileSync(new URL(entry.path, releasePath))).digest('hex'), entry.sha256)
    assert.equal(entry.dataVersion, manifest.catalogVersion)
  }
  assert.equal(manifest.source.revision, revision)
  assert.equal(manifest.assetManifestVersion, null)
  assert.ok(readFileSync(new URL('../../public/licenses/thatskyapplication-utility.txt', import.meta.url), 'utf8').includes('Copyright (c) 2025 Jiralite'))
})
test('missing datasets, mixed revisions, fixture/unpublished records and malformed envelopes fail closed', () => {
  assert.equal(hasDataset(catalog.manifest, 'maps'), false)
  assert.equal(readCatalog(manifest, { ...releaseFiles, items: undefined }).valid, false)
  const absent = globalThis.structuredClone(manifest); delete absent.datasets.items
  assert.equal(readCatalog(absent, releaseFiles).valid, false)
  assert.equal(validateManifest({ ...manifest, schemaVersion: 99 }).valid, false)
  assert.equal(validateEnvelope({ ...releaseFiles.items, fixture: true }, manifest.catalogVersion).valid, false)
  assert.equal(validateEnvelope({ ...releaseFiles.items, dataVersion: 'other-release' }, manifest.catalogVersion).valid, false)
  const unpublished = globalThis.structuredClone(releaseFiles); unpublished.items.records[0].recordStatus = 'draft'
  assert.equal(readCatalog(manifest, unpublished).valid, false)
  assert.equal(readCatalog(manifest, { ...releaseFiles, items: { ...releaseFiles.items, records: [] } }).valid, false)
})
test('Items navigation, detail route and Vercel SPA reload are wired; Hub lookup is enabled', () => {
  assert.equal(destinations.items, '/items')
  const app = readFileSync(new URL('../../src/app/App.tsx', import.meta.url), 'utf8')
  const hub = readFileSync(new URL('../../src/features/hub/Hub.tsx', import.meta.url), 'utf8')
  const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'))
  assert.match(app, /path="\/items\/:id"/)
  assert.match(app, /path="\/items"/)
  assert.match(hub, /<Button type="submit">/)
  assert.ok(!/id="item-query"[^>]*readOnly/.test(hub))
  assert.ok(config.routes.some(rule => rule.src === '/(.*)' && rule.dest === '/index.html'))
})
