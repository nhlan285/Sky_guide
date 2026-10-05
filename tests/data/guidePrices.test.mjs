import assert from 'node:assert/strict'
import test from 'node:test'
import { validateGeography } from '../../src/data/catalog/geography.ts'
import { validateIapProduct, validatePriceDecimal, validatePriceObservation, validateItemPriceMapping, validateCostEstimate } from '../../src/data/catalog/prices.ts'

const metadata = { provenanceIds: ['fixture-source'], updatedAt: '2026-10-04T00:00:00Z', recordStatus: 'draft', fixture: true }
const name = { default: 'Synthetic fixture', translations: {} }
const context = { ...Object.fromEntries(['treeIds', 'nodeIds', 'realmIds', 'mapIds', 'articleIds', 'ruleIds', 'visitIds'].map(key => [key, new Set()])), provenanceIds: new Set(['fixture-source']), itemIds: new Set(['fixture-item']), spiritIds: new Set(), seasonIds: new Set(['fixture-season']), assetIds: new Set(['fixture-map-art']), iapProductIds: new Set(['fixture-product']) }
function geography() {
  return {
    realms: [{ ...metadata, id: 'fixture-realm', name }],
    maps: [{ ...metadata, id: 'fixture-map', name, realmId: 'fixture-realm', seasonIds: ['fixture-season'], assetId: 'fixture-map-art', revision: 'r1', coordinateSystem: 'normalized_top_left', width: 100, height: 200 }],
    markers: [{ ...metadata, id: 'fixture-marker', mapId: 'fixture-map', mapRevision: 'r1', kind: 'route_point', label: name, x: 0.2, y: 0.5, description: null }],
    routes: [{ ...metadata, id: 'fixture-route', title: name, realmIds: ['fixture-realm'], seasonIds: [], mapIds: ['fixture-map'], scope: 'other', stepIds: ['fixture-step'], contentVersion: 'r1', verifiedForVersion: null, spoilerLevel: 'none' }],
    steps: [{ ...metadata, id: 'fixture-step', routeId: 'fixture-route', order: 0, body: 'Synthetic instruction', mapMarkerId: 'fixture-marker', sourceTimestamp: null, caution: null }],
  }
}
test('geography preserves known coordinates, explicit unknowns and text-only fallback', () => {
  const value = geography()
  assert.equal(validateGeography(value, context).valid, true)
  value.maps[0].assetId = null; value.maps[0].coordinateSystem = 'none'
  value.markers[0].x = null; value.markers[0].y = null
  assert.equal(validateGeography(value, context).valid, true)
})
test('maps reject stale calibration, out-of-range coordinates and dangling references', () => {
  for (const mutate of [
    v => { v.markers[0].x = -0.1 }, v => { v.markers[0].y = 1.01 }, v => { v.markers[0].x = Infinity },
    v => { v.markers[0].x = null }, v => { v.maps[0].revision = 'r2' }, v => { v.maps[0].realmId = 'missing' },
    v => { v.maps[0].width = 0 }, v => { v.maps[0].height = null }, v => { v.maps[0].assetId = null },
    v => { v.markers[0].mapId = 'missing' }, v => { v.maps.push(v.maps[0]) },
  ]) { const value = geography(); mutate(value); assert.equal(validateGeography(value, context).valid, false) }
})
test('route membership, order and marker maps are checked in both directions', () => {
  for (const mutate of [v => { v.routes[0].stepIds = [] }, v => { v.routes[0].mapIds = [] }, v => { v.steps[0].routeId = 'missing' }, v => { v.steps[0].order = -1 }, v => { v.steps.push({ ...v.steps[0], id: 'fixture-second' }); v.routes[0].stepIds.push('fixture-second') }]) {
    const value = geography(); mutate(value); assert.equal(validateGeography(value, context).valid, false)
  }
})
test('geography field allowlists remove operational evidence from all entities', () => {
  const value = geography()
  for (const records of Object.values(value)) records[0].privateEvidence = 'PRIVATE_SENTINEL'
  assert.equal(JSON.stringify(validateGeography(value, context).value).includes('PRIVATE_SENTINEL'), false)
})

const product = () => ({ ...metadata, id: 'fixture-product', platform: 'ios', storeProductId: null, name, contents: [{ kind: 'currency', currency: 'fixture-currency', quantity: 10, itemId: null }], contentStatus: 'known' })
const price = () => ({ ...metadata, id: 'fixture-price', productId: 'fixture-product', market: 'US', currencyCode: 'USD', amountDecimal: '1.25', observedAt: metadata.updatedAt, validFrom: null, validTo: null, taxStatus: 'unknown', promotionStatus: 'unknown', sourceId: 'K10' })
const priceContext = () => ({ catalog: context, products: new Map([['fixture-product', product()]]), observations: new Map([['fixture-price', price()]]), acquisitionOwners: new Map([['fixture-option', 'fixture-item']]), convertibleCurrencies: new Set(['fixture-currency']) })
const mapping = () => ({ ...metadata, id: 'fixture-mapping', itemId: 'fixture-item', acquisitionOptionId: 'fixture-option', mode: 'currency_bundle_estimate', productIds: ['fixture-product'], conversionEvidenceIds: ['fixture-source'], assumptions: ['Synthetic conversion only'] })
const estimate = () => ({ itemId: 'fixture-item', market: 'US', currencyCode: 'USD', platform: 'ios', priceObservationIds: ['fixture-price'], methodVersion: 'fixture-v1', requiredCurrency: [{ currency: 'other', sourceCurrencyLabel: 'fixture-currency', amount: 10 }], proportionalAmount: '1.25', checkoutAmount: '1.25', bundleCounts: { 'fixture-product': 1 }, leftoverCurrency: [], coverage: 'complete', assumptions: ['Synthetic test only'], computedAt: metadata.updatedAt })

test('price decimals stay exact strings and unknown contents never become free', () => {
  for (const value of ['0', '0.00', '12345678901234567890.1234']) assert.equal(validatePriceDecimal(value).valid, true)
  for (const value of [0, -1, '-1', '1e3', '01', 'NaN', '1,20']) assert.equal(validatePriceDecimal(value).valid, false)
  const value = product(); value.contents[0].quantity = null
  assert.equal(validateIapProduct(value, context).valid, false)
  value.contentStatus = 'partial'
  assert.equal(validateIapProduct(value, context).value.contents[0].quantity, null)
  assert.equal(validateIapProduct({ ...product(), contents: [] }, context).valid, false)
})
test('observations preserve market and store platform, reject negative prices and reversed dates', () => {
  assert.equal(validatePriceObservation(price(), priceContext()).valid, true)
  for (const change of [{ amountDecimal: '-1' }, { sourceId: 'K11' }, { productId: 'missing' }, { market: 'us' }, { currencyCode: 'usd' }, { validFrom: { value: '2026-10-05', precision: 'date', timezone: null, rawLabel: null }, validTo: { value: '2026-10-04', precision: 'date', timezone: null, rawLabel: null } }]) assert.equal(validatePriceObservation({ ...price(), ...change }, priceContext()).valid, false)
})
test('mapping needs explicit product contents and reviewed currency evidence', () => {
  assert.equal(validateItemPriceMapping(mapping(), priceContext()).valid, true)
  for (const change of [{ conversionEvidenceIds: [] }, { productIds: [] }, { mode: 'direct_iap' }, { acquisitionOptionId: 'missing' }]) assert.equal(validateItemPriceMapping({ ...mapping(), ...change }, priceContext()).valid, false)
  const mixed = priceContext(); mixed.products.get('fixture-product').contents.push({ kind: 'item', itemId: 'fixture-item', quantity: 1, currency: null })
  assert.equal(validateItemPriceMapping(mapping(), mixed).valid, false)
  assert.equal(validateItemPriceMapping({ ...mapping(), mode: 'direct_iap' }, mixed).valid, true)
})
test('estimates reject mixed market/currency/platform and duplicate historical prices', () => {
  assert.equal(validateCostEstimate(estimate(), priceContext()).valid, true)
  for (const change of [{ market: 'VN' }, { currencyCode: 'VND' }, { platform: 'android' }, { bundleCounts: { missing: 1 } }, { checkoutAmount: '-1' }]) assert.equal(validateCostEstimate({ ...estimate(), ...change }, priceContext()).valid, false)
  const history = priceContext(); history.observations.set('fixture-price-old', { ...price(), id: 'fixture-price-old' })
  assert.equal(validateCostEstimate({ ...estimate(), priceObservationIds: ['fixture-price', 'fixture-price-old'] }, history).valid, false)
})
test('unknown conversions and unavailable estimates cannot claim a complete price', () => {
  const value = estimate(); value.requiredCurrency[0].amount = null
  assert.equal(validateCostEstimate(value, priceContext()).valid, false)
  value.coverage = 'partial'
  assert.equal(validateCostEstimate(value, priceContext()).valid, true)
  assert.equal(validateCostEstimate(estimate(), { ...priceContext(), convertibleCurrencies: new Set() }).valid, false)
  assert.equal(validateCostEstimate({ ...estimate(), coverage: 'unavailable' }, priceContext()).valid, false)
  const unavailable = { ...estimate(), coverage: 'unavailable', proportionalAmount: null, checkoutAmount: null, bundleCounts: {} }
  assert.equal(validateCostEstimate(unavailable, priceContext()).valid, true)
  assert.equal(validateCostEstimate({ ...estimate(), privateEvidence: 'PRIVATE_SENTINEL' }, priceContext()).value.privateEvidence, undefined)
})
