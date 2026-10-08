import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLocale } from '../../shared/i18n/useLocale'
import { Button, SectionCard, StatusBadge } from '../../shared/ui/primitives'
import { noteForKey, originalNotes } from './notes'
import { createOriginalInstrument } from './originalInstrument'
import { musicInstrumentForItem, musicInstruments } from './catalogPilot'

export function MusicPlayground() {
  const vi = useLocale().locale === 'vi'
  const [params, setParams] = useSearchParams()
  const requestedItem = params.get('instrument')
  const selectedInstrument = musicInstrumentForItem(requestedItem)
  const instrument = useRef<ReturnType<typeof createOriginalInstrument> | null>(null)
  const [active, setActive] = useState<string[]>([]), [volume, setVolume] = useState(45), [muted, setMuted] = useState(false)
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle'), [lastNote, setLastNote] = useState('')
  const mounted = useRef(false)
  useEffect(() => { instrument.current?.stop() }, [selectedInstrument?.itemId])
  useEffect(() => {
    mounted.current = true
    const pause = () => instrument.current?.suspend()
    const visibility = () => { if (document.hidden) pause() }
    window.addEventListener('blur', pause); document.addEventListener('visibilitychange', visibility)
    return () => { mounted.current = false; window.removeEventListener('blur', pause); document.removeEventListener('visibilitychange', visibility); instrument.current?.dispose(); instrument.current = null }
  }, [])
  function getInstrument() {
    if (!instrument.current) {
      instrument.current = createOriginalInstrument(() => new AudioContext(), ids => { if (mounted.current) setActive(ids) })
      instrument.current.setVolume(volume / 100); instrument.current.setMuted(muted)
    }
    return instrument.current
  }
  async function activate() {
    try { await getInstrument().activate(); if (mounted.current) setStatus('ready') } catch { if (mounted.current) setStatus('error') }
  }
  async function play(id: string) {
    try {
      const played = await getInstrument().play(id)
      if (mounted.current && played) { setStatus('ready'); setLastNote(originalNotes.find(note => note.id === id)!.label) }
    } catch { if (mounted.current) setStatus('error') }
  }
  return <div className="information-page music-page">
    <Link className="text-link" to="/hub">← {vi ? 'Về Khám phá' : 'Back to Explore'}</Link>
    <div className="page-intro"><h1 id="page-title" tabIndex={-1}>{vi ? 'Chơi nhạc' : 'Music playground'}</h1>
      <StatusBadge>{vi ? 'Âm thanh tự tạo' : 'Original tones'}</StatusBadge>
      <p>{vi ? 'Một khoảng nhỏ để thử giai điệu. Chạm nốt hoặc dùng bàn phím khi vùng nốt được chọn.' : 'A small space to try a melody. Tap a note or use the keyboard while the note grid has focus.'}</p>
    </div>
    <SectionCard id="music-instrument" title={vi ? '15 nốt · âm tự tạo' : '15 notes · original tones'}>
      <p className="section-note">{vi ? 'Âm tổng hợp tự tạo, không phải mẫu nhạc cụ Sky. Không tự phát, thu âm hay truy cập micro.' : 'Original synthesized tones, not Sky instrument samples. No autoplay, recording or microphone access.'}</p>
      <div className="input-field music-selector"><label htmlFor="music-selector">{vi ? 'Nhạc cụ' : 'Instrument'}</label><select id="music-selector" value={selectedInstrument?.itemId ?? ''} onChange={event => {
        instrument.current?.stop(); const next = new URLSearchParams(); if (event.target.value) next.set('instrument', event.target.value); setParams(next)
      }}><option value="">{vi ? 'Âm tự tạo' : 'Original tones'}</option>{musicInstruments.map(value => <option key={value.itemId} value={value.itemId}>{value.name} · {vi ? 'âm tự tạo' : 'original tones'}</option>)}</select></div>
      {selectedInstrument ? <p>{selectedInstrument.name} · <Link className="text-link" to={`/items/${selectedInstrument.itemId}`}>{vi ? 'Xem item có nguồn' : 'View sourced item'}</Link>. {vi ? 'Bản thử dùng chung bộ âm tự tạo; chưa mô phỏng âm trong game.' : 'This pilot shares our original tone set; game timbre is not reproduced.'}</p> : requestedItem ? <p role="status">{vi ? 'Item trong liên kết chưa được hỗ trợ. Bạn vẫn có thể chơi bộ âm tự tạo hoặc chọn mẫu đã hỗ trợ.' : 'The linked item is unsupported. You can still play original tones or choose a supported pilot.'}</p> : null}
      <div className="music-controls"><Button onClick={() => void activate()}>{status === 'error' ? (vi ? 'Thử bật lại âm thanh' : 'Retry audio') : (vi ? 'Bật âm thanh' : 'Enable audio')}</Button>
        <Button aria-pressed={muted} className="button--quiet" onClick={() => { const next = !muted; setMuted(next); instrument.current?.setMuted(next) }}>{muted ? (vi ? 'Bỏ tắt tiếng' : 'Unmute') : (vi ? 'Tắt tiếng' : 'Mute')}</Button>
        <Button className="button--quiet" onClick={() => instrument.current?.stop()}>{vi ? 'Dừng các nốt' : 'Stop notes'}</Button>
        <div className="input-field"><label htmlFor="music-volume">{vi ? 'Âm lượng' : 'Volume'} · {volume}%</label><input id="music-volume" type="range" min="0" max="100" value={volume} onChange={event => { const next = Number(event.target.value); setVolume(next); instrument.current?.setVolume(next / 100) }} /></div>
      </div>
      <fieldset className="music-grid" tabIndex={0} aria-describedby="music-key-help" onKeyDown={event => {
        if (event.repeat || event.ctrlKey || event.altKey || event.metaKey) return
        const note = noteForKey(event.key); if (!note) return
        event.preventDefault(); void play(note.id)
      }}><legend>{vi ? 'Chọn nốt để chơi' : 'Choose a note to play'}</legend>
        {originalNotes.map(note => <button type="button" key={note.id} aria-label={`${note.label} · ${note.key.toUpperCase()}`} className={`music-note${active.includes(note.id) ? ' is-playing' : ''}`} onClick={() => void play(note.id)}><span>{note.label}</span><kbd>{note.key.toUpperCase()}</kbd></button>)}
      </fieldset>
      <p id="music-key-help" className="section-note">Q W E R T · A S D F G · Z X C V B. {vi ? 'Tab để chọn vùng nốt; Enter hoặc Space cũng chơi nốt đang chọn. Âm dừng khi rời trang hoặc chuyển cửa sổ.' : 'Tab into the grid; Enter or Space also plays the focused note. Audio stops when leaving the page or switching windows.'}</p>
      <p role="status" aria-live="polite">{status === 'error' ? (vi ? 'Chưa bật được âm thanh. Kiểm tra quyền âm thanh của trình duyệt rồi thử lại.' : 'Audio could not start. Check browser sound settings and retry.') : muted ? (vi ? 'Đang tắt tiếng' : 'Muted') : status === 'ready' ? `${vi ? 'Âm thanh sẵn sàng' : 'Audio ready'}${lastNote ? ` · ${lastNote}` : ''}` : (vi ? 'Âm thanh chỉ bắt đầu sau thao tác của bạn.' : 'Audio starts only after your action.')}</p>
    </SectionCard>
  </div>
}
