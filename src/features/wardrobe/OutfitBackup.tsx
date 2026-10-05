import { useEffect, useId, useRef, useState } from 'react'
import { Button } from '../../shared/ui/primitives'
import { useLocale } from '../../shared/i18n/useLocale'
import { wardrobeCopy } from './copy'
import { demoPackage } from './demo/demo'
import { encodeOutfitBackup, MAX_BACKUP_BYTES, parseOutfitBackup } from './backup'
import type { OutfitLibrary } from './persistence'

export function OutfitBackup({ library, onReplace, onReset }: {
  library: OutfitLibrary; onReplace: (library: OutfitLibrary) => void; onReset: () => void
}) {
  const copy = wardrobeCopy[useLocale().locale].backup
  const id = useId()
  const [download, setDownload] = useState<{ url: string; library: OutfitLibrary } | null>(null)
  const [incoming, setIncoming] = useState<OutfitLibrary | null>(null)
  const [busy, setBusy] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [error, setError] = useState<'invalid' | 'tooLarge' | 'unavailable' | null>(null)
  const ticket = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const resetButton = useRef<HTMLButtonElement>(null)
  useEffect(() => () => { ticket.current++ }, [])
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url) }, [download])
  return <section className="wardrobe-saved wardrobe-backup" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{copy.title}</h3>
    <p className="wardrobe-small">{copy.note}</p>
    <Button disabled={busy} onClick={() => {
      setError(null); setDownload(null)
      const encoded = encodeOutfitBackup(library, demoPackage)
      if (!encoded.valid) { setError('invalid'); return }
      try { setDownload({ url: URL.createObjectURL(new Blob([encoded.value], { type: 'application/json' })), library }) }
      catch { setError('unavailable') }
    }}>{copy.export}</Button>
    {download && download.library === library && <p><a href={download.url} download="sky-guide-demo-outfits.json">{copy.download}</a></p>}
    <label className="input-field" htmlFor={`${id}-file`}>{copy.import}
      <input ref={fileInput} id={`${id}-file`} type="file" accept=".json,application/json" disabled={busy} onChange={async event => {
        const file = event.currentTarget.files?.[0], current = ++ticket.current
        event.currentTarget.value = ''; setIncoming(null); setError(null); setClearing(false)
        if (!file) return
        if (file.size > MAX_BACKUP_BYTES) { setError('tooLarge'); return }
        setBusy(true)
        try {
          const parsed = parseOutfitBackup(await file.text(), demoPackage)
          if (current !== ticket.current) return
          if (parsed.valid) setIncoming(parsed.value)
          else setError('invalid')
        } catch { if (current === ticket.current) setError('unavailable') }
        finally { if (current === ticket.current) { setBusy(false); fileInput.current?.focus() } }
      }} />
    </label>
    {busy && <p role="status">{copy.loading}</p>}
    {error && <p role="alert">{copy.errors[error]}</p>}
    {incoming && <div>
      <p role="status">{copy.preview} {incoming.outfits.length}/50. {copy.replaceNote}</p>
      <div className="wardrobe-saved__actions">
        <Button onClick={() => { onReplace(incoming); setIncoming(null); fileInput.current?.focus() }}>{copy.apply}</Button>
        <Button className="button--quiet" onClick={() => { setIncoming(null); fileInput.current?.focus() }}>{copy.cancel}</Button>
      </div>
    </div>}
    <button ref={resetButton} className="button button--quiet" type="button" disabled={busy} onClick={() => { setClearing(true); setIncoming(null) }}>{copy.reset}</button>
    {clearing && <div>
      <p>{copy.confirmReset}</p>
      <div className="wardrobe-saved__actions">
        <Button onClick={() => { onReset(); setClearing(false); resetButton.current?.focus() }}>{copy.confirm}</Button>
        <Button className="button--quiet" onClick={() => { setClearing(false); resetButton.current?.focus() }}>{copy.cancel}</Button>
      </div>
    </div>}
  </section>
}
