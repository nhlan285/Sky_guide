import { compareInstants } from '../core/time.ts'
import {
  enumeration, failure, object, success, validateDateTime, validateId,
  validateProvenanceIds, validateString,
} from '../core/index.ts'
import type { ID, PartialTime, ValidationError, ValidationResult, Validator } from '../core/index.ts'
import type { CatalogContext, CostStatus, DomainMetadata, FieldProvenance, LocalizedText } from './types.ts'

export function array<T>(validator: Validator<T>): Validator<T[]> {
  return input => {
    if (input === undefined) return failure('missing_field', 'Required array is missing.')
    if (!Array.isArray(input)) return failure('invalid_type', 'Expected an array.')
    const values: T[] = []
    const errors: ValidationError[] = []
    for (const [index, entry] of input.entries()) {
      const result = validator(entry)
      if (result.valid) values.push(result.value)
      else errors.push(...result.errors.map(error => ({ ...error, path: [index, ...error.path] })))
    }
    return errors.length ? { valid: false, errors } : success(values)
  }
}

export function record<T>(validator: Validator<T>, allowedKeys?: readonly string[]): Validator<Record<string, T>> {
  return input => {
    if (input === undefined) return failure('missing_field', 'Required record is missing.')
    if (input === null || typeof input !== 'object' || Array.isArray(input)) return failure('invalid_type', 'Expected a record.')
    const entries: [string, T][] = []
    const errors: ValidationError[] = []
    for (const [key, entry] of Object.entries(input)) {
      if (allowedKeys && !allowedKeys.includes(key)) {
        // Do not echo arbitrary input keys in this error path/message.
        errors.push({ path: [], code: 'invalid_value', message: 'Field provenance must refer to a declared domain field.' })
        continue
      }
      const result = validator(entry)
      if (result.valid) entries.push([key, result.value])
      else errors.push(...result.errors.map(error => ({ ...error, path: [key, ...error.path] })))
    }
    return errors.length ? { valid: false, errors } : success(Object.fromEntries(entries))
  }
}

export function boolean(input: unknown): ValidationResult<boolean> {
  if (input === undefined) return failure('missing_field', 'Required boolean is missing.')
  return typeof input === 'boolean' ? success(input) : failure('invalid_type', 'Expected a boolean.')
}
export function nonBlank(input: unknown): ValidationResult<string> {
  const result = validateString(input)
  if (!result.valid) return result
  return result.value.trim() ? result : failure('invalid_value', 'Expected non-blank text.')
}
export function reference(ids: ReadonlySet<ID>): Validator<ID> {
  return input => {
    const result = validateId(input)
    if (!result.valid) return result
    return ids.has(result.value) ? result : failure('unknown_reference', 'Foreign key does not exist in the supplied registry.')
  }
}
export function unique<T extends { id: ID }>(validator: Validator<T>): Validator<T[]> {
  return input => {
    const result = array(validator)(input)
    if (!result.valid) return result
    const seen = new Set<ID>()
    const errors: ValidationError[] = []
    for (const [index, value] of result.value.entries()) {
      if (seen.has(value.id)) errors.push({ path: [index, 'id'], code: 'duplicate_id', message: 'Record ID must be unique in its collection.' })
      seen.add(value.id)
    }
    return errors.length ? { valid: false, errors } : result
  }
}
export function references(ids: ReadonlySet<ID>): Validator<ID[]> {
  return input => {
    const result = array(reference(ids))(input)
    if (!result.valid) return result
    const seen = new Set<ID>()
    const errors: ValidationError[] = []
    for (const [index, id] of result.value.entries()) {
      if (seen.has(id)) errors.push({ path: [index], code: 'duplicate_id', message: 'Reference must not be duplicated.' })
      seen.add(id)
    }
    return errors.length ? { valid: false, errors } : result
  }
}
export const stringRecord = record(validateString)
export function validateLocalizedText(input: unknown): ValidationResult<LocalizedText> {
  return object<LocalizedText>(input, { default: validateString, translations: stringRecord })
}
export function metadataFields(input: unknown, context: CatalogContext) {
  const fixture = input !== null && typeof input === 'object' && Object.hasOwn(input, 'fixture')
    && 'fixture' in input && input.fixture === true
  return {
    provenanceIds: (value: unknown) => validateProvenanceIds(value, context.provenanceIds, { allowEmpty: fixture }),
    updatedAt: validateDateTime,
    recordStatus: enumeration(['draft', 'reviewed', 'published', 'retired']),
    fixture: boolean,
  }
}
export function fieldProvenance(context: CatalogContext, fields: readonly string[]): Validator<FieldProvenance> {
  return record(value => validateProvenanceIds(value, context.provenanceIds), fields)
}
export function withFieldProvenance<T extends DomainMetadata>(
  input: unknown, result: ValidationResult<T>, context: CatalogContext,
): ValidationResult<T & { fieldProvenance?: FieldProvenance }> {
  if (!result.valid) return result
  if (input !== null && typeof input === 'object' && Object.hasOwn(input, 'fieldProvenance') && 'fieldProvenance' in input) {
    const parsed = fieldProvenance(context, [...Object.keys(result.value), 'fieldProvenance'])(input.fieldProvenance)
    if (!parsed.valid) return { valid: false, errors: parsed.errors.map(error => ({ ...error, path: ['fieldProvenance', ...error.path] })) }
    return success({ ...result.value, fieldProvenance: parsed.value })
  }
  return result
}
export function costsConsistent<T extends { costs: { amount: number | null }[]; costStatus: CostStatus }>(
  result: ValidationResult<T>,
): ValidationResult<T> {
  if (!result.valid) return result
  const { costs, costStatus } = result.value
  if (costStatus === 'known' && (!costs.length || costs.some(cost => cost.amount === null))) {
    return { valid: false, errors: [{ path: ['costStatus'], code: 'invalid_value', message: 'Known costs require explicit numeric amounts.' }] }
  }
  if (costStatus === 'free' && costs.some(cost => cost.amount !== 0)) {
    return { valid: false, errors: [{ path: ['costStatus'], code: 'invalid_value', message: 'Free status cannot contain unknown or positive costs.' }] }
  }
  return result
}

export function rangeErrors(start: PartialTime | null, end: PartialTime | null, path: readonly string[]): ValidationError[] {
  if (!start || !end || start.precision !== end.precision || start.precision === 'unknown') return []
  let reversed: boolean
  if (start.precision === 'date') reversed = end.value < start.value
  else {
    reversed = compareInstants(end.value, start.value) < 0
  }
  return reversed ? [{ path, code: 'invalid_value', message: 'End must not precede start when precision is comparable.' }] : []
}
