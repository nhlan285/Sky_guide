/* global structuredClone */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pagesOf, paginate, canonicalTitle, mapLimit } from '../../scripts/wiki/api.mjs'
import { readPages, stableRedirects } from '../../scripts/wiki/discover.mjs'
import { parseLuaData } from '../../scripts/wiki/lua.mjs'
import { matchBinding, classifyMedia, choosePrimary, parseImageInfo, extractBindings } from '../../scripts/wiki/map.mjs'
import { readCorpus, validateCorpus } from '../../scripts/wiki/output.mjs'
import { loadCatalogue } from '../../scripts/wiki/source.mjs'
import { enrichEntries, parseWikiIndex, parseWikiShard, selectWikiImage, wikiBucket } from '../../src/data/itemLookup/wiki.ts'
import { catalogResult } from '../../src/data/itemLookup/catalog.ts'
import { filterEntries, clearFilters } from '../../src/data/itemLookup/model.ts'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

const url = 'https://static.wikia.nocookie.net/sky-children-of-the-light/images/synthetic.png'
const fileUrl = 'https://sky-children-of-the-light.fandom.com/wiki/File:Synthetic.png'
const imagePage = { pageid: 42, title: 'File:Synthetic.png', revisions: [{ revid: 7 }], imageinfo: [{ url, thumburl: `${url}?width=480`, width: 800, height: 900, thumbwidth: 427, thumbheight: 480, mime: 'image/png', user: 'Fixture uploader', timestamp: '2026-01-01T00:00:00Z', descriptionurl: fileUrl, extmetadata: { LicenseShortName: { value: 'Fixture license' }, Artist: { value: 'Fixture artist' } } }] }
const catalogue = { items: [{ id: 'tsa-cosmetic-1', name: { default: 'Fixture Spirit · Cape' }, spiritIds: ['spirit'], seasonIds: [] }], lookup: [{ id: 'tsa-cosmetic-1', identifier: 'FixtureSpiritCape', category: 'cape' }], spirits: [{ id: 'spirit', name: { default: 'Fixture Spirit' } }], seasons: [] }
const binding = { key: 'fixture', names: ['Fixture Spirit Cape'], contextNames: ['Fixture Spirit'], category: 'cape', canonicalNames: [] }

test('MediaWiki parser supports formatversion 1 and 2 pages and missing queries', () => {
  assert.deepEqual(pagesOf({ query: { pages: { 42: imagePage } } }), [imagePage])
  assert.deepEqual(pagesOf({ query: { pages: [imagePage] } }), [imagePage])
  assert.deepEqual(pagesOf({}), [])
})
test('continuation forwards all tokens, preserves base arguments and rejects loops', async () => {
  const calls = []
  const result = await paginate(async params => { calls.push(params); return calls.length === 1 ? { continue: { continue: '||', imcontinue: 'image-2', plcontinue: 'link-2' } } : { batchcomplete: true } }, { titles: 'Fixture', prop: 'images|links' })
  assert.equal(result.length, 2)
  assert.deepEqual(calls[1], { titles: 'Fixture', prop: 'images|links', continue: '||', imcontinue: 'image-2', plcontinue: 'link-2' })
  await assert.rejects(paginate(async () => ({ continue: { continue: 'same' } }), {}), /Repeated/)
})
test('page reader merges paginated images and links instead of dropping earlier batches', async () => {
  let count = 0
  const result = await readPages({ request: async () => ++count === 1 ? { query: { pages: [{ title: 'Canonical', pageid: 1, images: [{ title: 'File:A.png' }], links: [{ title: 'First' }] }], redirects: [{ from: 'Alias', to: 'Canonical' }] }, continue: { imcontinue: '2' } } : { query: { pages: [{ title: 'Canonical', pageid: 1, images: [{ title: 'File:B.png' }], links: [{ title: 'Second' }] }] } } }, ['Alias'])
  assert.equal(result.pages[0].images.length, 2)
  assert.equal(result.pages[0].links.length, 2)
  assert.equal(result.redirects[0].to, 'Canonical')
})
test('canonical resolution chains normalized names and redirects without underscore self cycles', () => {
  const responses = [{ query: { normalized: [{ from: 'File:A_B.png', to: 'File:A B.png' }], redirects: [{ from: 'File:A B.png', to: 'File:C.png' }, { from: 'File:C.png', to: 'File:D.png' }] } }]
  assert.equal(canonicalTitle('File:A_B.png', responses), 'File:D.png')
  assert.throws(() => canonicalTitle('A', [{ query: { redirects: [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }] } }]), /cycle/)
})
test('parallel redirect batches serialize in a stable deduplicated order', () => {
  const first = { from: 'Z', to: 'C' }, second = { from: 'A', to: 'B' }
  assert.deepEqual(stableRedirects([first, second, first]), [second, first])
  assert.deepEqual(stableRedirects([second, first]), stableRedirects([first, second]))
})
test('concurrency limiter maintains input order and its configured ceiling', async () => {
  let active = 0, max = 0
  const result = await mapLimit([1, 2, 3, 4, 5], 2, async n => { active++; max = Math.max(max, active); await Promise.resolve(); active--; return n * 2 })
  assert.equal(max, 2); assert.deepEqual(result, [2, 4, 6, 8, 10])
})
test('Lua table parser handles literals/comments/aliases, reports duplicate keys and never executes code', () => {
  const diagnostics = []
  const data = parseLuaData('local data = { a = {name = "Cape", alt_name={"Alias", "Other"}, real="Cape.png"}, a={name="Later"} }\nreturn data', diagnostics)
  assert.equal(data.a.name, 'Later'); assert.equal(diagnostics.length, 1)
  assert.throws(() => parseLuaData('local data = { a = os.execute("bad") }'))
})
test('imageinfo extracts actual thumbnail/original URL and separate attribution without inventing permission', () => {
  const info = parseImageInfo(imagePage)
  assert.equal(info.thumbnailUrl, `${url}?width=480`); assert.equal(info.originalUrl, url)
  assert.equal(info.creditMetadata.Artist.value, 'Fixture artist')
  assert.equal(info.licenseMetadata.LicenseShortName.value, 'Fixture license')
  assert.equal(info.usageMetadata.permissionStatus, 'unverified')
  assert.equal(parseImageInfo({}), null)
  assert.equal(parseImageInfo({ ...imagePage, imageinfo: [{ ...imagePage.imageinfo[0], thumburl: undefined }] }).thumbnailUrl, url)
})
test('exact, explicit alias, manual override, ambiguous and unmapped matching', () => {
  assert.equal(matchBinding(binding, catalogue).status, 'exact')
  assert.equal(matchBinding({ ...binding, names: ['Other'], contextNames: [] }, catalogue, { aliases: { fixture: ['FixtureSpiritCape'] } }).status, 'exact')
  assert.equal(matchBinding({ ...binding, names: [] }, catalogue, { bindings: { fixture: { identifier: 'FixtureSpiritCape', reason: 'Reviewed fixture' } } }).status, 'manual')
  assert.throws(() => matchBinding(binding, catalogue, { bindings: { fixture: { identifier: 'missing', reason: 'bad' } } }))
  const duplicate = { ...catalogue, items: [...catalogue.items, { ...catalogue.items[0], id: 'tsa-cosmetic-2' }], lookup: [...catalogue.lookup, { ...catalogue.lookup[0], id: 'tsa-cosmetic-2' }] }
  assert.equal(matchBinding(binding, duplicate).status, 'ambiguous')
  assert.deepEqual(matchBinding({ ...binding, names: ['Other'], contextNames: [] }, catalogue).itemIds, [])
})
test('unique spirit/category match is permitted only for an unambiguous source variant', () => {
  assert.equal(matchBinding({ ...binding, names: [] }, catalogue).status, 'high-confidence')
  assert.equal(matchBinding({ ...binding, names: [], allowContext: false }, catalogue).status, 'unmapped')
})
test('variant extraction excludes generic placeholders and separates named seasonal variants', () => {
  const modules = [{ title: 'Module:Days/data', data: {} }, { title: 'Module:Days Item/data', data: {} }, { title: 'Module:Spirits/data', data: {} }, { title: 'Module:Seasons/data', revision: 1, data: { fixture: { name: 'Fixture Season', prop_m: 'One.png', prop_q: 'Two.png', hair: 'No-cosmetic.png' } } }]
  const bindings = extractBindings({ modules, pages: [] })
  assert.equal(bindings.length, 2)
  assert.ok(bindings.every(b => !b.allowContext && !b.names.length))
})
test('worn and alternate classification, quality ranking and shared generic assets', () => {
  assert.equal(classifyMedia('hair_front', 'Fixture.png'), 'worn-preview')
  assert.equal(classifyMedia('hair_real', 'Fixture screenshot.png'), 'worn-preview')
  assert.equal(classifyMedia('cape_back', 'Fixture.png'), 'alternate-view')
  const base = { ...parseImageInfo(imagePage), itemIds: ['one'] }
  const worn = { ...base, mediaId: 'a', mediaKind: 'worn-preview' }, icon = { ...base, mediaId: 'b', mediaKind: 'icon' }, clean = { ...base, mediaId: 'c', fileTitle: 'File:Clean isolated render.png', mediaKind: 'primary' }
  assert.equal(choosePrimary([worn, icon, clean]), clean)
  assert.equal(choosePrimary([worn, icon]), icon)
  assert.equal(choosePrimary([{ ...clean, itemIds: ['one', 'two'] }]), null)
  assert.equal(choosePrimary([{ ...clean, mime: 'video/youtube' }]), null)
})
test('instrument references on music-sheet and prop pages retain the instrument category', () => {
  const modules = [{ title: 'Module:Days/data', data: {} }, { title: 'Module:Days Item/data', revision: 1, data: { harp: { name: 'Fixture Harp', icon: 'Harp.png' } } }, { title: 'Module:Spirits/data', data: {} }, { title: 'Module:Seasons/data', data: {} }]
  const pages = [{ title: 'Music Sheets', revisions: [{ revid: 2, slots: { main: { content: '{{Instrument|Fixture Harp}}' } } }] }, { title: 'Held Props', revisions: [{ revid: 3, slots: { main: { content: '{{Days Item|Fixture Harp}}' } } }] }]
  const binding = extractBindings({ modules, pages })[0]
  assert.equal(binding.category, 'instrument')
  assert.equal(binding.categorySources.length, 2)
})

const manifest = JSON.parse(await readFile('src/data/itemLookup/wikiManifest.json', 'utf8'))
const rawIndex = JSON.parse(await readFile(`public${manifest.baseUrl}/index.json`, 'utf8'))
const ids = new Set(catalogResult.value.entries.map(e => e.id))
test('complete generated audit and runtime index validate, with representative categories mapped', async () => {
  const corpus = await readCorpus()
  assert.equal(validateCorpus(corpus, await loadCatalogue()), true)
  const index = parseWikiIndex(rawIndex, manifest.version, ids)
  for (const category of ['mask', 'cape', 'hair', 'outfit', 'shoes', 'head-accessory', 'instrument', 'prop']) {
    assert.ok(enrichEntries(catalogResult.value.entries, index).some(e => e.category === category && e.wiki.primary), category)
  }
  assert.throws(() => parseWikiIndex({ ...rawIndex, version: 'stale' }, manifest.version, ids))
  const modified = structuredClone(rawIndex), entry = Object.values(modified.entries).find(e => e.primary)
  entry.primary.thumbnailUrl = 'javascript:alert(1)'
  assert.throws(() => parseWikiIndex(modified, manifest.version, ids))
})
test('all generated detail shards validate and fit their stable catalogue buckets', async () => {
  for (const bucket of new Set([...ids].map(wikiBucket))) {
    const shard = parseWikiShard(JSON.parse(await readFile(`public${manifest.baseUrl}/items-${bucket}.json`, 'utf8')), manifest.version, ids)
    assert.ok(Object.keys(shard.entries).every(id => wikiBucket(id) === bucket))
  }
})
test('enrichment fills unknown facts, preserves verified facts and supports alias/category filtering', () => {
  const index = parseWikiIndex(rawIndex, manifest.version, ids)
  const enriched = enrichEntries(catalogResult.value.entries, index)
  const instruments = filterEntries(enriched, { ...clearFilters(), category: 'instrument' })
  assert.ok(instruments.length > 0)
  for (const original of catalogResult.value.entries) {
    const next = enriched.find(e => e.id === original.id)
    assert.deepEqual(next.item.acquisitionOptions, original.item.acquisitionOptions)
    if (original.category !== 'unknown') assert.equal(next.category, original.category)
    if (original.item.seasonIds.length) assert.deepEqual(next.item.seasonIds, original.item.seasonIds)
  }
  const alias = instruments[0].wiki.aliases[0]
  assert.ok(filterEntries(enriched, { ...clearFilters(), query: alias }).some(e => e.id === instruments[0].id))
})
test('real image resolves ahead of placeholder, and failures remain neutral without a glyph URL', () => {
  const media = Object.values(rawIndex.entries).find(e => e.primary).primary
  assert.equal(selectWikiImage(media), media.thumbnailUrl)
  assert.equal(selectWikiImage(media, false, media.thumbnailUrl), null)
  assert.equal(selectWikiImage(null), null)
  assert.equal(selectWikiImage({ ...media, thumbnailUrl: 'javascript:bad' }), null)
  assert.equal(selectWikiImage({ ...media, originalUrl: url, width: 4000, height: 4000 }, true), media.thumbnailUrl)
})
test('asset component SSR renders actual lazy media or a neutral message, never a category glyph', async () => {
  const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
  try {
    const { ItemThumbnail } = await server.ssrLoadModule('/src/features/items/ItemThumbnail.tsx')
    const { LocaleProvider } = await server.ssrLoadModule('/src/shared/i18n/useLocale.tsx')
    const enriched = enrichEntries(catalogResult.value.entries, parseWikiIndex(rawIndex, manifest.version, ids))
    const render = entry => renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ItemThumbnail, { entry })))
    const real = render(enriched.find(e => e.wiki.primary))
    assert.ok(real.includes('static.wikia.nocookie.net')); assert.ok(real.includes('loading="lazy"')); assert.ok(real.includes('decoding="async"'))
    const missing = render({ ...enriched[0], wiki: undefined, images: null, image: null })
    assert.ok(missing.includes('Chưa có hình ảnh')); assert.ok(!missing.includes('<svg')); assert.ok(!missing.includes('<img'))
    assert.ok(!real.includes('category-glyph')); assert.ok(!real.includes('Sky Wiki'))
  } finally { await server.close() }
})
