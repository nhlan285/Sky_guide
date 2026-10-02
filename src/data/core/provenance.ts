import type { DateTime, ID, SourceId, SourceRegistry } from './primitives.ts'
import { validateId, validateSourceId } from './primitives.ts'
import { validateDateTime } from './time.ts'
import { enumeration, failure, nullable, object, success, validateString } from './validation.ts'
import type { ValidationError, ValidationResult } from './validation.ts'

export interface SourceRecord {
  id: ID
  sourceId: SourceId
  sourceUrl: string | null
  sourceRecordKey: string | null
  sourceRevision: string | null
  retrievedAt: DateTime
  observedAt: DateTime | null
  attribution: string
  licenseNote: string
  transformNote: string
  verificationStatus: 'pending' | 'verified' | 'conflict' | 'stale'
}

export function validateSourceRecord(input: unknown, sources: SourceRegistry): ValidationResult<SourceRecord> {
  return object<SourceRecord>(input, {
    id: validateId,
    sourceId: value => {
      const result = validateSourceId(value)
      if (!result.valid) return result
      return sources.has(result.value)
        ? result
        : failure('unknown_source', 'Source reference does not exist in the supplied registry.')
    },
    sourceUrl: nullable(validateString),
    sourceRecordKey: nullable(validateString),
    sourceRevision: nullable(validateString),
    retrievedAt: validateDateTime,
    observedAt: nullable(validateDateTime),
    attribution: validateString,
    licenseNote: validateString,
    transformNote: validateString,
    verificationStatus: enumeration(['pending', 'verified', 'conflict', 'stale']),
  })
}

export function validateSourceRecords(input: unknown, sources: SourceRegistry): ValidationResult<SourceRecord[]> {
  if (!Array.isArray(input)) return failure('invalid_type', 'Expected a provenance record array.')
  const records: SourceRecord[] = []
  const errors: ValidationError[] = []
  const ids = new Set<ID>()
  for (const [index, entry] of input.entries()) {
    const result = validateSourceRecord(entry, sources)
    if (!result.valid) {
      errors.push(...result.errors.map(error => ({ ...error, path: [index, ...error.path] })))
      continue
    }
    if (ids.has(result.value.id)) errors.push({ path: [index, 'id'], code: 'duplicate_id', message: 'Provenance ID must be unique within the collection.' })
    ids.add(result.value.id)
    records.push(result.value)
  }
  return errors.length ? { valid: false, errors } : success(records)
}

export function validateProvenanceIds(
  input: unknown,
  provenanceIds: ReadonlySet<ID>,
  options: { allowEmpty?: boolean } = {},
): ValidationResult<ID[]> {
  if (!Array.isArray(input)) return failure('invalid_type', 'Expected a provenance ID array.')
  if (!input.length && !options.allowEmpty) return failure('invalid_value', 'Real domain records require at least one provenance reference.')
  const ids: ID[] = []
  const errors: ValidationError[] = []
  const seen = new Set<ID>()
  for (const [index, entry] of input.entries()) {
    const result = validateId(entry)
    if (!result.valid) errors.push(...result.errors.map(error => ({ ...error, path: [index, ...error.path] })))
    else {
      const id = result.value
      if (seen.has(id)) errors.push({ path: [index], code: 'duplicate_id', message: 'Provenance reference must not be duplicated.' })
      if (!provenanceIds.has(id)) errors.push({ path: [index], code: 'unknown_provenance', message: 'Provenance reference does not exist in the supplied context.' })
      seen.add(id)
      ids.push(id)
    }
  }
  return errors.length ? { valid: false, errors } : success(ids)
}
