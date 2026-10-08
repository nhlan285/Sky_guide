import { ContentState } from '../../shared/ui/ContentState'
import { Link, useNavigate } from 'react-router-dom'
import { Button, SectionCard, StatusBadge, TextInput } from '../../shared/ui/primitives'
import { useLocale } from '../../shared/i18n/useLocale'
import { catalogueSummary } from '../../data/itemLookup/summary.ts'
import { itemCopy } from '../items/copy.ts'
import { SourceCredits } from '../items/SourceCredits.tsx'

export function Hub() {
  const { t, locale } = useLocale()
  const navigate = useNavigate()
  const copy = itemCopy[locale]
  return (
    <div className="hub-page">
      <div className="page-intro hub-hero">
        <p className="eyebrow">{t('hub.eyebrow')}</p>
        <h1 id="page-title" tabIndex={-1}>{t('hub.title')}</h1>
        <p>{t('hub.subtitle')}</p>
      </div>

      <div className="hub-grid">
        <SectionCard id="item-lookup" title={t('hub.items')} className="hub-grid__wide hub-lookup">
          <div className="hub-lookup__layout"><div><p className="section-description">{t('hub.items.desc')}</p>
            <p className="hub-lookup__count">{catalogueSummary?.accepted.toLocaleString(locale) ?? '—'} <span>{copy.total}</span></p>
            <Link to="/items" className="text-link">{copy.browse} ↗</Link>
          </div>
          {catalogueSummary ? <form className="lookup-controls" onSubmit={event => {
            event.preventDefault()
            const form = new FormData(event.currentTarget)
            const params = new URLSearchParams()
            const query = String(form.get('q') ?? '').trim()
            const slot = String(form.get('slot') ?? '')
            if (query) params.set('q', query)
            if (slot) params.set('slot', slot)
            navigate(`/items${params.size ? `?${params.toString()}` : ''}`)
          }}>
            <TextInput id="item-query" name="q" label={t('hub.items.name')} type="search" placeholder={copy.placeholder} />
            <div className="lookup-controls__row"><div className="input-field"><label htmlFor="item-slot">{t('hub.items.slot')}</label><select id="item-slot" name="slot"><option value="">{t('hub.items.all')}</option>{['hair', 'mask', 'cape', 'accessory'].map(slot => <option value={slot} key={slot}>{copy.slots[slot]}</option>)}</select></div><Button type="submit">{t('hub.items.search')}</Button></div>
          </form> : <p role="alert">{copy.unavailable}</p>}
          </div>
        </SectionCard>
        <SectionCard id="season-event" title={t('hub.season')} className="section-card--featured">
          <p className="section-description">{t('hub.season.desc')}</p>
          <p>{locale === 'vi' ? 'Xem các mốc từ thông báo tháng 10 của TGC đã đối chiếu thủ công. Chưa có đồng bộ trực tiếp.' : 'View manually reviewed entries from TGC’s October announcement. Live sync is not connected.'}</p>
          <Link className="button" to="/events">{locale === 'vi' ? 'Xem lịch có nguồn' : 'View sourced schedule'}</Link>
        </SectionCard>

        <SectionCard id="traveling-spirit" title={t('hub.ts')}>
          <p className="section-description">{t('hub.ts.desc')}</p>
          <p>{locale === 'vi' ? 'Xem hai lần ghé đã đối chiếu nguồn của Leaping Dancer; lịch hiện tại chưa được xác minh.' : 'Explore two source-reviewed Leaping Dancer visits; the current schedule is unverified.'}</p>
          <Link to="/traveling-spirits" className="button">{locale === 'vi' ? 'Xem lịch sử mẫu' : 'View history sample'}</Link>
          <Link to="/spirits" className="text-link">{locale === 'vi' ? 'Tính đường mở khóa cây spirit' : 'Estimate a spirit unlock path'}</Link>
          <p className="section-note">{t('hub.ts.note')}</p>
        </SectionCard>

        <SectionCard id="official-news" title={t('hub.news')} className="hub-grid__wide section-card--news">
          <ContentState kind="unavailable" message={t('hub.news.reason')} />
        </SectionCard>

        <SectionCard id="wardrobe" title={t('hub.wardrobe')} className="section-card--wardrobe" badge={<StatusBadge>{t('status.demo')}</StatusBadge>}>
          <p className="wardrobe-heading">{t('hub.wardrobe.title')}</p>
          <p className="section-description">{t('hub.wardrobe.desc')}</p>
          <Link to="/wardrobe" className="button">{t('hub.wardrobe.open')}</Link>
        </SectionCard>

        <SectionCard id="maps-routes" title={t('hub.maps')} className="hub-grid__wide section-card--compact" badge={<StatusBadge>{t('status.comingSoon')}</StatusBadge>}>
          <p>{t('hub.maps.reason')}</p>
        </SectionCard>

        <SectionCard id="music" title={locale === 'vi' ? 'Chơi nhạc' : 'Music playground'}>
          <p>{locale === 'vi' ? 'Thử giai điệu trên 15 nốt với âm thanh tự tạo. Chạm hoặc dùng bàn phím.' : 'Try a melody on 15 original tones. Tap or use the keyboard.'}</p>
          <Link className="button" to="/music">{locale === 'vi' ? 'Mở nhạc cụ' : 'Open instrument'}</Link>
        </SectionCard>

        <SectionCard id="media" title={locale === 'vi' ? 'Chuyển động và tiếng gọi' : 'Motion and calls'}>
          <p>{locale === 'vi' ? 'Xem thử mẫu minh họa tự tạo. Chưa cung cấp video hoặc âm thanh Sky thiếu quyền sử dụng.' : 'Preview original illustrative samples. Sky footage and audio remain withheld without reuse rights.'}</p>
          <Link className="button" to="/media">{locale === 'vi' ? 'Mở bản xem thử' : 'Open previews'}</Link>
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
      <SourceCredits />
    </div>
  )
}
