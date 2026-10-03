import { useState } from 'react'
import type { LookupEntry } from '../../data/itemLookup/model.ts'
import { resolveItemImage } from '../../data/itemLookup/images.ts'
import { displayMedia } from '../../data/itemLookup/media.ts'
import type { CatalogueMedia } from '../../data/itemLookup/media.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { selectWikiImage } from '../../data/itemLookup/wiki.ts'
import type { WikiThumbnail, WikiMedia } from '../../data/itemLookup/wiki.ts'
import { itemCopy } from './copy.ts'

export function ItemThumbnail({ entry, detail = false, media, wikiMedia, description }: { entry: LookupEntry; detail?: boolean; media?: CatalogueMedia; wikiMedia?: WikiThumbnail | WikiMedia; description?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const primary = media ?? entry.images?.primary
  const image = primary ? displayMedia(primary, failedUrl) : resolveItemImage(entry.image, failedUrl)
  const wiki = wikiMedia ?? (!media ? entry.wiki?.primary : null)
  const url = wiki ? selectWikiImage(wiki, detail, failedUrl) : image?.url
  return <div className={`item-thumbnail${detail ? ' item-thumbnail--detail' : ''}`}>
    {url ? <img src={url} alt={description ?? (detail ? entry.item.name.default : '')} width={wiki?.width ?? 480} height={wiki?.height ?? 480} loading={detail ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedUrl(url)} /> :
      <div className="item-thumbnail__placeholder"><span>{copy.imageUnavailable}</span><small>{copy.categories[entry.category]}</small></div>}
  </div>
}
