import type { AcquisitionOption, CatalogContext, Item } from '../catalog/index.ts'
import { validateItem } from '../catalog/index.ts'
import { enumeration, failure, nullable, object, success, validateId, validateString } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import { array, nonBlank, unique } from '../catalog/shared.ts'
import { validateCatalogueImage } from './images.ts'
import type { CatalogueImage } from './images.ts'
import { validateItemImages } from './media.ts'
import type { ItemImages } from './media.ts'

export const categories = ['hair', 'mask', 'face-accessory', 'cape', 'outfit', 'shoes', 'head-accessory', 'neck-accessory', 'prop', 'music-sheet', 'expression', 'other', 'unknown'] as const
export type Category = typeof categories[number]
export const acquisitions = ['spirit-current', 'spirit-seasonal', 'season-items', 'shop', 'default', 'unknown'] as const
export type Acquisition = typeof acquisitions[number]
export interface OfferEvidence {
  id: string
  acquisition: Acquisition
  seasonPass: boolean
  bundle: boolean
  money: number | null
  sourceUrl: string
}
export interface LookupMetadata {
  id: string
  upstreamId: number
  identifier: string
  category: Category
  categoryEvidence: string | null
  offers: OfferEvidence[]
  image?: CatalogueImage | null
  images?: ItemImages | null
}
export interface LookupEntry extends LookupMetadata { item: Item }

export function natural(input: unknown): ValidationResult<number> {
  return typeof input === 'number' && Number.isSafeInteger(input) && input >= 0 ? success(input) : failure('invalid_value', 'Expected a non-negative stable integer ID.')
}
const flag = (input: unknown) => typeof input === 'boolean' ? success(input) : failure('invalid_type', 'Expected boolean.')
const money = (input: unknown) => typeof input === 'number' && Number.isFinite(input) && input >= 0 ? success(input) : failure('invalid_value', 'Invalid raw money amount.')
export function validateLookupMetadata(input: unknown): ValidationResult<LookupMetadata> {
  const result = object<LookupMetadata>(input, {
    id: validateId, upstreamId: natural, identifier: nonBlank,
    category: enumeration(categories), categoryEvidence: nullable(validateString),
    image: value => value === undefined ? success(undefined) : nullable(validateCatalogueImage)(value),
    images: value => value === undefined ? success(undefined) : nullable(validateItemImages)(value),
    offers: unique(value => object<OfferEvidence>(value, {
      id: validateId, acquisition: enumeration(acquisitions), seasonPass: flag, bundle: flag,
      money: nullable(money), sourceUrl: nonBlank,
    })),
  })
  if (result.valid && result.value.id !== `tsa-cosmetic-${result.value.upstreamId}`) return failure('invalid_relationship', 'Internal ID must match stable upstream ID.')
  return result
}
export function validateLookupEntry(item: unknown, metadata: unknown, context: CatalogContext): ValidationResult<LookupEntry> {
  const itemResult = validateItem(item, context)
  if (!itemResult.valid) return itemResult
  const metadataResult = validateLookupMetadata(metadata)
  if (!metadataResult.valid) return metadataResult
  if (itemResult.value.id !== metadataResult.value.id || itemResult.value.acquisitionOptions.length !== metadataResult.value.offers.length || !itemResult.value.acquisitionOptions.every(option => metadataResult.value.offers.some(offer => offer.id === option.id))) {
    return failure('invalid_relationship', 'Item/metadata acquisition references must match.')
  }
  return success({ ...metadataResult.value, item: itemResult.value })
}
export const validateLookupMetadataList = array(validateLookupMetadata)

export interface LookupFilters { query: string; category: string; slot: string; season: string; spirit: string; acquisition: string }
export function clearFilters(): LookupFilters { return { query: '', category: '', slot: '', season: '', spirit: '', acquisition: '' } }
export function normalizeQuery(query: string): string { return query.trim().replace(/\s+/g, ' ').toLowerCase() }
export function filterEntries(entries: readonly LookupEntry[], filters: LookupFilters): LookupEntry[] {
  const query = normalizeQuery(filters.query)
  return entries.filter(entry => (!query || normalizeQuery(`${entry.item.name.default} ${entry.identifier} ${entry.upstreamId} ${entry.id}`).includes(query)) &&
    (!filters.category || entry.category === filters.category) && (!filters.slot || entry.item.slot === filters.slot) &&
    (!filters.season || entry.item.seasonIds.includes(filters.season)) && (!filters.spirit || entry.item.spiritIds.includes(filters.spirit)) &&
    (!filters.acquisition || entry.offers.some(offer => offer.acquisition === filters.acquisition)))
}
export function lookupById(entries: readonly LookupEntry[], id: string): LookupEntry | null { return entries.find(entry => entry.id === id) ?? null }
export function costRepresentation(option: AcquisitionOption): 'unknown' | 'free' | 'amounts' {
  return option.costStatus === 'unknown' ? 'unknown' : option.costStatus === 'free' ? 'free' : 'amounts'
}
export function filtersFromParams(params: URLSearchParams): LookupFilters {
  return { query: params.get('q') ?? '', category: params.get('category') ?? '', slot: params.get('slot') ?? '', season: params.get('season') ?? '', spirit: params.get('spirit') ?? '', acquisition: params.get('acquisition') ?? '' }
}
export function updateFilterParams(previous: URLSearchParams, key: 'q' | 'category' | 'slot' | 'season' | 'spirit' | 'acquisition', value: string): URLSearchParams {
  const next = new URLSearchParams(previous)
  if (value) next.set(key, value)
  else next.delete(key)
  next.delete('page')
  return next
}
export type FilterKey = Parameters<typeof updateFilterParams>[1]
export function contextualLookupUrl(previous: URLSearchParams, key: FilterKey, value: string): string {
  return `/items?${updateFilterParams(previous, key, value).toString()}`
}
export function clearFilterParams(previous: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(previous)
  for (const key of ['q', 'category', 'slot', 'season', 'spirit', 'acquisition', 'page']) next.delete(key)
  return next
}
export function activeFilterValues(params: URLSearchParams): { key: FilterKey; value: string }[] {
  const keys: FilterKey[] = ['q', 'category', 'slot', 'season', 'spirit', 'acquisition']
  return keys.flatMap(key => { const value = params.get(key); return value ? [{ key, value }] : [] })
}
