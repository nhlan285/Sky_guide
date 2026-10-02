import {
  enumeration, failure, nullable, object, validateCurrencyAmount, validateId,
  validatePartialTime, validateProvenanceIds, validateString,
} from '../core/index.ts'
import type { ValidationResult, Validator } from '../core/index.ts'
import type { AcquisitionOption, CatalogContext, Item, ItemMetadataValidators } from './types.ts'
import {
  array, costsConsistent, metadataFields, rangeErrors, reference, references,
  stringRecord, unique, validateLocalizedText, withFieldProvenance,
} from './shared.ts'

export function validateAcquisitionOption(input: unknown, context: CatalogContext): ValidationResult<AcquisitionOption> {
  const result = costsConsistent(object<AcquisitionOption>(input, {
    id: validateId,
    kind: enumeration(['spirit_tree', 'iap', 'other', 'unknown']),
    costs: array(validateCurrencyAmount),
    costStatus: enumeration(['known', 'unknown', 'free']),
    friendshipNodeId: nullable(reference(context.nodeIds)),
    iapProductId: nullable(reference(context.iapProductIds)),
    validFrom: nullable(validatePartialTime),
    validTo: nullable(validatePartialTime),
    provenanceIds: value => validateProvenanceIds(value, context.provenanceIds),
  }))
  if (!result.valid) return result
  const errors = rangeErrors(result.value.validFrom, result.value.validTo, ['validTo'])
  return errors.length ? { valid: false, errors } : result
}

function deferred<T extends object>(): Validator<T> {
  return () => failure('invalid_value', 'Non-empty metadata requires a supplied schema validator; this schema is deferred to P2-D04.')
}
export function validateItem<D extends object = object, C extends object = object>(
  input: unknown, context: CatalogContext, extensions: ItemMetadataValidators<D, C> = {},
): ValidationResult<Item<D, C>> {
  const result = object<Omit<Item<D, C>, 'fieldProvenance'>>(input, {
    ...metadataFields(input, context),
    id: validateId,
    sourceKeys: stringRecord,
    name: validateLocalizedText,
    slot: enumeration(['mask', 'hair', 'cape', 'top', 'bottom', 'accessory', 'unknown']),
    rawSlot: nullable(validateString),
    accessoryAnchor: nullable(validateString),
    seasonIds: references(context.seasonIds),
    spiritIds: references(context.spiritIds),
    acquisitionOptions: unique(value => validateAcquisitionOption(value, context)),
    assetIds: references(context.assetIds),
    dyeRegions: array(extensions.dyeRegion ?? deferred<D>()),
    dyeStatus: enumeration(['known', 'unknown', 'unsupported']),
    ruleIds: references(context.ruleIds),
    compatibility: nullable(extensions.compatibility ?? deferred<C>()),
  })
  return withFieldProvenance(input, result, context)
}
export function validateItems<D extends object = object, C extends object = object>(
  input: unknown, context: CatalogContext, extensions: ItemMetadataValidators<D, C> = {},
): ValidationResult<Item<D, C>[]> {
  return unique(value => validateItem(value, context, extensions))(input)
}
