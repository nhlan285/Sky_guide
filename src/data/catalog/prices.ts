import { enumeration, failure, nullable, object, success, validateCurrencyAmount, validateDateTime, validateId, validatePartialTime } from '../core/index.ts'
import type { CurrencyAmount, PartialTime, ValidationResult } from '../core/index.ts'
import type { CatalogContext, DomainMetadata, LocalizedText } from './types.ts'
import { array, metadataFields, nonBlank, rangeErrors, record, reference, references, unique, validateLocalizedText } from './shared.ts'

export interface IapContent { kind: 'currency' | 'item' | 'unknown'; currency: string | null; quantity: number | null; itemId: string | null }
export interface IapProduct extends DomainMetadata {
  id: string; platform: 'ios' | 'android'; storeProductId: string | null; name: LocalizedText
  contents: IapContent[]; contentStatus: 'known' | 'partial' | 'unknown'
}
export interface PriceObservation extends DomainMetadata {
  id: string; productId: string; market: string; currencyCode: string; amountDecimal: string
  observedAt: string; validFrom: PartialTime | null; validTo: PartialTime | null
  taxStatus: 'included' | 'excluded' | 'unknown'; promotionStatus: 'regular' | 'promotion' | 'unknown'
  sourceId: 'K10' | 'K11' | 'K12'
}
export interface ItemPriceMapping extends DomainMetadata {
  id: string; itemId: string; acquisitionOptionId: string
  mode: 'direct_iap' | 'currency_bundle_estimate' | 'unavailable'; productIds: string[]
  conversionEvidenceIds: string[]; assumptions: string[]
}
export interface CostEstimate {
  itemId: string; market: string; currencyCode: string; platform: 'ios' | 'android'
  priceObservationIds: string[]; methodVersion: string; requiredCurrency: CurrencyAmount[]
  proportionalAmount: string | null; checkoutAmount: string | null; bundleCounts: Record<string, number>
  leftoverCurrency: CurrencyAmount[]; coverage: 'complete' | 'partial' | 'unavailable'
  assumptions: string[]; computedAt: string
}
export interface PriceContext {
  catalog: CatalogContext
  products: ReadonlyMap<string, IapProduct>
  observations: ReadonlyMap<string, PriceObservation>
  acquisitionOwners: ReadonlyMap<string, string>
  // Approved currency conversions, not inferred from store price or availability.
  convertibleCurrencies: ReadonlySet<string>
}
const integer = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? success(value) : failure('invalid_value', 'Expected a nonnegative integer.')
export const validatePriceDecimal = (value: unknown): ValidationResult<string> => typeof value === 'string' && value.length <= 100 && /^(0|[1-9]\d*)(\.\d+)?$/.test(value) ? success(value) : failure('invalid_value', 'Expected an exact nonnegative decimal string.')
const market = (value: unknown) => typeof value === 'string' && /^[A-Z]{2}$/.test(value) ? success(value) : failure('invalid_value', 'Expected market code.')
const currency = (value: unknown) => typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? success(value) : failure('invalid_value', 'Expected currency code.')

function content(input: unknown, context: CatalogContext): ValidationResult<IapContent> {
  const result = object<IapContent>(input, { kind: enumeration(['currency', 'item', 'unknown']), currency: nullable(nonBlank), quantity: nullable(integer), itemId: nullable(reference(context.itemIds)) })
  if (!result.valid) return result
  const value = result.value
  if (value.kind === 'currency' && (!value.currency || value.itemId !== null)) return failure('invalid_relationship', 'Currency content must name its currency and cannot claim an item.')
  if (value.kind === 'item' && (!value.itemId || value.currency !== null)) return failure('invalid_relationship', 'Item content must name its item and cannot claim a currency.')
  if (value.kind === 'unknown' && (value.itemId !== null || value.currency !== null || value.quantity !== null)) return failure('invalid_relationship', 'Unknown content cannot invent item/quantity/currency.')
  return result
}
export function validateIapProduct(input: unknown, context: CatalogContext): ValidationResult<IapProduct> {
  const result = object<IapProduct>(input, { ...metadataFields(input, context), id: validateId, platform: enumeration(['ios', 'android']), storeProductId: nullable(nonBlank), name: validateLocalizedText,
    contents: array(value => content(value, context)), contentStatus: enumeration(['known', 'partial', 'unknown']) })
  if (!result.valid) return result
  const value = result.value
  if (value.contentStatus === 'known' && (!value.contents.length || value.contents.some(entry => entry.kind === 'unknown' || entry.kind === 'currency' && entry.quantity === null))) return failure('invalid_relationship', 'Known contents require complete evidence.')
  return result
}
export function validatePriceObservation(input: unknown, context: PriceContext): ValidationResult<PriceObservation> {
  const result = object<PriceObservation>(input, { ...metadataFields(input, context.catalog), id: validateId, productId: reference(new Set(context.products.keys())), market, currencyCode: currency, amountDecimal: validatePriceDecimal,
    observedAt: validateDateTime, validFrom: nullable(validatePartialTime), validTo: nullable(validatePartialTime), taxStatus: enumeration(['included', 'excluded', 'unknown']),
    promotionStatus: enumeration(['regular', 'promotion', 'unknown']), sourceId: enumeration(['K10', 'K11', 'K12']) })
  if (!result.valid) return result
  const value = result.value
  const platform = context.products.get(value.productId)!.platform
  if (value.sourceId === 'K10' && platform !== 'ios' || value.sourceId === 'K11' && platform !== 'android') return failure('invalid_relationship', 'Store observation does not match product platform.')
  const errors = rangeErrors(value.validFrom, value.validTo, ['validTo'])
  return errors.length ? { valid: false, errors } : result
}
export function validateItemPriceMapping(input: unknown, context: PriceContext): ValidationResult<ItemPriceMapping> {
  const result = object<ItemPriceMapping>(input, { ...metadataFields(input, context.catalog), id: validateId, itemId: reference(context.catalog.itemIds), acquisitionOptionId: reference(new Set(context.acquisitionOwners.keys())),
    mode: enumeration(['direct_iap', 'currency_bundle_estimate', 'unavailable']), productIds: references(new Set(context.products.keys())),
    conversionEvidenceIds: references(context.catalog.provenanceIds), assumptions: array(nonBlank) })
  if (!result.valid) return result
  const value = result.value
  if (context.acquisitionOwners.get(value.acquisitionOptionId) !== value.itemId) return failure('invalid_relationship', 'Acquisition option belongs to another item.')
  if (value.mode !== 'unavailable' && !value.productIds.length) return failure('invalid_relationship', 'Available mapping needs product evidence.')
  if (value.mode === 'direct_iap' && value.productIds.some(id => !context.products.get(id)!.contents.some(entry => entry.kind === 'item' && entry.itemId === value.itemId))) return failure('invalid_relationship', 'Direct IAP product must explicitly contain this item.')
  if (value.mode === 'currency_bundle_estimate' && (!value.conversionEvidenceIds.length || !value.assumptions.length || value.productIds.some(id => {
    const product = context.products.get(id)!
    return product.contentStatus !== 'known' || product.contents.some(entry => entry.kind !== 'currency' || !entry.currency || !context.convertibleCurrencies.has(entry.currency) || entry.quantity === null || entry.quantity <= 0)
  }))) return failure('invalid_relationship', 'Currency estimate requires verified pure-currency contents and conversion evidence; mixed bundles remain unavailable.')
  return result
}
export function validateCostEstimate(input: unknown, context: PriceContext): ValidationResult<CostEstimate> {
  const result = object<CostEstimate>(input, { itemId: reference(context.catalog.itemIds), market, currencyCode: currency, platform: enumeration(['ios', 'android']), priceObservationIds: references(new Set(context.observations.keys())), methodVersion: nonBlank,
    requiredCurrency: array(validateCurrencyAmount), proportionalAmount: nullable(validatePriceDecimal), checkoutAmount: nullable(validatePriceDecimal), bundleCounts: record(integer), leftoverCurrency: array(validateCurrencyAmount),
    coverage: enumeration(['complete', 'partial', 'unavailable']), assumptions: array(nonBlank), computedAt: validateDateTime })
  if (!result.valid) return result
  const value = result.value
  const selected = value.priceObservationIds.map(id => context.observations.get(id)!)
  if (selected.some(price => price.market !== value.market || price.currencyCode !== value.currencyCode || context.products.get(price.productId)?.platform !== value.platform)) return failure('invalid_relationship', 'Cannot mix market, currency or platform observations.')
  if (new Set(selected.map(price => price.productId)).size !== selected.length) return failure('invalid_relationship', 'Select one price observation per product, not multiple historical prices.')
  if (Object.keys(value.bundleCounts).some(id => !selected.some(price => price.productId === id))) return failure('unknown_reference', 'Bundle counts need a selected product price.')
  const unknown = value.requiredCurrency.some(entry => entry.amount === null || !context.convertibleCurrencies.has(entry.sourceCurrencyLabel))
  if (value.coverage === 'complete' && (!selected.length || unknown || value.proportionalAmount === null || value.checkoutAmount === null)) return failure('invalid_relationship', 'Incomplete evidence cannot yield a complete estimate.')
  if (value.coverage === 'unavailable' && (value.proportionalAmount !== null || value.checkoutAmount !== null || Object.keys(value.bundleCounts).length || value.leftoverCurrency.length)) return failure('invalid_relationship', 'Unavailable estimates cannot claim calculated amounts.')
  return result
}
export const validateIapProducts = (input: unknown, context: CatalogContext) => unique(value => validateIapProduct(value, context))(input)
