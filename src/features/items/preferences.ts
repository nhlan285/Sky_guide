import { failure, object, success } from '../../data/core/index.ts'
import type { ValidationResult } from '../../data/core/index.ts'
import { clearFilters, filtersFromParams } from '../../data/itemLookup/model.ts'
import type { LookupFilters } from '../../data/itemLookup/model.ts'
import { createVersionedStorage } from '../../shared/storage/versionedStorage.ts'
import type { KeyStorage } from '../../shared/storage/versionedStorage.ts'

export const lookupPreferenceKey = 'sky-guide-lookup-filters'
export interface FilterChoices { categories: readonly string[]; slots: readonly string[]; seasons: readonly string[]; spirits: readonly string[]; acquisitions: readonly string[] }
const keys = ['query', 'category', 'slot', 'season', 'spirit', 'acquisition'] as const
export function validateLookupPreferences(input: unknown, choices: FilterChoices): ValidationResult<LookupFilters> {
  const text = (value: unknown) => typeof value === 'string' && value.length <= 200 ? success(value) : failure('invalid_value', 'Filter exceeds the supported length.')
  const selected = (values: readonly string[]) => (value: unknown) => {
    const parsed = text(value)
    return parsed.valid && (parsed.value === '' || values.includes(parsed.value)) ? parsed : failure('unknown_reference', 'Filter choice is unavailable.')
  }
  return object<LookupFilters>(input, { query: text, category: selected(choices.categories), slot: selected(choices.slots), season: selected(choices.seasons), spirit: selected(choices.spirits), acquisition: selected(choices.acquisitions) })
}
export function preferenceParams(filters: LookupFilters): URLSearchParams {
  const params = new URLSearchParams()
  for (const key of keys) if (filters[key]) params.set(key === 'query' ? 'q' : key, filters[key])
  return params
}
// Explicit query strings are authoritative, even when they contain no known filter.
export function initialLookupParams(search: string, itemId: string | undefined, saved: LookupFilters): URLSearchParams {
  return search || itemId ? new URLSearchParams() : preferenceParams(saved)
}
export function effectiveLookupParams(search: string, itemId: string | undefined, defaults: URLSearchParams): URLSearchParams {
  return search || itemId ? new URLSearchParams(search) : new URLSearchParams(defaults)
}
export const createLookupPreferenceStorage = (choices: FilterChoices, storage: () => KeyStorage) => createVersionedStorage<LookupFilters>({
  key: lookupPreferenceKey, version: 1, defaultValue: clearFilters(), maxChars: 2_000,
  storage, validate: input => validateLookupPreferences(input, choices),
})
export const lookupPreferencesFromParams = (params: URLSearchParams) => filtersFromParams(params)
