import { enumeration, nullable, object, validateDateTime, validateId, validatePartialTime, validateString } from '../core/index.ts'
import type { ValidationError, ValidationResult } from '../core/index.ts'
import type { CatalogContext, TravelingSpiritPrediction, TravelingSpiritVisit } from './types.ts'
import { fieldProvenance, metadataFields, nonBlank, rangeErrors, reference, references, unique, withFieldProvenance } from './shared.ts'

function mixedDatasetErrors(input: unknown, forbidden: readonly string[]): ValidationError[] {
  if (input === null || typeof input !== 'object') return []
  return forbidden.filter(key => Object.hasOwn(input, key)).map(key => ({
    path: [key], code: 'invalid_value', message: 'Visit and prediction fields must remain in separate records/datasets.',
  }))
}
export function validateTravelingSpiritVisit(input: unknown, context: CatalogContext): ValidationResult<TravelingSpiritVisit> {
  const mixed = mixedDatasetErrors(input, ['candidateSpiritIds', 'targetWindow', 'methodDescription', 'confidenceLabel', 'inputDataVersion'])
  if (mixed.length) return { valid: false, errors: mixed }
  const fields = {
    ...metadataFields(input, context),
    id: validateId,
    spiritId: reference(context.spiritIds),
    startsAt: validatePartialTime,
    endsAt: nullable(validatePartialTime),
    status: enumeration(['confirmed', 'disputed']),
    treeId: nullable(reference(context.treeIds)),
  }
  const result = object<TravelingSpiritVisit>(input, { ...fields, fieldProvenance: fieldProvenance(context, [...Object.keys(fields), 'fieldProvenance']) })
  if (!result.valid) return result
  const errors = rangeErrors(result.value.startsAt, result.value.endsAt, ['endsAt'])
  return errors.length ? { valid: false, errors } : result
}
export function validateTravelingSpiritVisits(input: unknown, context: CatalogContext): ValidationResult<TravelingSpiritVisit[]> {
  return unique(value => validateTravelingSpiritVisit(value, context))(input)
}
export function validateTravelingSpiritPrediction(input: unknown, context: CatalogContext): ValidationResult<TravelingSpiritPrediction> {
  const mixed = mixedDatasetErrors(input, ['spiritId', 'startsAt', 'endsAt', 'status', 'treeId'])
  if (mixed.length) return { valid: false, errors: mixed }
  const result = object<Omit<TravelingSpiritPrediction, 'fieldProvenance'>>(input, {
    ...metadataFields(input, context),
    id: validateId,
    candidateSpiritIds: references(context.spiritIds),
    targetWindow: value => object<TravelingSpiritPrediction['targetWindow']>(value, {
      start: nullable(validatePartialTime), end: nullable(validatePartialTime),
    }),
    methodDescription: nonBlank,
    generatedAt: validateDateTime,
    inputDataVersion: nonBlank,
    confidenceLabel: nullable(validateString),
  })
  if (!result.valid) return result
  const errors = rangeErrors(result.value.targetWindow.start, result.value.targetWindow.end, ['targetWindow', 'end'])
  return errors.length ? { valid: false, errors } : withFieldProvenance(input, result, context)
}
export function validateTravelingSpiritPredictions(input: unknown, context: CatalogContext): ValidationResult<TravelingSpiritPrediction[]> {
  return unique(value => validateTravelingSpiritPrediction(value, context))(input)
}
