import {
  enumeration, failure, nullable, object, success, validateDateTime, validateId,
  validateProvenanceIds, validateString,
} from '../core/index.ts'
import type { ValidationError, ValidationResult, Validator } from '../core/index.ts'
import { array, boolean, nonBlank, record, unique, validateLocalizedText } from '../catalog/shared.ts'
import { SLOTS } from './types.ts'
import type {
  AnchorEntry, Asset, DyeRegion, LayerBinding, OutfitSnapshot, SizeEntry, SlotPolicy,
  WardrobeConfig, WardrobeContext, WardrobeItem, WardrobePackage, WardrobeRule, WardrobeSelection,
} from './types.ts'

const slot = enumeration(SLOTS)
const finite: Validator<number> = input => typeof input === 'number' && Number.isFinite(input)
  ? success(input) : failure('invalid_value', 'Expected a finite number.')
const integer: Validator<number> = input => {
  const result = finite(input)
  return result.valid && !Number.isSafeInteger(result.value) ? failure('invalid_value', 'Expected a safe integer.') : result
}
const positive: Validator<number> = input => {
  const result = finite(input)
  return result.valid && result.value <= 0 ? failure('invalid_value', 'Scale must be greater than zero.') : result
}
const coordinate: Validator<number> = input => {
  const result = finite(input)
  return result.valid && (result.value < 0 || result.value > 1) ? failure('invalid_value', 'Coordinate must be normalized to [0,1].') : result
}
export const validateColor: Validator<string> = input => typeof input === 'string' && /^#[0-9a-fA-F]{6}$/.test(input)
  ? success(input.toLowerCase()) : failure('invalid_value', 'Color must be a six-digit hex RGB value.')

function metadata(input: unknown, context: WardrobeContext) {
  const fixture = input !== null && typeof input === 'object' && 'fixture' in input && input.fixture === true
  return { fixture: boolean, provenanceIds: (value: unknown) => validateProvenanceIds(value, context.provenanceIds, { allowEmpty: fixture }) }
}
function error(path: (string | number)[], message: string, code: ValidationError['code'] = 'invalid_relationship'): ValidationError {
  return { path, code, message }
}
function checked<T>(result: ValidationResult<T>, check: (value: T) => ValidationError[]): ValidationResult<T> {
  if (!result.valid) return result
  const errors = check(result.value)
  return errors.length ? { valid: false, errors } : result
}
function duplicates<T>(values: T[], key: (value: T) => string, path: string[]): ValidationError[] {
  const seen = new Set<string>()
  return values.flatMap((value, index) => {
    const id = key(value)
    if (seen.has(id)) return [error([...path, index], 'Duplicate key in collection.', 'duplicate_id')]
    seen.add(id)
    return []
  })
}

export function validateAsset(input: unknown, context: WardrobeContext): ValidationResult<Asset> {
  const selfCreated = input !== null && typeof input === 'object' && 'legalStatus' in input && input.legalStatus === 'self_created_placeholder'
  return checked(object<Asset>(input, {
    ...metadata(input, context), id: validateId,
    provenanceIds: value => validateProvenanceIds(value, context.provenanceIds, { allowEmpty: selfCreated || (input !== null && typeof input === 'object' && 'fixture' in input && input.fixture === true) }),
    kind: enumeration(['geometric_placeholder', 'wiki_icon', 'map_image', 'paper_doll_layer', 'model_3d']),
    path: nullable(nonBlank), revision: nonBlank, sourceId: nullable(validateId), placeholder: boolean,
    legalStatus: value => value === undefined ? success('pending_legal_confirmation') : enumeration(['self_created_placeholder', 'pending_legal_confirmation', 'permission_confirmed', 'not_permitted'])(value),
    rightsEvidenceRef: nullable(nonBlank), credit: nonBlank, renderer: enumeration(['svg', 'image_2d', 'future_3d']),
    capabilities: array(nonBlank),
  }), asset => {
    const errors: ValidationError[] = []
    if (asset.sourceId !== null && !context.sourceIds.has(asset.sourceId)) errors.push(error(['sourceId'], 'Unknown source.', 'unknown_reference'))
    if (asset.legalStatus === 'self_created_placeholder' && (!asset.placeholder || asset.kind !== 'geometric_placeholder' || asset.sourceId !== null)) {
      errors.push(error(['legalStatus'], 'Self-created status requires original placeholder geometry without a third-party source.'))
    }
    if (asset.legalStatus === 'permission_confirmed' && !asset.rightsEvidenceRef) errors.push(error(['rightsEvidenceRef'], 'Confirmed permission requires explicit rights evidence.'))
    if (!asset.fixture && asset.legalStatus !== 'self_created_placeholder' && !asset.provenanceIds.length) errors.push(error(['provenanceIds'], 'Non-demo assets require provenance.'))
    return errors
  })
}
export function validateSlotPolicy(input: unknown): ValidationResult<SlotPolicy> {
  return checked(object<SlotPolicy>(input, { slot, maxItems: integer, overflow: enumeration(['reject']) }), value =>
    value.maxItems < 1 ? [error(['maxItems'], 'Capacity must be at least one.')] : [])
}
export function validateWardrobeConfig(input: unknown): ValidationResult<WardrobeConfig> {
  return checked(object<WardrobeConfig>(input, {
    id: validateId, revision: nonBlank, modelId: validateId, modelRevision: nonBlank,
    slotPolicies: array(validateSlotPolicy), silhouetteBindingIds: array(validateId), fixture: boolean,
  }), value => [...duplicates(value.slotPolicies, entry => entry.slot, ['slotPolicies']),
    ...duplicates(value.silhouetteBindingIds, id => id, ['silhouetteBindingIds'])])
}
export function validateSizeEntry(input: unknown, context: WardrobeContext): ValidationResult<SizeEntry> {
  return object<SizeEntry>(input, { ...metadata(input, context), code: nonBlank, modelId: validateId, modelRevision: nonBlank, scaleX: positive, scaleY: positive })
}
export function validateLayerBinding(input: unknown, context: WardrobeContext): ValidationResult<LayerBinding> {
  return object<LayerBinding>(input, {
    ...metadata(input, context), id: validateId, revision: nonBlank, itemId: nullable(validateId),
    modelId: validateId, modelRevision: nonBlank, slot, anchorName: nonBlank, assetId: validateId, assetRevision: nonBlank,
    pivotX: coordinate, pivotY: coordinate, scale: positive, rotationDeg: finite, zIndex: integer, calibrationRevision: nonBlank,
  })
}
export function validateAnchorEntry(input: unknown, context: WardrobeContext): ValidationResult<AnchorEntry> {
  return object<AnchorEntry>(input, {
    ...metadata(input, context), id: validateId, modelId: validateId, modelRevision: nonBlank, sizeCode: nonBlank,
    slot, anchorName: nonBlank, assetId: validateId, assetRevision: nonBlank, bindingId: validateId, bindingRevision: nonBlank,
    calibrationRevision: nonBlank, x: coordinate, y: coordinate,
  })
}
export function validateRule(input: unknown, context: WardrobeContext): ValidationResult<WardrobeRule> {
  return checked(object<WardrobeRule>(input, {
    ...metadata(input, context), id: validateId, triggerItemIds: array(validateId),
    effect: enumeration(['set_effective_size', 'reject_combination']), targetSizeCode: nullable(nonBlank), priority: integer, reason: nonBlank,
  }), rule => [...duplicates(rule.triggerItemIds, id => id, ['triggerItemIds']),
    ...(rule.triggerItemIds.length ? [] : [error(['triggerItemIds'], 'A rule needs at least one trigger.')]),
    ...((rule.effect === 'set_effective_size') === (rule.targetSizeCode !== null) ? [] : [error(['targetSizeCode'], 'Rule target does not match its effect.')])])
}
export function validateDyeRegion(input: unknown): ValidationResult<DyeRegion> {
  return checked(object<DyeRegion>(input, {
    id: validateId, label: validateLocalizedText, maskAssetId: nullable(validateId), allowedColors: nullable(array(validateColor)),
    support: enumeration(['known', 'demo', 'unknown']),
  }), value => value.allowedColors ? [...duplicates(value.allowedColors, color => color, ['allowedColors']),
    ...(value.allowedColors.length ? [] : [error(['allowedColors'], 'An explicit palette cannot be empty.')])] : [])
}
export function validateWardrobeItem(input: unknown): ValidationResult<WardrobeItem> {
  return checked(object<WardrobeItem>(input, {
    id: validateId, name: validateLocalizedText, slot, assetIds: array(validateId), dyeRegions: unique(validateDyeRegion), fixture: boolean,
  }), value => duplicates(value.assetIds, id => id, ['assetIds']))
}

export function anchorKey(value: AnchorEntry): string {
  return JSON.stringify([value.modelId, value.modelRevision, value.sizeCode, value.slot, value.anchorName,
    value.assetId, value.assetRevision, value.bindingId, value.bindingRevision])
}
export function findAnchor(pkg: WardrobePackage, binding: LayerBinding, sizeCode: string): AnchorEntry | undefined {
  return pkg.anchors.find(entry => entry.modelId === binding.modelId && entry.modelRevision === binding.modelRevision
    && entry.sizeCode === sizeCode && entry.slot === binding.slot && entry.anchorName === binding.anchorName
    && entry.assetId === binding.assetId && entry.assetRevision === binding.assetRevision
    && entry.bindingId === binding.id && entry.bindingRevision === binding.revision && entry.calibrationRevision === binding.calibrationRevision)
}
function canCoactivate(a: WardrobeRule, b: WardrobeRule, pkg: WardrobePackage): boolean {
  const triggers = new Set([...a.triggerItemIds, ...b.triggerItemIds])
  return pkg.config.slotPolicies.every(policy => pkg.items.filter(item => item.slot === policy.slot && triggers.has(item.id)).length <= policy.maxItems)
    && !pkg.rules.some(rule => rule.effect === 'reject_combination' && rule.triggerItemIds.every(id => triggers.has(id)))
}
export function validateWardrobePackage(input: unknown, context: WardrobeContext): ValidationResult<WardrobePackage> {
  return checked(object<WardrobePackage>(input, {
    id: validateId, revision: nonBlank, config: validateWardrobeConfig, assets: unique(value => validateAsset(value, context)),
    items: unique(validateWardrobeItem), sizes: array(value => validateSizeEntry(value, context)),
    anchors: unique(value => validateAnchorEntry(value, context)), bindings: unique(value => validateLayerBinding(value, context)),
    rules: unique(value => validateRule(value, context)),
  }), pkg => {
    const errors = [...duplicates(pkg.sizes, size => JSON.stringify([size.modelId, size.modelRevision, size.code]), ['sizes']),
      ...duplicates(pkg.anchors, anchorKey, ['anchors'])]
    const { config } = pkg
    const modelMatches = (value: { modelId: string; modelRevision: string }) => value.modelId === config.modelId && value.modelRevision === config.modelRevision
    if (!pkg.sizes.length) errors.push(error(['sizes'], 'At least one scale preset is required.'))
    if (!config.silhouetteBindingIds.length) errors.push(error(['config', 'silhouetteBindingIds'], 'A silhouette is required.'))
    for (const id of config.silhouetteBindingIds) {
      if (!pkg.bindings.some(binding => binding.id === id && binding.itemId === null)) errors.push(error(['config', 'silhouetteBindingIds'], 'Unknown or non-silhouette binding.', 'unknown_reference'))
    }
    for (const [index, size] of pkg.sizes.entries()) if (!modelMatches(size)) errors.push(error(['sizes', index], 'Size/model revision mismatch.'))
    for (const [index, item] of pkg.items.entries()) {
      if (!config.slotPolicies.some(policy => policy.slot === item.slot)) errors.push(error(['items', index, 'slot'], 'Missing slot policy.'))
      for (const id of item.assetIds) if (!pkg.assets.some(asset => asset.id === id)) errors.push(error(['items', index, 'assetIds'], 'Unknown asset.', 'unknown_reference'))
      for (const region of item.dyeRegions) {
        if (region.maskAssetId !== null && !pkg.assets.some(asset => asset.id === region.maskAssetId && asset.capabilities.includes('dye_mask'))) errors.push(error(['items', index, 'dyeRegions'], 'Dye mask reference must resolve to a declared mask asset.', 'unknown_reference'))
      }
    }
    for (const [index, binding] of pkg.bindings.entries()) {
      const asset = pkg.assets.find(value => value.id === binding.assetId)
      const item = pkg.items.find(value => value.id === binding.itemId)
      if (!modelMatches(binding)) errors.push(error(['bindings', index], 'Binding/model revision mismatch.'))
      if (!asset) errors.push(error(['bindings', index, 'assetId'], 'Unknown binding asset.', 'unknown_reference'))
      else if (asset.revision !== binding.assetRevision) errors.push(error(['bindings', index, 'assetRevision'], 'Asset revision mismatch.'))
      if (!config.slotPolicies.some(policy => policy.slot === binding.slot)) errors.push(error(['bindings', index, 'slot'], 'Missing slot policy.'))
      if (binding.itemId === null ? !config.silhouetteBindingIds.includes(binding.id) : !item || item.slot !== binding.slot || !item.assetIds.includes(binding.assetId)) errors.push(error(['bindings', index, 'itemId'], 'Binding must belong to its declared item/slot or configured silhouette.'))
      for (const size of pkg.sizes) if (!findAnchor(pkg, binding, size.code)) errors.push(error(['bindings', index], 'Missing anchor or calibration/revision mismatch for a supported size.'))
    }
    for (const [index, anchor] of pkg.anchors.entries()) {
      const binding = pkg.bindings.find(value => value.id === anchor.bindingId)
      if (!binding || !modelMatches(anchor) || !pkg.sizes.some(size => size.code === anchor.sizeCode)
        || findAnchor(pkg, binding, anchor.sizeCode)?.id !== anchor.id) errors.push(error(['anchors', index], 'Unknown binding/size or incompatible anchor revision.', 'unknown_reference'))
    }
    for (const [index, rule] of pkg.rules.entries()) {
      if (rule.triggerItemIds.some(id => !pkg.items.some(item => item.id === id))) errors.push(error(['rules', index, 'triggerItemIds'], 'Unknown trigger.', 'unknown_reference'))
      if (rule.effect === 'set_effective_size' && !pkg.sizes.some(size => size.code === rule.targetSizeCode)) errors.push(error(['rules', index, 'targetSizeCode'], 'Unknown target size.', 'unknown_reference'))
      for (const other of pkg.rules.slice(index + 1)) if (rule.effect === 'set_effective_size' && other.effect === rule.effect
        && rule.priority === other.priority && rule.targetSizeCode !== other.targetSizeCode && canCoactivate(rule, other, pkg)) errors.push(error(['rules', index], 'Coactive rules write conflicting targets at the same priority.'))
    }
    return errors
  })
}

export function validateSelection(input: unknown, pkg: WardrobePackage): ValidationResult<WardrobeSelection> {
  return checked(object<WardrobeSelection>(input, {
    schemaVersion: integer, baseSizeCode: nonBlank,
    equippedBySlot: value => object<WardrobeSelection['equippedBySlot']>(value, Object.fromEntries(SLOTS.map(key => [key, array(validateId)])) as { [K in typeof SLOTS[number]]: Validator<string[]> }),
    dyeByItemRegion: record(record(validateColor)),
  }), value => {
    const errors: ValidationError[] = []
    if (value.schemaVersion !== 1) errors.push(error(['schemaVersion'], 'Unsupported selection version.'))
    if (!pkg.sizes.some(size => size.code === value.baseSizeCode)) errors.push(error(['baseSizeCode'], 'Unknown size.', 'unknown_reference'))
    const equipped = new Set<string>()
    for (const key of SLOTS) {
      const ids = value.equippedBySlot[key]
      const policy = pkg.config.slotPolicies.find(entry => entry.slot === key)
      if (ids.length && (!policy || ids.length > policy.maxItems)) errors.push(error(['equippedBySlot', key], 'Missing slot policy or capacity exceeded.'))
      for (const id of ids) {
        if (equipped.has(id)) errors.push(error(['equippedBySlot', key], 'Duplicate equipped item.', 'duplicate_id'))
        equipped.add(id)
        if (!pkg.items.some(item => item.id === id && item.slot === key)) errors.push(error(['equippedBySlot', key], 'Unknown item or wrong slot.', 'unknown_reference'))
      }
    }
    for (const [itemId, regions] of Object.entries(value.dyeByItemRegion)) {
      const item = pkg.items.find(entry => entry.id === itemId)
      if (!item) errors.push(error(['dyeByItemRegion'], 'Unknown dyed item.', 'unknown_reference'))
      for (const [regionId, color] of Object.entries(regions)) {
        const region = item?.dyeRegions.find(entry => entry.id === regionId)
        if (!region || region.support === 'unknown' || !region.maskAssetId || !pkg.assets.some(asset => asset.id === region.maskAssetId && asset.capabilities.includes('dye_mask'))
          || (region.allowedColors !== null && !region.allowedColors.includes(color))) errors.push(error(['dyeByItemRegion'], 'Unsupported dye region, missing mask or color outside palette.'))
      }
    }
    if (pkg.rules.some(rule => rule.effect === 'reject_combination' && rule.triggerItemIds.every(id => equipped.has(id)))) errors.push(error(['equippedBySlot'], 'Selection matches a rejected combination.'))
    return errors
  })
}
export function validateOutfitSnapshot(input: unknown, pkg: WardrobePackage): ValidationResult<OutfitSnapshot> {
  const selection = validateSelection(input, pkg)
  if (!selection.valid) return selection
  const metadataResult = object<Pick<OutfitSnapshot, 'catalogVersion' | 'id' | 'name' | 'savedAt'>>(input, {
    catalogVersion: nonBlank, id: nullable(validateId), name: nullable(validateString), savedAt: nullable(validateDateTime),
  })
  if (!metadataResult.valid) return metadataResult
  if (metadataResult.value.catalogVersion !== pkg.revision) return failure('invalid_value', 'Outfit package revision mismatch; explicit migration is required.')
  return success({ ...selection.value, ...metadataResult.value })
}
