import { useState } from 'react'
import type { LookupEntry } from '../../data/itemLookup/model.ts'
import { selectItemAsset } from '../../data/itemLookup/assets.ts'
import type { ItemAsset } from '../../data/itemLookup/assets.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { itemCopy } from './copy.ts'

export function ItemThumbnail({ entry, detail = false, asset, description }: { entry: LookupEntry; detail?: boolean; asset?: ItemAsset | null; description?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const selected = asset === undefined ? entry.asset : asset
  const url = selectItemAsset(selected, detail, failedUrl)
  const variant = detail ? selected?.variants.detail : selected?.variants.cards
  return <div className={`item-thumbnail${detail ? ' item-thumbnail--detail' : ''}`}>
    {url ? <img src={url} alt={description ?? (detail ? entry.item.name.default : '')} width={variant?.width} height={variant?.height} loading={detail ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(url)} /> :
      <div className="item-thumbnail__placeholder"><span>{copy.imageUnavailable}</span><small>{copy.categories[entry.category]}</small></div>}
  </div>
}
