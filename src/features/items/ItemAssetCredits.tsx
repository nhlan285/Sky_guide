import type { ItemAsset } from '../../data/itemLookup/assets.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { itemCopy } from './copy.ts'

const plain = (value: string) => value.replace(/<[^>]*>/g, '').slice(0, 1200)
export function ItemAssetCredits({ assets }: { assets: ItemAsset[] }) {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  if (!assets.length) return null
  return <details className="item-media-sources"><summary>{copy.imageCredit} · Sky Wiki ({assets.length})</summary>
    <p>{copy.mediaPermission}</p>
    <ul>{assets.map(image => <li key={image.mediaId}><a href={image.filePageUrl}>{image.sourceFilename} ↗</a>
      <p>{image.credit ?? copy.unknown} · {image.rightsStatus}</p>
      {Object.entries({ ...image.licenseMetadata, ...image.creditMetadata }).map(([key, entry]) => typeof entry.value === 'string' ? <p key={key}>{key}: {plain(entry.value)}</p> : null)}
      <a href={image.sourcePageUrl}>{copy.sources} ↗</a>
    </li>)}</ul>
  </details>
}
