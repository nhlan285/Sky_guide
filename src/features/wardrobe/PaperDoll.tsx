import { memo, useId } from 'react'
import type { WardrobeSelection } from '../../data/wardrobe/index.ts'
import { demoGeometry, demoPackage } from './demo/demo'
import { characterTransform, layerTransform, resolveShapeDye } from './model'
import type { deriveRenderModel } from './model'

export const PaperDoll = memo(function PaperDoll({ model, selection, label }: {
  model: ReturnType<typeof deriveRenderModel>; selection: WardrobeSelection; label: string
}) {
  const id = useId().replace(/:/g, '')
  return <svg className="paper-doll" viewBox="-.1 -.06 1.2 1.12" role="img" aria-label={label}>
    <ellipse cx=".5" cy=".943" rx=".25" ry=".025" fill="currentColor" opacity=".12" />
    {model.size && <g transform={characterTransform(model.size)}>
      {model.layers.map(layer => {
        const geometry = demoGeometry.get(layer.asset.id)
        if (!geometry) return null
        return <g key={layer.binding.id} transform={layerTransform(layer)} data-binding={layer.binding.id}>
          {geometry.paths.map((shape, index) => {
            const dye = resolveShapeDye(demoPackage, demoGeometry, layer, shape, selection)
            const clipId = `${id}-${layer.binding.id}-${index}`
            return <g key={index}>
              <path d={shape.d} fill={shape.fill} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinejoin="round" />
              {dye && <>
                <defs><clipPath id={clipId}><path d={shape.d} /></clipPath></defs>
                <g clipPath={`url(#${clipId})`}>
                  {dye.mask.paths.map((part, maskIndex) => <path key={maskIndex} d={part.d} fill={dye.color} stroke={shape.stroke} strokeWidth={shape.strokeWidth} strokeLinejoin="round" />)}
                </g>
              </>}
            </g>
          })}
        </g>
      })}
    </g>}
  </svg>
})

const thumbnailBoxes = {
  mask: '.38 .18 .24 .14', hair: '.36 .07 .28 .19', cape: '.22 .32 .56 .47',
  top: '.37 .35 .26 .34', bottom: '.37 .58 .26 .33', accessory: '.46 .46 .08 .09',
}
export function ItemThumbnail({ itemId }: { itemId: string }) {
  const item = demoPackage.items.find(entry => entry.id === itemId)
  if (!item) return null
  return <svg className="item-thumbnail" viewBox={thumbnailBoxes[item.slot]} aria-hidden="true">
    {demoPackage.bindings.filter(binding => binding.itemId === itemId).sort((a, b) => a.zIndex - b.zIndex || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .flatMap(binding => demoGeometry.get(binding.assetId)?.paths.map((part, index) => <path key={`${binding.id}-${index}`} d={part.d} fill={part.fill} stroke={part.stroke} strokeWidth={part.strokeWidth} />) ?? [])}
  </svg>
}
