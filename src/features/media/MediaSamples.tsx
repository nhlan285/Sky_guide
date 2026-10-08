import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { StatusBadge } from '../../shared/ui/primitives'
import { MediaPreview } from './MediaPreview'
import { originalMediaSamples } from './originalAssets'

export function MediaSamples() {
  const vi = useLocale().locale === 'vi', [selected, setSelected] = useState(originalMediaSamples[0].id as string)
  const sample = originalMediaSamples.find(value => value.id === selected) ?? null
  return <div className="information-page media-page">
    <Link className="text-link" to="/hub">← {vi ? 'Về Khám phá' : 'Back to Explore'}</Link>
    <div className="page-intro"><h1 id="page-title" tabIndex={-1}>{vi ? 'Xem thử chuyển động và tiếng gọi' : 'Motion and call previews'}</h1><StatusBadge>{vi ? 'Mẫu tự tạo' : 'Original samples'}</StatusBadge><p>{vi ? 'Thử một chuyển động hoặc tiếng gọi minh họa. Video và âm thanh Sky chưa được cung cấp khi thiếu dữ liệu hoặc quyền sử dụng.' : 'Try an illustrative motion or call. Sky footage and audio remain unavailable without verified data and reuse rights.'}</p></div>
    <div className="input-field media-selector"><label htmlFor="media-sample">{vi ? 'Mẫu xem thử' : 'Preview sample'}</label><select id="media-sample" value={selected} onChange={event => setSelected(event.target.value)}><option value={originalMediaSamples[0].id}>{vi ? 'Vẫy tay tự tạo' : 'Original wave'}</option><option value={originalMediaSamples[1].id}>{vi ? 'Tiếng gọi tự tạo' : 'Original call'}</option><option value="withheld">{vi ? 'Mẫu Sky chưa có quyền sử dụng' : 'Sky sample without reuse permission'}</option></select></div>
    <MediaPreview key={selected} sample={sample} />
  </div>
}
