import test from 'node:test'
import assert from 'node:assert/strict'
import { URL, URLSearchParams } from 'node:url'
import { catalogResult } from '../../src/data/itemLookup/catalog.ts'
import { activeFilterValues, clearFilterParams, contextualLookupUrl, filterEntries, filtersFromParams, lookupById, updateFilterParams } from '../../src/data/itemLookup/model.ts'
import { displayMedia, imageSources, validateItemImages, validateMedia, validateMediaRegistry } from '../../src/data/itemLookup/media.ts'
import { createServer } from 'vite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

assert.equal(catalogResult.valid, true)
const catalog = catalogResult.value
const paramsOf = path => new URL(path, 'https://example.org').searchParams
const image = {
  url: 'https://example.org/synthetic.webp', sourceUrl: 'https://example.org/synthetic-file', credit: 'Synthetic fixture author',
  license: 'Synthetic fixture license', revision: null, permissionUrl: 'https://example.org/synthetic-permission',
  verifiedAt: '2026-10-03T00:00:00Z', reuseStatus: 'verified', sourceLabel: 'Synthetic fixture source', note: null,
}
const reference = {
  url: null, sourceUrl: 'https://example.org/unreviewed-file', identitySourceUrl: 'https://example.org/identity-evidence',
  credit: null, revision: null, checkedAt: '2026-10-03T00:00:00Z', reuseStatus: 'reference-only', sourceLabel: 'Synthetic source', note: 'Permission unknown; link only.',
}

test('season context link opens a URL-hydrated catalogue constrained to Season of Abyss', () => {
  const season = catalog.seasons.find(s => s.name.default === 'Season of Abyss')
  assert.ok(season)
  const params = paramsOf(contextualLookupUrl(new URLSearchParams(), 'season', season.id))
  assert.equal(params.get('season'), season.id)
  const results = filterEntries(catalog.entries, filtersFromParams(params))
  assert.ok(results.length > 1)
  assert.ok(results.every(entry => entry.item.seasonIds.includes(season.id)))
  assert.deepEqual(activeFilterValues(params), [{ key: 'season', value: season.id }])
})
test('spirit context link opens a URL-hydrated catalogue constrained to Abyss Guide', () => {
  const spirit = catalog.spirits.find(s => s.name.default === 'Abyss Guide')
  assert.ok(spirit)
  const params = paramsOf(contextualLookupUrl(new URLSearchParams(), 'spirit', spirit.id))
  const results = filterEntries(catalog.entries, filtersFromParams(params))
  assert.ok(results.length > 1)
  assert.ok(results.every(entry => entry.item.spiritIds.includes(spirit.id)))
})
test('category context links use the stable category and show only neck accessories', () => {
  const params = paramsOf(contextualLookupUrl(new URLSearchParams(), 'category', 'neck-accessory'))
  const results = filterEntries(catalog.entries, filtersFromParams(params))
  assert.ok(results.length)
  assert.ok(results.every(entry => entry.category === 'neck-accessory'))
})
test('context links preserve unrelated filters/search while clearing stale pagination', () => {
  const previous = new URLSearchParams('q=Angler&category=hair&season=tsa-season-11&page=5')
  const path = contextualLookupUrl(previous, 'spirit', 'tsa-spirit-115')
  const params = paramsOf(path)
  assert.equal(params.get('q'), 'Angler')
  assert.equal(params.get('category'), 'hair')
  assert.equal(params.get('season'), 'tsa-season-11')
  assert.equal(params.get('spirit'), 'tsa-spirit-115')
  assert.equal(params.has('page'), false)
  assert.equal(previous.get('page'), '5')
  assert.equal(previous.has('spirit'), false)
  const results = filterEntries(catalog.entries, filtersFromParams(params))
  assert.ok(results.some(entry => entry.identifier === 'AnxiousAnglerHair'))
  assert.ok(results.every(entry => entry.category === 'hair' && entry.item.spiritIds.includes('tsa-spirit-115') && entry.item.seasonIds.includes('tsa-season-11')))
})
test('refresh/share hydrates all URL filters and individual removal retains other filters', () => {
  const original = new URLSearchParams('q=Abyss&category=mask&slot=mask&season=tsa-season-11&spirit=tsa-spirit-114&acquisition=spirit-seasonal')
  const refreshed = new URLSearchParams(original.toString())
  assert.deepEqual(filtersFromParams(refreshed), filtersFromParams(original))
  assert.equal(activeFilterValues(refreshed).length, 6)
  const next = updateFilterParams(refreshed, 'season', '')
  assert.equal(next.has('season'), false)
  assert.equal(next.get('spirit'), 'tsa-spirit-114')
  assert.equal(next.get('q'), 'Abyss')
  assert.equal(activeFilterValues(next).length, 5)
})
test('clear filters removes query state and paging without mutating the detail back URL', () => {
  const back = new URLSearchParams('q=Abyss&category=mask&slot=mask&season=tsa-season-11&spirit=tsa-spirit-114&acquisition=shop&page=4')
  const cleared = clearFilterParams(back)
  assert.equal(cleared.size, 0)
  assert.equal(filterEntries(catalog.entries, filtersFromParams(cleared)).length, catalog.entries.length)
  assert.equal(back.get('page'), '4')
  assert.ok(lookupById(catalog.entries, 'tsa-cosmetic-1275'))
})
test('primary image metadata resolves approved media, preserving attribution separately from item identity', () => {
  const result = validateItemImages({ primary: image })
  assert.equal(result.valid, true)
  assert.deepEqual(displayMedia(result.value.primary), image)
  assert.deepEqual(result.value.gallery, [])
  assert.deepEqual(imageSources(result.value), [image])
})
test('gallery is optional and independently validates worn-preview and reference image kinds', () => {
  const result = validateItemImages({ gallery: [{ ...image, kind: 'worn-preview' }] })
  assert.equal(result.valid, true)
  assert.equal(result.value.primary, null)
  assert.equal(result.value.gallery[0].kind, 'worn-preview')
  assert.ok(displayMedia(result.value.gallery[0]))
  assert.equal(validateItemImages({ gallery: [{ ...image, kind: 'invented' }] }).valid, false)
  assert.equal(validateItemImages({ gallery: [{ ...image }] }).valid, false)
})
test('missing/empty media sets and failed downloads fall back without requiring images on every item', () => {
  assert.deepEqual(validateItemImages({}), { valid: true, value: { primary: null, gallery: [] } })
  assert.equal(displayMedia(undefined), null)
  assert.equal(displayMedia(image, image.url), null)
  assert.deepEqual(imageSources(null), [])
  assert.ok(catalog.entries.some(entry => !entry.images))
})
test('uncleared Wiki references remain link-only and cannot smuggle image URLs or approved status', () => {
  assert.deepEqual(validateMedia(reference), { valid: true, value: reference })
  assert.equal(displayMedia(reference), null)
  assert.equal(validateMedia({ ...reference, url: image.url }).valid, false)
  assert.equal(validateMedia({ ...reference, reuseStatus: 'verified' }).valid, false)
  assert.equal(validateMedia({ ...reference, sourceUrl: 'javascript:alert(1)' }).valid, false)
})
test('curated source mapping is validated against stable IDs; duplicate/unknown records fail closed', () => {
  const registry = { schemaVersion: 1, records: [{ itemId: 'tsa-cosmetic-1211', images: { primary: reference } }] }
  const ids = new Set(catalog.entries.map(entry => entry.id))
  assert.equal(validateMediaRegistry(registry, ids).valid, true)
  assert.equal(validateMediaRegistry(registry, new Set()).valid, false)
  assert.equal(validateMediaRegistry({ ...registry, records: [...registry.records, ...registry.records] }, ids).valid, false)
  assert.equal(validateMediaRegistry({ ...registry, schemaVersion: 99 }, ids).valid, false)
  const sample = lookupById(catalog.entries, 'tsa-cosmetic-1211')
  assert.equal(sample.images.primary.sourceLabel, 'Sky Wiki')
  assert.equal(sample.images.gallery[0].kind, 'worn-preview')
  assert.equal(displayMedia(sample.images.primary), null)
  assert.ok(sample.images.primary.identitySourceUrl.includes('Season_Item'))
  assert.equal(sample.item.name.default.includes('Sky Wiki'), false)
})

test('thumbnail suppresses legacy external primary/gallery media and shows neutral local-asset fallback', async () => {
  // Compile components locally and render static markup. No browser, navigation, image download or screenshot.
  const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
  try {
    const { ItemThumbnail } = await server.ssrLoadModule('/src/features/items/ItemThumbnail.tsx')
    const { LocaleProvider } = await server.ssrLoadModule('/src/shared/i18n/useLocale.tsx')
    const sample = lookupById(catalog.entries, 'tsa-cosmetic-1211')
    const render = props => renderToStaticMarkup(createElement(LocaleProvider, null, createElement(ItemThumbnail, { entry: sample, ...props })))
    const approved = render({ entry: { ...sample, images: { primary: image, gallery: [] } } })
    assert.ok(approved.includes('item-thumbnail__placeholder'))
    assert.ok(!approved.includes('<img'))
    assert.ok(!approved.includes('Synthetic fixture source'))
    const preview = render({ media: { ...image, kind: 'worn-preview' }, description: 'Synthetic worn preview' })
    assert.ok(!preview.includes('<img'))
    for (const entry of [sample, { ...sample, images: null, image: null }]) {
      const fallback = render({ entry })
      assert.ok(fallback.includes('item-thumbnail__placeholder'))
      assert.ok(!fallback.includes('<img'))
    }
  } finally {
    await server.close()
  }
})

test('detail markup wires real contextual links and list markup exposes URL-hydrated active filters', async () => {
  const server = await createServer({ logLevel: 'silent', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom' })
  try {
    const { Items } = await server.ssrLoadModule('/src/features/items/Items.tsx')
    const { LocaleProvider } = await server.ssrLoadModule('/src/shared/i18n/useLocale.tsx')
    const render = (path, route) => renderToStaticMarkup(createElement(LocaleProvider, null,
      createElement(MemoryRouter, { initialEntries: [path] }, createElement(Routes, null, createElement(Route, { path: route, element: createElement(Items) }))),
    ))
    const detail = render('/items/tsa-cosmetic-1275?category=mask', '/items/:id')
    assert.ok(detail.includes('href="/items?category=mask&amp;season=tsa-season-11"'))
    assert.ok(detail.includes('href="/items?category=mask&amp;spirit=tsa-spirit-114"'))
    assert.ok(detail.includes('Season of Abyss'))
    assert.ok(detail.includes('Abyss Guide'))
    assert.ok(detail.includes('href="/items?category=mask"'))
    const list = render('/items?season=tsa-season-11&spirit=tsa-spirit-114', '/items')
    assert.ok(list.includes('active-filters'))
    assert.ok(list.includes('Mùa: <strong>Season of Abyss</strong>'))
    assert.ok(list.includes('Spirit: <strong>Abyss Guide</strong>'))
    assert.ok(list.includes('Bỏ lọc Mùa: Season of Abyss'))
    const referenceDetail = render('/items/tsa-cosmetic-1211', '/items/:id')
    assert.ok(referenceDetail.includes('item-media-sources'))
    assert.ok(referenceDetail.includes('Chỉ liên kết tham khảo'))
    assert.ok(!referenceDetail.includes('src="https://sky-children-of-the-light.fandom.com'))
  } finally {
    await server.close()
  }
})
