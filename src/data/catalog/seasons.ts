import { enumeration, nullable, object, validateId, validatePartialTime, validateString } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import type { CatalogContext, Event, Season, SeasonEvent } from './types.ts'
import { fieldProvenance, metadataFields, rangeErrors, references, unique, validateLocalizedText } from './shared.ts'

export function validateSeasonEvent(input: unknown, context: CatalogContext): ValidationResult<SeasonEvent> {
  const fields = {
    ...metadataFields(input, context),
    id: validateId,
    kind: enumeration(['season', 'event']),
    name: validateLocalizedText,
    startsAt: nullable(validatePartialTime),
    endsAt: nullable(validatePartialTime),
    timeStatus: enumeration(['confirmed', 'tentative', 'unknown']),
    summary: nullable(validateString),
    spiritIds: references(context.spiritIds),
    itemIds: references(context.itemIds),
    realmIds: references(context.realmIds),
    mapIds: references(context.mapIds),
    officialArticleIds: references(context.articleIds),
  }
  const result = object<SeasonEvent>(input, { ...fields, fieldProvenance: fieldProvenance(context, [...Object.keys(fields), 'fieldProvenance']) })
  if (!result.valid) return result
  const errors = rangeErrors(result.value.startsAt, result.value.endsAt, ['endsAt'])
  return errors.length ? { valid: false, errors } : result
}
export function validateSeason(input: unknown, context: CatalogContext): ValidationResult<Season> {
  const result = validateSeasonEvent(input, context)
  if (!result.valid) return result
  if (result.value.kind !== 'season') return { valid: false, errors: [{ path: ['kind'], code: 'invalid_value', message: 'Expected season kind.' }] }
  return { valid: true, value: { ...result.value, kind: result.value.kind } }
}
export function validateEvent(input: unknown, context: CatalogContext): ValidationResult<Event> {
  const result = validateSeasonEvent(input, context)
  if (!result.valid) return result
  if (result.value.kind !== 'event') return { valid: false, errors: [{ path: ['kind'], code: 'invalid_value', message: 'Expected event kind.' }] }
  return { valid: true, value: { ...result.value, kind: result.value.kind } }
}
export function validateSeasonEvents(input: unknown, context: CatalogContext): ValidationResult<SeasonEvent[]> {
  return unique(value => validateSeasonEvent(value, context))(input)
}
