import { findAnchor, validateColor } from '../../data/wardrobe/index.ts'
import type { AnchorEntry, Asset, LayerBinding, SizeEntry, WardrobePackage, WardrobeSelection } from '../../data/wardrobe/index.ts'
import { compareIds } from './engine.ts'
import type { DemoGeometry, DemoShape } from './demo/validation.ts'

export interface RenderLayer { binding: LayerBinding; asset: Asset; anchor: AnchorEntry }
export type RenderWarning = 'missing_size' | 'missing_asset' | 'missing_anchor' | 'revision_mismatch'
export function deriveRenderModel(pkg: WardrobePackage, selection: WardrobeSelection, effectiveSizeCode: string) {
  const size = pkg.sizes.find(entry => entry.code === effectiveSizeCode && entry.modelId === pkg.config.modelId && entry.modelRevision === pkg.config.modelRevision)
  const warnings: RenderWarning[] = []
  const layers: RenderLayer[] = []
  if (!size) return { size, layers, warnings: ['missing_size'] as RenderWarning[] }
  const equipped = new Set(Object.values(selection.equippedBySlot).flat())
  for (const binding of pkg.bindings) {
    if (binding.itemId === null ? !pkg.config.silhouetteBindingIds.includes(binding.id) : !equipped.has(binding.itemId)) continue
    if (binding.modelId !== pkg.config.modelId || binding.modelRevision !== pkg.config.modelRevision) { warnings.push('revision_mismatch'); continue }
    const asset = pkg.assets.find(entry => entry.id === binding.assetId)
    if (!asset) { warnings.push('missing_asset'); continue }
    if (asset.revision !== binding.assetRevision) { warnings.push('revision_mismatch'); continue }
    const anchor = findAnchor(pkg, binding, effectiveSizeCode)
    if (!anchor) { warnings.push('missing_anchor'); continue }
    layers.push({ binding, asset, anchor })
  }
  layers.sort((a, b) => a.binding.zIndex - b.binding.zIndex || compareIds(a.binding.id, b.binding.id))
  return { size, layers, warnings: [...new Set(warnings)] }
}
export function layerTransform({ binding, anchor }: RenderLayer): string {
  return `translate(${anchor.x} ${anchor.y}) rotate(${binding.rotationDeg}) scale(${binding.scale}) translate(${-binding.pivotX} ${-binding.pivotY})`
}
// Layout translation keeps the feet near the ground; scale is applied only here.
export function characterTransform(size: SizeEntry): string {
  return `translate(${(1 - size.scaleX) / 2} ${(1 - size.scaleY) * .9}) scale(${size.scaleX} ${size.scaleY})`
}
export function transformAssetPoint(layer: RenderLayer, size: SizeEntry, x: number, y: number) {
  const angle = layer.binding.rotationDeg * Math.PI / 180
  const dx = x - layer.binding.pivotX, dy = y - layer.binding.pivotY
  return {
    x: (1 - size.scaleX) / 2 + (layer.anchor.x + layer.binding.scale * (dx * Math.cos(angle) - dy * Math.sin(angle))) * size.scaleX,
    y: (1 - size.scaleY) * .9 + (layer.anchor.y + layer.binding.scale * (dx * Math.sin(angle) + dy * Math.cos(angle))) * size.scaleY,
  }
}
export function regionColor(pkg: WardrobePackage, itemId: string | null, regionId: string | null, selection: WardrobeSelection): string | undefined {
  const region = pkg.items.find(item => item.id === itemId)?.dyeRegions.find(entry => entry.id === regionId)
  const color = itemId && regionId ? selection.dyeByItemRegion[itemId]?.[regionId] : undefined
  if (!region || region.support === 'unknown' || !region.maskAssetId || !pkg.assets.some(asset => asset.id === region.maskAssetId && asset.capabilities.includes('dye_mask'))
    || !color || !validateColor(color).valid || (region.allowedColors !== null && !region.allowedColors.includes(color))) return undefined
  return color
}
export function resolveShapeDye(pkg: WardrobePackage, geometry: ReadonlyMap<string, DemoGeometry>, layer: RenderLayer, shape: DemoShape, selection: WardrobeSelection) {
  const region = pkg.items.find(item => item.id === layer.binding.itemId)?.dyeRegions.find(entry => entry.id === shape.regionId)
  const mask = region?.maskAssetId ? geometry.get(region.maskAssetId) : undefined
  const color = mask?.paths.length ? regionColor(pkg, layer.binding.itemId, shape.regionId, selection) : undefined
  return color && mask ? { color, mask } : undefined
}
