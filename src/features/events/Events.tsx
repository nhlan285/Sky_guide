import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { manualSchedule, formatScheduleTime, eventDisplayZones } from '../../data/events/manualSchedule'
import type { EventDisplayZone } from '../../data/events/manualSchedule'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, SectionCard, StatusBadge, TextInput } from '../../shared/ui/primitives'

export function Events() {
  const { locale } = useLocale(), vi = locale === 'vi', id = useId()
  const [query, setQuery] = useState(''), [kind, setKind] = useState('all'), [zone, setZone] = useState<EventDisplayZone>('America/Los_Angeles')
  const records = manualSchedule.records.filter(record => (kind === 'all' || record.kind === kind) && record.name.default.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  const checked = new Intl.DateTimeFormat(locale, { timeZone: zone, dateStyle: 'medium', timeStyle: 'short' }).format(new Date(manualSchedule.source.retrievedAt))
  return <div className="information-page events-page">
    <Link className="text-link" to="/hub">← {vi ? 'Về Khám phá' : 'Back to Explore'}</Link>
    <div className="page-intro"><h1 id="page-title" tabIndex={-1}>{vi ? 'Mùa và sự kiện' : 'Seasons and events'}</h1><StatusBadge tone="info">{vi ? 'Thông báo TGC · đối chiếu thủ công' : 'TGC announcement · manually reviewed'}</StatusBadge>
      <p>{vi ? 'Một bản đối chiếu thông báo tháng 10/2026. Các mốc chỉ có ngày giữ nguyên ngày Pacific trong nguồn; mốc có giờ được hiển thị theo múi giờ bạn chọn.' : 'A reviewed October 2026 announcement snapshot. Date-only entries retain the source Pacific calendar date; explicit starts use your selected timezone.'}</p>
      <p className="section-note">{vi ? 'Chưa có đồng bộ trực tiếp hoặc đồng hồ máy chủ. Không tự suy giờ kết thúc, trạng thái đang diễn ra hoặc đếm ngược từ ngày thiếu giờ.' : 'Live sync and server time are unavailable. No end times, current activity or countdowns are inferred from date-only entries.'}</p>
    </div>
    <div className="event-controls"><TextInput id={`${id}-query`} label={vi ? 'Tìm mùa hoặc sự kiện' : 'Search seasons or events'} type="search" value={query} onChange={event => setQuery(event.target.value)} />
      <div className="input-field"><label htmlFor={`${id}-kind`}>{vi ? 'Loại' : 'Type'}</label><select id={`${id}-kind`} value={kind} onChange={event => setKind(event.target.value)}><option value="all">{vi ? 'Tất cả' : 'All'}</option><option value="season">{vi ? 'Mùa' : 'Seasons'}</option><option value="event">{vi ? 'Sự kiện' : 'Events'}</option></select></div>
      <div className="input-field"><label htmlFor={`${id}-zone`}>{vi ? 'Múi giờ hiển thị' : 'Display timezone'}</label><select id={`${id}-zone`} value={zone} onChange={event => setZone(event.target.value as EventDisplayZone)}>{eventDisplayZones.map(value => <option key={value} value={value}>{value}</option>)}</select></div>
    </div>
    {!records.length ? <div role="status"><p>{vi ? 'Không có mốc phù hợp với bộ lọc.' : 'No matching entries.'}</p><Button onClick={() => { setQuery(''); setKind('all') }}>{vi ? 'Xóa bộ lọc' : 'Clear filters'}</Button></div> : <div className="event-list">{records.map(record => <SectionCard id={record.id} key={record.id} title={record.name.default} badge={<StatusBadge>{record.kind === 'season' ? (vi ? 'Mùa' : 'Season') : (vi ? 'Sự kiện' : 'Event')}</StatusBadge>}>
      <dl className="event-dates"><dt>{vi ? 'Bắt đầu' : 'Start'}</dt><dd><time dateTime={record.startsAt?.value}>{formatScheduleTime(record.startsAt, zone, locale) ?? (vi ? 'Chưa rõ' : 'Unknown')}</time></dd>
        <dt>{vi ? 'Kết thúc' : 'End'}</dt><dd><time dateTime={record.endsAt?.value}>{formatScheduleTime(record.endsAt, zone, locale) ?? (vi ? 'Chưa có mốc kết thúc trong nguồn' : 'No end provided by source')}</time></dd></dl>
      <p className="section-note">{record.startsAt?.precision === 'date' ? (vi ? 'Chỉ có ngày Pacific; giờ bắt đầu và kết thúc chưa rõ.' : 'Pacific calendar dates only; exact start and end times unknown.') : `${vi ? 'Giờ bắt đầu có nguồn' : 'Sourced start time'} · ${zone}`}</p>
      <a className="text-link" href={manualSchedule.source.sourceUrl!} target="_blank" rel="noopener noreferrer">{vi ? 'Xem thông báo gốc' : 'Open original announcement'} ↗</a>
    </SectionCard>)}</div>}
    <SectionCard id="event-source" title={vi ? 'Nguồn và độ mới' : 'Source and freshness'}>
      <p>{manualSchedule.source.attribution} · {vi ? 'bài ngày' : 'article dated'} {manualSchedule.publicationDate}</p><p>{vi ? 'Đối chiếu lần cuối' : 'Last reviewed'}: {checked} · {zone}</p>
      <p>{vi ? 'Đây là bản đã lưu theo lần đối chiếu, có thể chưa phản ánh sửa đổi mới của nguồn. Quan hệ với item/spirit và lịch lặp chưa được nối. Không có hình hoặc nội dung bài viết được sao chép.' : 'This stored review snapshot may miss newer source edits. Item/spirit relationships and recurring rules are not mapped. No article text or imagery is reproduced.'}</p>
    </SectionCard>
  </div>
}
