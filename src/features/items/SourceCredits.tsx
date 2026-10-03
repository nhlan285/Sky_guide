import { useLocale } from '../../shared/i18n/useLocale'
import { catalogueSummary } from '../../data/itemLookup/summary.ts'
import { itemCopy } from './copy.ts'

export function SourceCredits() {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  if (!catalogueSummary) return null
  return <details className="catalogue-credits">
    <summary>{copy.creditsTitle}</summary>
    <div className="catalogue-credits__content">
    <p className="catalogue-credits__status">{copy.snapshot} <span>· {copy.imported} {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(catalogueSummary.generatedAt))}</span></p>
    <p>{copy.credit}</p>
    <p>{copy.upstreamSource} <a href={`https://github.com/${catalogueSummary.repository}/tree/${catalogueSummary.revision}/packages/utility`}>ThatSkyApplication public utility dataset</a> · <a href="/licenses/thatskyapplication-utility.txt">{copy.license}</a></p>
    <p>{copy.caveat}</p>
    <p>{copy.revision}: <code>{catalogueSummary.revision}</code></p><p>{catalogueSummary.version}</p>
    </div>
  </details>
}
