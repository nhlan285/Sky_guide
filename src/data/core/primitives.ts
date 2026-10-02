import { enumeration, failure, success, validateString } from './validation.ts'
import type { ValidationResult } from './validation.ts'

export type ID = string
export type DateTime = string

// DATA_SCHEMA explicitly defines this source vocabulary; existence is checked separately.
export const SOURCE_IDS = [
  'K01', 'K02', 'K03', 'K04', 'K05', 'K06', 'K07',
  'K08', 'K09', 'K10', 'K11', 'K12', 'K13', 'K14', 'K15',
] as const
export type SourceId = typeof SOURCE_IDS[number]
export type SourceRegistry = ReadonlySet<SourceId>

export const validateSourceId = enumeration(SOURCE_IDS)

export function validateId(input: unknown): ValidationResult<ID> {
  const result = validateString(input)
  if (!result.valid) return result
  return result.value.trim().length
    ? success(result.value)
    : failure('invalid_value', 'Expected a non-empty internal ID.')
}
