import { useState } from 'react'
import type { LookupEntry } from '../../data/itemLookup/model.ts'
import { resolveItemImage } from '../../data/itemLookup/images.ts'
import { displayMedia } from '../../data/itemLookup/media.ts'
import type { CatalogueMedia } from '../../data/itemLookup/media.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { CategoryGlyph } from './CategoryGlyph.tsx'
import { itemCopy } from './copy.ts'

export function ItemThumbnail({ entry, detail = false, media, description }: { entry: LookupEntry; detail?: boolean; media?: CatalogueMedia; description?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const primary = media ?? entry.images?.primary
  const image = primary ? displayMedia(primary, failedUrl) : resolveItemImage(entry.image, failedUrl)
  return <div className={`item-thumbnail${detail ? ' item-thumbnail--detail' : ''}`}>
    {image ? <img src={image.url} alt={description ?? (detail ? entry.item.name.default : '')} width={480} height={300} loading={detail ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(image.url)} /> :
      <div className="item-thumbnail__placeholder" role={detail ? 'img' : undefined} aria-label={detail ? `${copy.categoryPlaceholder}: ${copy.categories[entry.category]}` : undefined} aria-hidden={detail ? undefined : true}><CategoryGlyph category={entry.category} /><span>{copy.categories[entry.category]}</span></div>}
  </div>
}
