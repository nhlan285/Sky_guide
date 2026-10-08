import { useEffect, useRef, useState } from 'react'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, SectionCard } from '../../shared/ui/primitives'
import { createOriginalCallWav, createOriginalWaveVideo } from './originalAssets'
import type { OriginalMediaSample } from './originalAssets'

export function MediaPreview({ sample }: { sample: OriginalMediaSample | null }) {
  const vi = useLocale().locale === 'vi'
  const controller = useRef<AbortController | null>(null), player = useRef<HTMLMediaElement | null>(null), url = useRef<string | null>(null)
  const [status, setStatus] = useState<'poster' | 'preparing' | 'ready' | 'error'>('poster'), [source, setSource] = useState<string | null>(null), [size, setSize] = useState(0)
  useEffect(() => {
    const pause = () => { player.current?.pause(); controller.current?.abort() }
    const visibility = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility)
    return () => { pause(); controller.current = null; window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); if (url.current) URL.revokeObjectURL(url.current) }
  }, [])
  async function prepare() {
    if (!sample || sample.rights !== 'self-created') return
    const current = new AbortController(); controller.current = current; setStatus('preparing')
    try {
      const blob = sample.kind === 'audio' ? new Blob([createOriginalCallWav().buffer as ArrayBuffer], { type: 'audio/wav' }) : await createOriginalWaveVideo(current.signal)
      if (current.signal.aborted || blob.size > sample.maxBytes) throw new Error('Unavailable')
      if (url.current) URL.revokeObjectURL(url.current)
      url.current = URL.createObjectURL(blob); setSource(url.current); setSize(blob.size); setStatus('ready')
    } catch { if (controller.current === current) setStatus('error') }
  }
  return <SectionCard id="original-media-preview" title={!sample ? (vi ? 'Chưa có bản xem thử' : 'Preview unavailable') : sample.kind === 'audio' ? (vi ? 'Tiếng gọi tự tạo' : 'Original call') : (vi ? 'Vẫy tay tự tạo' : 'Original wave')}>
    <svg className="media-poster" viewBox="0 0 480 480" role="img" aria-label={vi ? 'Poster minh họa tự tạo, không phải hình Sky' : 'Original illustrative poster, not Sky artwork'}><rect width="480" height="480" rx="32" fill="#142539" /><g stroke="#d3e9f5" strokeWidth="15" strokeLinecap="round" fill="none"><circle cx="240" cy="145" r="40" fill="#d3e9f5" /><path d="M240 198v112m0-75-75 45m75-45 70-35 25-90M240 310l-45 75m45-75 45 75" /></g></svg>
    <p>{vi ? 'Mẫu minh họa do Sky Guide tự tạo. Chưa có quan hệ với emote hay tiếng gọi trong game.' : 'An original Sky Guide illustration. It is not mapped to a game emote or call.'}</p>
    {!sample ? <p role="status">{vi ? 'Chưa có mẫu được phép sử dụng.' : 'No permitted sample is available.'}</p> : status !== 'ready' ? <Button disabled={status === 'preparing'} onClick={() => void prepare()}>{status === 'preparing' ? (vi ? 'Đang chuẩn bị mẫu…' : 'Preparing sample…') : status === 'error' ? (vi ? 'Thử chuẩn bị lại' : 'Retry preparation') : (vi ? 'Chuẩn bị bản xem thử' : 'Prepare preview')}</Button> : <>
      <p>{sample.seconds}s · {(size / 1_000).toFixed(1)} kB · {vi ? 'Chọn phát khi bạn sẵn sàng.' : 'Press play when ready.'}</p>
      {sample.kind === 'video' ? <video className="media-player" ref={node => { player.current = node }} src={source ?? undefined} controls muted playsInline preload="none" aria-label={vi ? 'Video vẫy tay tự tạo' : 'Original wave video'} /> : <audio className="media-player" ref={node => { player.current = node }} src={source ?? undefined} controls preload="none" aria-label={vi ? 'Tiếng gọi tự tạo' : 'Original call audio'} />}
    </>}
    {status === 'error' ? <p role="alert">{vi ? 'Chưa chuẩn bị được mẫu hoặc đã dừng khi rời cửa sổ. Poster vẫn được giữ; bạn có thể thử lại. Trình duyệt cần hỗ trợ định dạng của mẫu.' : 'Preparation failed or stopped when leaving the window. The poster remains; you can retry. Your browser must support the sample format.'}</p> : null}
    <p className="section-note">{vi ? 'Poster không chuyển động. Mẫu chỉ được tạo sau thao tác, không tự phát hay tải cả thư viện.' : 'The poster is still. Samples are prepared only after your action, with no autoplay or library-wide loading.'}</p>
  </SectionCard>
}
