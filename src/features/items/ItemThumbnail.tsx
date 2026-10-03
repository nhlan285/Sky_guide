import { useState } from 'react'
import type { LookupEntry } from '../../data/itemLookup/model.ts'
import { resolveItemImage } from '../../data/itemLookup/images.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { CategoryGlyph } from './CategoryGlyph.tsx'
import { itemCopy } from './copy.ts'

export function ItemThumbnail({ entry, detail = false }: { entry: LookupEntry; detail?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const image = resolveItemImage(entry.image, failedUrl)
  return <div className={`item-thumbnail${detail ? ' item-thumbnail--detail' : ''}`}>
    {image ? <img src={image.url} alt={detail ? entry.item.name.default : ''} width={480} height={300} loading={detail ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(image.url)} /> :
      <div className="item-thumbnail__placeholder" role={detail ? 'img' : undefined} aria-label={detail ? `${copy.categoryPlaceholder}: ${copy.categories[entry.category]}` : undefined} aria-hidden={detail ? undefined : true}><CategoryGlyph category={entry.category} /><span>{copy.categories[entry.category]}</span></div>}
  </div>
}
