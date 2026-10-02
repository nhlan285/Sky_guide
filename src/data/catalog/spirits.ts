import { enumeration, nullable, object, validateId } from '../core/index.ts'
import type { ValidationResult } from '../core/index.ts'
import type { CatalogContext, Spirit } from './types.ts'
import { metadataFields, reference, references, unique, validateLocalizedText, withFieldProvenance } from './shared.ts'

export function validateSpirit(input: unknown, context: CatalogContext): ValidationResult<Spirit> {
  return withFieldProvenance(input, object<Omit<Spirit, 'fieldProvenance'>>(input, {
    ...metadataFields(input, context),
    id: validateId,
    name: validateLocalizedText,
    category: enumeration(['regular', 'seasonal', 'unknown']),
    realmId: nullable(reference(context.realmIds)),
    seasonIds: references(context.seasonIds),
    treeIds: references(context.treeIds),
  }), context)
}
export function validateSpirits(input: unknown, context: CatalogContext): ValidationResult<Spirit[]> {
  return unique(value => validateSpirit(value, context))(input)
}
