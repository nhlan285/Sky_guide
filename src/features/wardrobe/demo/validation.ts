import { enumeration, failure, object, success, validateId } from '../../../data/core/index.ts'
import type { ValidationResult } from '../../../data/core/index.ts'
import { array, boolean, nonBlank } from '../../../data/catalog/shared.ts'
import { validateColor, validateWardrobePackage } from '../../../data/wardrobe/index.ts'
import type { WardrobePackage } from '../../../data/wardrobe/index.ts'

export interface DemoShape { d: string; fill: string; stroke: string; strokeWidth: number; regionId: string | null }
export interface DemoGeometry { assetId: string; paths: DemoShape[] }
export interface DemoModel { id: string; revision: string; coordinateSystem: 'normalized_top_left'; fixture: boolean }
export interface DemoManifest extends WardrobePackage {
  packageKind: 'self_created_demo'; disclosure: string; model: DemoModel; geometry: DemoGeometry[]
}
export function validateDemoManifest(input: unknown): ValidationResult<DemoManifest> {
  const pkg = validateWardrobePackage(input, { provenanceIds: new Set(), sourceIds: new Set() })
  if (!pkg.valid) return pkg
  const extras = object<Pick<DemoManifest, 'packageKind' | 'disclosure' | 'model' | 'geometry'>>(input, {
    packageKind: enumeration(['self_created_demo']), disclosure: nonBlank,
    model: value => object<DemoModel>(value, { id: validateId, revision: nonBlank, coordinateSystem: enumeration(['normalized_top_left']), fixture: boolean }),
    geometry: array(value => object<DemoGeometry>(value, {
      assetId: validateId, paths: array(part => object<DemoShape>(part, {
        d: d => typeof d === 'string' && d.length > 0 && d.length <= 4096 && /^[MmLlHhVvCcSsQqTtAaZz\d.,+\-\seE]+$/.test(d) ? success(d) : failure('invalid_value', 'Demo paths must contain only SVG path commands/numbers.'),
        fill: validateColor, stroke: validateColor,
        strokeWidth: width => typeof width === 'number' && Number.isFinite(width) && width >= 0 && width <= .05 ? success(width) : failure('invalid_value', 'Invalid demo stroke width.'),
        regionId: id => id === null ? success(null) : validateId(id),
      })),
    })),
  })
  if (!extras.valid) return extras
  const manifest = { ...pkg.value, ...extras.value }
  const synthetic = (id: string) => id.startsWith('demo-') || id.startsWith('fixture-demo-')
  if (!manifest.model.fixture || manifest.model.id !== manifest.config.modelId || manifest.model.revision !== manifest.config.modelRevision
    || !manifest.config.fixture || !synthetic(manifest.id) || !synthetic(manifest.config.id)
    || manifest.assets.some(asset => !synthetic(asset.id) || asset.legalStatus !== 'self_created_placeholder' || !asset.fixture || !asset.placeholder || asset.path !== null || asset.renderer !== 'svg')
    || manifest.items.some(item => !synthetic(item.id) || !item.fixture || item.dyeRegions.some(region => !synthetic(region.id) || region.support !== 'demo'))
    || manifest.sizes.some(size => !size.fixture || !synthetic(size.code))
    || [...manifest.bindings, ...manifest.anchors, ...manifest.rules].some(value => !synthetic(value.id) || !value.fixture)) {
    return failure('invalid_value', 'The production demo accepts only explicitly self-created, synthetic fixture geometry/configuration.')
  }
  const seen = new Set<string>()
  for (const entry of manifest.geometry) {
    if (seen.has(entry.assetId)) return failure('duplicate_id', 'Duplicate geometry asset.')
    seen.add(entry.assetId)
    const asset = manifest.assets.find(value => value.id === entry.assetId)
    if (!asset || !entry.paths.length) return failure('unknown_reference', 'Geometry must belong to a declared asset and contain paths.')
    for (const shape of entry.paths) if (shape.regionId !== null && !manifest.bindings.some(binding => binding.assetId === entry.assetId
      && manifest.items.some(item => item.id === binding.itemId && item.dyeRegions.some(region => region.id === shape.regionId)))) {
      return failure('unknown_reference', 'Geometry references an undeclared item dye region.')
    }
  }
  if (manifest.assets.some(asset => !seen.has(asset.id))) return failure('unknown_reference', 'Every demo layer/mask must have inline geometry.')
  return success(manifest)
}
