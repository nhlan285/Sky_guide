import { useLocale } from '../../shared/i18n/useLocale'
import { catalogueSummary } from '../../data/itemLookup/summary.ts'
import { itemCopy } from './copy.ts'

export function SourceCredits() {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  if (!catalogueSummary) return null
  return <aside className="catalogue-credits" aria-label={copy.sources}>
    <p className="catalogue-credits__status">{copy.snapshot} <span>· {copy.imported} {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(catalogueSummary.generatedAt))}</span></p>
    <p>{copy.credit} <a href={`https://github.com/${catalogueSummary.repository}/tree/${catalogueSummary.revision}/packages/utility`}>ThatSkyApplication</a> · <a href="/licenses/thatskyapplication-utility.txt">{copy.license}</a></p>
    <p>{copy.caveat}</p>
    <details><summary>{copy.revision}</summary><code>{catalogueSummary.revision}</code><p>{catalogueSummary.version}</p></details>
  </aside>
}
