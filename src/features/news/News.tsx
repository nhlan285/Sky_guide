import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { filterReviewedNews } from '../../data/news/reviewedNews'
import type { NewsKind } from '../../data/news/reviewedNews'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, SectionCard, StatusBadge, TextInput } from '../../shared/ui/primitives'

export function News() {
  const { locale } = useLocale(), vi = locale === 'vi', id = useId()
  const [query, setQuery] = useState(''), [kind, setKind] = useState<NewsKind | 'all'>('all')
  const entries = filterReviewedNews(query, kind)
  return <div className="information-page">
    <Link className="text-link" to="/hub">← {vi ? 'Về Khám phá' : 'Back to Explore'}</Link>
    <div className="page-intro"><h1 id="page-title" tabIndex={-1}>{vi ? 'Tin chính thức' : 'Official news'}</h1><StatusBadge tone="info">{vi ? 'Hai mẫu đã đối chiếu thủ công' : 'Two manually reviewed samples'}</StatusBadge>
      <p>{vi ? 'Thông báo TGC và ghi chú hotfix lịch sử, với nguồn gốc rõ ràng. Chưa có luồng tin đồng bộ hoặc kiểm chứng phiên bản mới nhất.' : 'A TGC announcement and a historical hotfix note, with original sources. A synced feed and latest-release verification are unavailable.'}</p>
      <p className="section-note">{vi ? 'Bản đã lưu có thể chưa phản ánh sửa đổi mới. Ngày bài và ngày phát hành được phân biệt; thời điểm đăng hoặc sửa chính xác còn chưa rõ.' : 'Stored reviews may miss newer edits. Article dates and release dates remain distinct; exact publication and modification instants are unknown.'}</p>
    </div>
    <TextInput id={`${id}-query`} type="search" label={vi ? 'Tìm tiêu đề, phiên bản hoặc nền tảng' : 'Search title, version or platform'} value={query} onChange={event => setQuery(event.target.value)} />
    <div className="input-field"><label htmlFor={`${id}-kind`}>{vi ? 'Loại tin' : 'News type'}</label><select id={`${id}-kind`} value={kind} onChange={event => setKind(event.target.value as NewsKind | 'all')}><option value="all">{vi ? 'Tất cả' : 'All'}</option><option value="announcement">{vi ? 'Thông báo' : 'Announcements'}</option><option value="patch-note">{vi ? 'Ghi chú cập nhật' : 'Patch notes'}</option></select></div>
    {!entries.length ? <div role="status"><p>{vi ? 'Không có tin phù hợp.' : 'No matching news.'}</p><Button onClick={() => { setQuery(''); setKind('all') }}>{vi ? 'Xóa bộ lọc' : 'Clear filters'}</Button></div> : entries.map(entry => <SectionCard key={entry.id} id={`reviewed-news-${entry.id}`} title={entry.title} badge={<StatusBadge tone="info">{vi ? 'Chính thức · mẫu đã lưu' : 'Official · saved sample'}</StatusBadge>}>
      <p>{entry.source.attribution} · {entry.dateMeaning === 'release' ? (vi ? 'Ngày phát hành trong tiêu đề' : 'Heading release date') : (vi ? 'Ngày bài' : 'Article date')}: <time dateTime={entry.date.value}>{entry.date.value}</time></p>
      {entry.version && <p>{vi ? 'Phiên bản' : 'Version'}: {entry.version} · {entry.platforms.join(', ')}</p>}
      {entry.summaryOwnWords && <><p lang="en">{entry.summaryOwnWords}</p><p className="section-note">{vi ? 'Tóm tắt tự viết bằng tiếng Anh theo bản đã đối chiếu; không xác nhận tình trạng hiện tại.' : 'Original English summary of the reviewed snapshot; current availability is not verified.'}</p></>}
      <a className="text-link" href={entry.source.sourceUrl!} target="_blank" rel="noopener noreferrer">{vi ? 'Đọc nguồn gốc' : 'Read original source'} ↗</a>
      {entry.kind === 'announcement' && <p><Link className="text-link" to="/events">{vi ? 'Xem các mốc đã đối chiếu' : 'View reviewed schedule entries'}</Link></p>}
      <p className="section-note">{vi ? 'Đối chiếu lần cuối' : 'Last reviewed'}: {new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.source.retrievedAt))} · UTC. {vi ? 'Revision nguồn chưa rõ.' : 'Source revision unknown.'}</p>
    </SectionCard>)}
  </div>
}
