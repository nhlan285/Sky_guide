import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import { resolveItemImage, validateCatalogueImage, validateImageRegistry } from '../../src/data/itemLookup/images.ts'
import { validateLookupMetadata, filterEntries, clearFilters } from '../../src/data/itemLookup/model.ts'
import { catalogResult } from '../../src/data/itemLookup/catalog.ts'
import { catalogueSummary } from '../../src/data/itemLookup/summary.ts'
import { itemCopy } from '../../src/features/items/copy.ts'
import { translations } from '../../src/shared/i18n/translations.ts'
import { outsideBounds } from '../../src/features/constellation/dialog.ts'

// Synthetic metadata exercises the pipeline; this is not a deployed or approved item image.
const image = {
  url: 'https://example.org/test-thumbnail.webp', sourceUrl: 'https://example.org/test-file',
  credit: 'Synthetic test author', license: 'Synthetic test license', revision: 'test-revision-1',
  permissionUrl: 'https://example.org/test-permission', verifiedAt: '2026-10-03T00:00:00Z', reuseStatus: 'verified',
}
assert.equal(catalogResult.valid, true)
const catalog = catalogResult.value
const sample = catalog.entries.find(entry => entry.category === 'hair')
const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8')

test('verified image metadata resolves with independent credit, permission and revision', () => {
  assert.deepEqual(validateCatalogueImage(image), { valid: true, value: image })
  assert.deepEqual(resolveItemImage(image), image)
  assert.equal(validateCatalogueImage({ ...image, url: '/media/items/test-thumbnail.webp', revision: null }).valid, true)
})
test('missing, unverified and failed media safely select the category fallback', () => {
  for (const value of [undefined, null, {}, { ...image, reuseStatus: 'pending' }]) assert.equal(resolveItemImage(value), null)
  assert.equal(resolveItemImage(image, image.url), null)
  assert.deepEqual(resolveItemImage(image, 'https://example.org/another-image.webp'), image)
  assert.ok(catalog.entries.every(entry => resolveItemImage(entry.image) === null))
})
test('an image cannot default to verified permission or omit reuse evidence', () => {
  for (const key of ['sourceUrl', 'credit', 'license', 'permissionUrl', 'verifiedAt', 'reuseStatus', 'revision']) {
    const missing = { ...image }; delete missing[key]
    assert.equal(validateCatalogueImage(missing).valid, false, key)
  }
  for (const patch of [{ license: '' }, { credit: ' ' }, { revision: '' }, { verifiedAt: '2026-02-30T00:00:00Z' }]) assert.equal(validateCatalogueImage({ ...image, ...patch }).valid, false)
})
test('unsafe image and evidence URLs are rejected', () => {
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,abc', 'http://example.org/a.png', 'https://user:password@example.org/a.png', '/media/items/../a.png', '/media/items/a.svg', '//example.org/a.png']) {
    assert.equal(validateCatalogueImage({ ...image, url }).valid, false, url)
  }
  for (const key of ['sourceUrl', 'permissionUrl']) assert.equal(validateCatalogueImage({ ...image, [key]: 'javascript:alert(1)' }).valid, false)
})
test('presentation registry binds only known item IDs and rejects duplicate media assignments', () => {
  const registry = { schemaVersion: 1, records: [{ itemId: sample.id, image }] }
  const ids = new Set([sample.id])
  assert.deepEqual(validateImageRegistry(registry, ids), { valid: true, value: registry })
  assert.equal(validateImageRegistry(registry, new Set()).valid, false)
  assert.equal(validateImageRegistry({ ...registry, records: [...registry.records, ...registry.records] }, ids).valid, false)
  assert.equal(validateImageRegistry({ ...registry, schemaVersion: 2 }, ids).valid, false)
})
test('optional presentation metadata preserves factual records and rejects invalid attached images', () => {
  const legacy = { ...sample }; delete legacy.image
  assert.equal(validateLookupMetadata(legacy).valid, true)
  const decorated = validateLookupMetadata({ ...sample, image })
  assert.equal(decorated.valid, true)
  assert.deepEqual(decorated.value.image, image)
  assert.equal(validateLookupMetadata({ ...sample, image: { ...image, license: null } }).valid, false)
  const decoratedEntry = { ...sample, image }
  assert.deepEqual(filterEntries([decoratedEntry], { ...clearFilters(), query: sample.item.name.default, category: 'hair' }), [decoratedEntry])
  assert.deepEqual(decoratedEntry.item.provenanceIds, sample.item.provenanceIds)
})
test('upstream attribution and revision remain in dedicated credits and the full MIT notice', () => {
  assert.ok(catalog.provenance.every(source => source.sourceRevision === catalogueSummary.revision && source.licenseNote.includes('MIT')))
  const credits = read('src/features/items/SourceCredits.tsx')
  assert.match(credits, /<details className="catalogue-credits">/)
  assert.match(credits, /ThatSkyApplication public utility dataset/)
  assert.match(credits, /catalogueSummary.revision/)
  assert.match(read('src/app/App.tsx'), /<SourceCredits \/>/)
  const notice = read('public/licenses/thatskyapplication-utility.txt')
  assert.match(notice, /Copyright \(c\) 2025 Jiralite/)
  assert.match(notice, /The above copyright notice and this permission notice/)
  assert.ok(notice.includes(catalogueSummary.revision))
  for (const locale of ['vi', 'en']) {
    assert.ok(!JSON.stringify(itemCopy[locale]).includes('TSA ·'))
    assert.ok(!JSON.stringify(translations[locale]).includes('ThatSkyApplication'))
  }
  assert.ok(!read('src/features/items/Items.tsx').includes('sourceBadge'))
  assert.ok(!read('src/features/hub/Hub.tsx').includes('source-strip'))
})
test('backdrop bounds distinguish outside taps from dialog content and edges', () => {
  const rect = { left: 10, right: 390, top: 300, bottom: 780 }
  for (const [x, y] of [[9, 500], [391, 500], [200, 299], [200, 781]]) assert.equal(outsideBounds(x, y, rect), true)
  for (const [x, y] of [[200, 500], [10, 300], [390, 780]]) assert.equal(outsideBounds(x, y, rect), false)
})
