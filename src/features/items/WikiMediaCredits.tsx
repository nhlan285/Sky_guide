import type { WikiDetail, WikiMedia } from '../../data/itemLookup/wiki.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { itemCopy } from './copy.ts'

// MediaWiki extmetadata can contain HTML; render only inert text, never markup.
const plain = (value: string) => value.replace(/<[^>]*>/g, '').slice(0, 1200)
export function WikiMediaCredits({ detail, media }: { detail?: WikiDetail; media: WikiMedia[] }) {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  if (!detail?.evidence.length && !media.length) return null
  return <details className="item-media-sources"><summary>{copy.imageCredit} · Sky Wiki ({media.length})</summary>
    <p>{copy.mediaPermission}</p>
    <p>Sky Wiki · <a href="https://www.fandom.com/licensing">CC-BY-SA ({locale === 'vi' ? 'dữ liệu văn bản đã chuẩn hóa' : 'normalized text data'})</a></p>
    <ul>{media.map(image => <li key={image.mediaId}><a href={image.filePageUrl}>{image.fileTitle} ↗</a>
      <p>{image.uploader ?? copy.unknown}{image.timestamp ? ` · ${image.timestamp.slice(0, 10)}` : ''}</p>
      {Object.entries({ ...image.licenseMetadata, ...image.creditMetadata }).map(([key, entry]) => typeof entry.value === 'string' ? <p key={key}>{key}: {plain(entry.value)}</p> : null)}
      <a href={image.originalUrl}>{copy.referenceImage} ↗</a>
    </li>)}</ul>
    {detail?.evidence.length ? <details><summary>{copy.technicalMetadata}</summary><ul>{detail.evidence.map((e, i) => <li key={`${e.sourceField}-${i}`}><a href={e.wikiPageUrl}>{e.spirit ?? e.event ?? e.season ?? e.sourcePage} ↗</a><p>{e.sourcePage} · {copy.revision} {e.sourceRevision} · {e.sourceField}</p></li>)}</ul></details> : null}
  </details>
}
