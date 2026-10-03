import { useEffect, useMemo, useRef } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import type { AcquisitionOption } from '../../data/catalog/index.ts'
import { catalogResult } from '../../data/itemLookup/catalog.ts'
import { activeFilterValues, clearFilterParams, contextualLookupUrl, costRepresentation, filterEntries, filtersFromParams, lookupById, updateFilterParams } from '../../data/itemLookup/model.ts'
import type { FilterKey, LookupEntry } from '../../data/itemLookup/model.ts'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, SectionCard, TextInput } from '../../shared/ui/primitives'
import { ItemThumbnail } from './ItemThumbnail.tsx'
import { resolveItemImage } from '../../data/itemLookup/images.ts'
import { displayMedia, imageSources } from '../../data/itemLookup/media.ts'
import { SourceCredits } from './SourceCredits.tsx'
import { itemCopy } from './copy.ts'

const catalog = catalogResult.valid ? catalogResult.value : null
const seasonNames = new Map(catalog?.seasons.map(s => [s.id, s.name.default]))
const spiritNames = new Map(catalog?.spirits.map(s => [s.id, s.name.default]))
const options = {
  categories: [...new Set(catalog?.entries.map(e => e.category))].sort(),
  slots: [...new Set(catalog?.entries.map(e => e.item.slot).filter(s => s !== 'unknown'))].sort(),
  seasons: [...new Set(catalog?.entries.flatMap(e => e.item.seasonIds))].sort((a, b) => (seasonNames.get(a) ?? '').localeCompare(seasonNames.get(b) ?? '', 'en')),
  spirits: [...new Set(catalog?.entries.flatMap(e => e.item.spiritIds))].sort((a, b) => (spiritNames.get(a) ?? '').localeCompare(spiritNames.get(b) ?? '', 'en')),
  acquisitions: [...new Set(catalog?.entries.flatMap(e => e.offers.map(o => o.acquisition)))].sort(),
}
const pageSize = 36

function ContextLink({ filter, value, children, search }: { filter: FilterKey; value: string; children: string; search: string }) {
  return <Link className="context-chip" to={contextualLookupUrl(new URLSearchParams(search), filter, value)}>{children}<span aria-hidden="true">↗</span></Link>
}

function Cost({ option }: { option: AcquisitionOption }) {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const representation = costRepresentation(option)
  if (representation === 'unknown') return <span>{copy.unknownCost}</span>
  if (representation === 'free') return <span>{copy.free}</span>
  return <span>{option.costs.map(cost => `${cost.amount} ${copy.currencies[cost.sourceCurrencyLabel] ?? cost.sourceCurrencyLabel}`).join(' + ')}</span>
}
function ItemCard({ entry, search }: { entry: LookupEntry; search: string }) {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const offer = entry.item.acquisitionOptions.find(o => o.costStatus !== 'unknown') ?? entry.item.acquisitionOptions[0]
  const evidence = entry.offers.find(e => e.id === offer?.id)
  return <li><Link className="item-card" to={`/items/${entry.id}${search}`} aria-label={`${entry.item.name.default} — ${copy.open}`}>
    <ItemThumbnail entry={entry} />
    <div className="item-card__body"><span className="item-card__category">{copy.categories[entry.category]}</span>
    <h2>{entry.item.name.default}</h2>
    <p className="item-card__origin">{entry.item.spiritIds.map(id => spiritNames.get(id)).filter(Boolean).join(' · ') || entry.item.seasonIds.map(id => seasonNames.get(id)).filter(Boolean).join(' · ') || copy.unknown}</p>
    <div className="item-card__cost"><p>{offer ? <Cost option={offer} /> : copy.unknownCost}</p>{evidence ? <small>{copy.acquisitions[evidence.acquisition]}{evidence.seasonPass ? ` · ${copy.pass}` : ''}{evidence.bundle ? ` · ${copy.bundle}` : ''}</small> : null}</div>
    <span className="item-card__open">{copy.open} <span aria-hidden="true">↗</span></span></div>
  </Link></li>
}

function ItemDetail({ entry, search }: { entry: LookupEntry; search: string }) {
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const item = entry.item
  const image = entry.images?.primary ? displayMedia(entry.images.primary) : resolveItemImage(entry.image)
  const mediaSources = imageSources(entry.images)
  const gallery = entry.images?.gallery.filter(media => displayMedia(media)) ?? []
  const relation = (ids: string[], names: Map<string, string>, filter: 'season' | 'spirit') => ids.length ? ids.map(id => names.has(id) ? <ContextLink key={id} filter={filter} value={id} search={search}>{names.get(id)!}</ContextLink> : <span key={id}>{copy.unknown}</span>) : copy.unknown
  const sources = catalog?.provenance.filter(source => item.provenanceIds.includes(source.id)) ?? []
  return <>
    <Link to={`/items${search}`} className="text-link">← {copy.back}</Link>
    <div className="item-detail__hero"><div><ItemThumbnail key={entry.id} entry={entry} detail />
      {image ? <p className="item-image-credit"><a href={image.sourceUrl}>{copy.imageCredit} ↗</a> · {image.credit} · <a href={image.permissionUrl}>{image.license}</a></p> : <p className="item-image-credit">{copy.imageNote}</p>}
    </div><div><p className="eyebrow">{copy.categories[entry.category]}</p><h1 id="page-title" tabIndex={-1}>{item.name.default}</h1></div></div>
    {gallery.length ? <section className="item-gallery" aria-label={copy.previews}>{gallery.map(media => <figure key={media.sourceUrl}><ItemThumbnail entry={entry} media={media} description={`${item.name.default} — ${media.kind === 'worn-preview' ? copy.wornPreview : copy.referenceImage}`} /><figcaption><a href={media.sourceUrl}>{media.kind === 'worn-preview' ? copy.wornPreview : copy.referenceImage} ↗</a></figcaption></figure>)}</section> : null}
    <div className="item-detail__grid">
      <div className="item-detail__facts">
        <SectionCard id="item-identity" title={copy.identity}><dl className="item-facts"><dt>{copy.category}</dt><dd>{entry.category !== 'unknown' ? <ContextLink filter="category" value={entry.category} search={search}>{copy.categories[entry.category]}</ContextLink> : copy.categories[entry.category]}</dd><dt>{copy.slot}</dt><dd>{item.slot !== 'unknown' ? <ContextLink filter="slot" value={item.slot} search={search}>{copy.slots[item.slot]}</ContextLink> : copy.unknown}</dd></dl></SectionCard>
        <SectionCard id="item-origin" title={copy.origin}><dl className="item-facts"><dt>{copy.season}</dt><dd>{relation(item.seasonIds, seasonNames, 'season')}</dd><dt>{copy.spirit}</dt><dd>{relation(item.spiritIds, spiritNames, 'spirit')}</dd></dl></SectionCard>
        <SectionCard id="item-quality" title={copy.dataQuality}><p>{copy.qualityNote}</p><p className="section-note">{entry.categoryEvidence ?? copy.unknown}</p></SectionCard>
      </div>
      <SectionCard id="item-acquisition" title={copy.offers}>
        <p className="section-description">{copy.priceNote}</p>
        {item.acquisitionOptions.length ? <ol className="item-offers">{item.acquisitionOptions.map(option => {
          const evidence = entry.offers.find(offer => offer.id === option.id)!
          return <li key={option.id}><h3>{evidence.acquisition !== 'unknown' ? <ContextLink filter="acquisition" value={evidence.acquisition} search={search}>{copy.acquisitions[evidence.acquisition]}</ContextLink> : copy.unknown}</h3><p className="item-offers__cost"><Cost option={option} /></p>
            {evidence.money !== null ? <p>{evidence.money} · {copy.money}</p> : null}
            {evidence.seasonPass ? <p className="section-note">{copy.pass}</p> : null}
            {evidence.bundle ? <p className="section-note">{copy.bundle}</p> : null}
            <a className="text-link" href={evidence.sourceUrl}>{copy.sources} ↗</a>
          </li>
        })}</ol> : <p>{copy.noOffers}</p>}
      </SectionCard>
    </div>
    <SectionCard id="item-sources" title={copy.sources}>
      {mediaSources.length ? <details className="item-media-sources"><summary>{copy.imageCredit} ({mediaSources.length})</summary><ul>{mediaSources.map((media, index) => <li key={`${media.sourceUrl}-${index}`}><a href={media.sourceUrl}>{media.sourceLabel} · {'kind' in media && media.kind === 'worn-preview' ? copy.wornPreview : copy.referenceImage} ↗</a>
        <p>{media.reuseStatus === 'reference-only' ? copy.referenceOnly : `${media.credit} · ${media.license}`}</p>
        {media.reuseStatus === 'reference-only' ? <a href={media.identitySourceUrl}>{copy.technicalMetadata} ↗</a> : <a href={media.permissionUrl}>{media.license}</a>}
      </li>)}</ul></details> : null}
      <SourceCredits />
      <details className="item-technical"><summary>{copy.technicalMetadata}</summary><dl className="item-facts"><dt>{copy.upstreamId}</dt><dd>{entry.upstreamId}</dd><dt>{copy.identifier}</dt><dd><code>{entry.identifier}</code></dd></dl>
        <ul className="item-source-list">{sources.map(source => <li key={source.id}><a href={source.sourceUrl ?? undefined}>{source.sourceRecordKey}</a></li>)}</ul>
      </details>
    </SectionCard>
  </>
}

export function Items() {
  const { id } = useParams()
  const [params, setParams] = useSearchParams()
  const { locale } = useLocale()
  const copy = itemCopy[locale]
  const { query, category, slot, season, spirit, acquisition } = filtersFromParams(params)
  const results = useMemo(() => filterEntries(catalog?.entries ?? [], { query, category, slot, season, spirit, acquisition }), [query, category, slot, season, spirit, acquisition])
  const pageCount = Math.max(1, Math.ceil(results.length / pageSize))
  const parsedPage = Number(params.get('page') ?? 1)
  const page = Number.isSafeInteger(parsedPage) ? Math.min(pageCount, Math.max(1, parsedPage)) : 1
  const search = params.size ? `?${params.toString()}` : ''
  const resultsRef = useRef<HTMLDivElement>(null)
  const heading = useRef<HTMLDivElement>(null)
  useEffect(() => { heading.current?.querySelector<HTMLElement>('#page-title')?.focus({ preventScroll: true }) }, [id])
  const changeFilter = (key: Parameters<typeof updateFilterParams>[1], value: string) => setParams(previous => updateFilterParams(previous, key, value), { replace: true })
  const clear = () => setParams(previous => clearFilterParams(previous))
  const active = activeFilterValues(params)
  const filterLabel = (key: FilterKey) => key === 'q' ? copy.search : copy[key]
  const filterValue = (key: FilterKey, value: string) => key === 'season' ? seasonNames.get(value) ?? value : key === 'spirit' ? spiritNames.get(value) ?? value : key === 'category' ? copy.categories[value as keyof typeof copy.categories] ?? value : key === 'slot' ? copy.slots[value] ?? value : key === 'acquisition' ? copy.acquisitions[value as keyof typeof copy.acquisitions] ?? value : value
  const select = (key: Parameters<typeof updateFilterParams>[1], label: string, values: readonly string[], name: (value: string) => string) => values.length ? <div className="input-field" key={key}><label htmlFor={`filter-${key}`}>{label}</label><select id={`filter-${key}`} value={params.get(key) ?? ''} onChange={event => changeFilter(key, event.target.value)}><option value="">{copy.all}</option>{values.map(value => <option value={value} key={value}>{name(value)}</option>)}</select></div> : null
  const goToPage = (nextPage: number) => {
    setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(nextPage)); return next })
    resultsRef.current?.focus({ preventScroll: true })
    resultsRef.current?.scrollIntoView({ block: 'start' })
  }
  if (!catalog) return <div className="information-page"><h1 id="page-title" tabIndex={-1}>{copy.title}</h1><p role="alert">{copy.unavailable}</p><Link to="/hub" className="button">Hub</Link></div>
  if (id) {
    const entry = lookupById(catalog.entries, id)
    return <div ref={heading} className="items-page">{entry ? <ItemDetail entry={entry} search={search} /> : <><h1 id="page-title" tabIndex={-1}>{copy.notFound}</h1><Link to={`/items${search}`} className="button">{copy.back}</Link></>}</div>
  }
  return <div ref={heading} className="items-page">
    <div className="page-intro items-intro"><p className="eyebrow">Sky Guide / {copy.title}</p><h1 id="page-title" tabIndex={-1}>{copy.title}</h1><p>{copy.subtitle}</p></div>
    <div className="items-search"><TextInput id="catalogue-query" label={copy.search} type="search" placeholder={copy.placeholder} value={query} onChange={event => changeFilter('q', event.target.value)} /><Button className="button--quiet" onClick={clear}>{copy.clear}</Button></div>
    {active.length ? <section className="active-filters" aria-label={copy.activeFilters}><p>{copy.activeFilters}</p><ul>{active.map(({ key, value }) => <li key={key}><span>{filterLabel(key)}: <strong>{filterValue(key, value)}</strong></span><button type="button" aria-label={`${copy.removeFilter} ${filterLabel(key)}: ${filterValue(key, value)}`} onClick={() => changeFilter(key, '')}>×</button></li>)}</ul></section> : null}
    <details className="catalogue-filters"><summary>{copy.filters} <span>{[category, slot, season, spirit, acquisition].filter(Boolean).length || ''}</span></summary><div className="catalogue-filters__grid">
      {select('category', copy.category, options.categories, value => copy.categories[value as keyof typeof copy.categories])}
      {select('slot', copy.slot, options.slots, value => copy.slots[value])}
      {select('season', copy.season, options.seasons, value => seasonNames.get(value) ?? value)}
      {select('spirit', copy.spirit, options.spirits, value => spiritNames.get(value) ?? value)}
      {select('acquisition', copy.acquisition, options.acquisitions, value => copy.acquisitions[value as keyof typeof copy.acquisitions])}
    </div></details>
    <div className="catalogue-results" ref={resultsRef} tabIndex={-1}><div className="catalogue-results__bar"><p role="status" aria-live="polite">{results.length.toLocaleString(locale)} {copy.results}</p><span>{copy.page} {page} / {pageCount}</span></div>
      {results.length ? <ul className="item-grid">{results.slice((page - 1) * pageSize, page * pageSize).map(entry => <ItemCard key={entry.id} entry={entry} search={search} />)}</ul> : <div className="catalogue-empty"><h2>{copy.empty}</h2><p>{copy.emptyHint}</p><Button onClick={clear}>{copy.clear}</Button></div>}
      {pageCount > 1 ? <nav className="catalogue-pagination" aria-label={copy.page}><Button className="button--quiet" disabled={page <= 1} onClick={() => goToPage(page - 1)}>{copy.previous}</Button><span>{page} / {pageCount}</span><Button className="button--quiet" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>{copy.next}</Button></nav> : null}
    </div>
    <SourceCredits />
  </div>
}
