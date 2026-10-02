import { ContentState } from '../../shared/ui/ContentState'
import { Button, SectionCard, StatusBadge, TextInput } from '../../shared/ui/primitives'
import { useLocale } from '../../shared/i18n/useLocale'

export function Hub() {
  const { t } = useLocale()
  return (
    <>
      <div className="page-intro hub-hero">
        <p className="eyebrow">{t('hub.eyebrow')}</p>
        <h1 id="page-title" tabIndex={-1}>{t('hub.title')}</h1>
        <p>{t('hub.subtitle')}</p>
      </div>

      <aside className="source-strip" aria-label={t('hub.sourceLabel')}>
        <StatusBadge tone="info">{t('status.building')}</StatusBadge>
        <p>{t('hub.source')}</p>
      </aside>

      <div className="hub-grid">
        <SectionCard id="season-event" title={t('hub.season')} className="section-card--featured">
          <p className="section-description">{t('hub.season.desc')}</p>
          <ContentState kind="unavailable" message={t('hub.season.reason')} />
        </SectionCard>

        <SectionCard id="traveling-spirit" title={t('hub.ts')}>
          <p className="section-description">{t('hub.ts.desc')}</p>
          <ContentState kind="unavailable" message={t('hub.ts.reason')} />
          <p className="section-note">{t('hub.ts.note')}</p>
        </SectionCard>

        <SectionCard id="official-news" title={t('hub.news')} className="hub-grid__wide section-card--news">
          <ContentState kind="unavailable" message={t('hub.news.reason')} />
        </SectionCard>

        <SectionCard id="item-lookup" title={t('hub.items')}>
          <p className="section-description">{t('hub.items.desc')}</p>
          <div className="lookup-controls" role="group" aria-label={t('hub.items.group')} aria-describedby="lookup-reason">
            <TextInput id="item-query" label={t('hub.items.name')} type="search" placeholder={t('hub.items.placeholder')} readOnly aria-describedby="lookup-reason" />
            <div className="lookup-controls__row">
              <div className="input-field">
                <label htmlFor="item-slot">{t('hub.items.slot')}</label>
                <select id="item-slot" disabled aria-describedby="lookup-reason">
                  <option>{t('hub.items.all')}</option>
                </select>
              </div>
              <Button disabled aria-describedby="lookup-reason">{t('hub.items.search')}</Button>
            </div>
          </div>
          <div id="lookup-reason">
            <ContentState kind="unavailable" message={t('hub.items.reason')} />
          </div>
        </SectionCard>

        <SectionCard id="wardrobe" title={t('hub.wardrobe')} className="section-card--wardrobe" badge={<StatusBadge>{t('status.demo')}</StatusBadge>}>
          <p className="wardrobe-heading">{t('hub.wardrobe.title')}</p>
          <p className="section-description">{t('hub.wardrobe.desc')}</p>
          <ContentState kind="unavailable" message={t('hub.wardrobe.reason')} />
        </SectionCard>

        <SectionCard id="maps-routes" title={t('hub.maps')} className="hub-grid__wide section-card--compact" badge={<StatusBadge>{t('status.comingSoon')}</StatusBadge>}>
          <p>{t('hub.maps.reason')}</p>
        </SectionCard>

        <details className="community-panel hub-grid__wide">
          <summary>
            <span className="community-panel__title">{t('hub.community')} <span>{t('hub.community.label')}</span></span>
            <StatusBadge>{t('status.unapproved')}</StatusBadge>
          </summary>
          <div className="community-panel__body">
            <ContentState kind="unavailable" message={t('hub.community.reason')} />
          </div>
        </details>
      </div>
    </>
  )
}
