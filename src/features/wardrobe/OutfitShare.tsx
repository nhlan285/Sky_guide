import { useEffect, useId, useRef, useState } from 'react'
import type { OutfitSnapshot, WardrobeSelection } from '../../data/wardrobe/index.ts'
import { Button } from '../../shared/ui/primitives'
import { useLocale } from '../../shared/i18n/useLocale'
import { wardrobeCopy } from './copy'
import { demoPackage } from './demo/demo'
import { decodeOutfitShare, encodeOutfitShare, outfitShareUrl } from './share'
import type { ShareIssue, ShareResult } from './share'

export function OutfitShare({ selection, onLoad }: { selection: WardrobeSelection; onLoad: (outfit: OutfitSnapshot) => void }) {
  const { locale } = useLocale()
  const copy = wardrobeCopy[locale].share
  const id = useId()
  const [incoming, setIncoming] = useState<ShareResult<OutfitSnapshot> | 'loading' | null>(null)
  const [generated, setGenerated] = useState<{ selection: WardrobeSelection; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState<ShareIssue | null>(null)
  const [message, setMessage] = useState<'copied' | 'manual' | 'applied' | null>(null)
  const createButton = useRef<HTMLButtonElement>(null)
  const wasBusy = useRef(false)
  useEffect(() => {
    if (!busy && wasBusy.current) createButton.current?.focus()
    wasBusy.current = busy
  }, [busy])
  const link = generated?.selection === selection ? generated.url : ''
  useEffect(() => {
    let generation = 0
    const read = () => {
      const ticket = ++generation
      const hash = window.location.hash
      if (!hash.startsWith('#outfit=')) { setIncoming(null); return }
      setIncoming('loading')
      void decodeOutfitShare(hash, demoPackage).then(result => { if (ticket === generation) setIncoming(result) })
    }
    read()
    window.addEventListener('hashchange', read)
    return () => { generation++; window.removeEventListener('hashchange', read) }
  }, [])
  return <section className="wardrobe-share" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>{copy.title}</h2>
    <p className="wardrobe-small">{copy.note}</p>
    {incoming === 'loading' ? <p role="status">{copy.loading}</p> : incoming ? <div>
      <p role="status">{incoming.ok ? copy.ready : copy.errors[incoming.issue]}</p>
      <div className="wardrobe-saved__actions">
        {incoming.ok ? <Button onClick={() => { onLoad(incoming.value); setIncoming(null); setMessage('applied'); createButton.current?.focus() }}>{copy.apply}</Button> : null}
        <Button className="button--quiet" onClick={() => { setIncoming(null); createButton.current?.focus() }}>{copy.dismiss}</Button>
      </div>
    </div> : null}
    <button ref={createButton} type="button" className="button" disabled={busy} onClick={async () => {
      setBusy(true); setIssue(null); setMessage(null); setGenerated(null)
      const result = await encodeOutfitShare(selection, demoPackage)
      if (result.ok) {
        const url = outfitShareUrl(window.location.origin, result.value)
        if (url) setGenerated({ selection, url })
        else setIssue('too_large')
      } else setIssue(result.issue)
      setBusy(false)
    }}>{busy ? copy.loading : copy.create}</button>
    {link ? <div className="wardrobe-share__link">
      <label className="input-field" htmlFor={`${id}-link`}>{copy.link}<input id={`${id}-link`} className="text-input" value={link} readOnly onFocus={event => event.currentTarget.select()} /></label>
      <Button onClick={async () => {
        try { await navigator.clipboard.writeText(link); setMessage('copied') }
        catch { setMessage('manual') }
      }}>{copy.copy}</Button>
      <a className="button button--quiet" href={link} target="_blank" rel="noopener noreferrer">{copy.open}</a>
    </div> : null}
    <p className="wardrobe-small" role="status">{issue ? copy.errors[issue] : message ? copy.messages[message] : ''}</p>
  </section>
}
