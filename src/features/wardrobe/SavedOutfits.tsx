import { useEffect, useId, useRef, useState } from 'react'
import type { OutfitSnapshot, WardrobeSelection } from '../../data/wardrobe/index.ts'
import type { ValidationResult } from '../../data/core/index.ts'
import { Button } from '../../shared/ui/primitives'
import { useLocale } from '../../shared/i18n/useLocale'
import { demoPackage } from './demo/demo'
import { createOutfitStorage, deleteOutfit, renameOutfit, saveOutfit, selectOutfit } from './persistence'
import type { OutfitLibrary } from './persistence'
import { wardrobeCopy } from './copy'
import { OutfitBackup } from './OutfitBackup'

type Copy = typeof wardrobeCopy.vi
function SavedOutfitRow({ outfit, copy, onLoad, onRename, onDelete }: {
  outfit: OutfitSnapshot; copy: Copy; onLoad: () => void; onRename: (name: string) => boolean; onDelete: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [name, setName] = useState(outfit.name ?? '')
  const renameButton = useRef<HTMLButtonElement>(null)
  const deleteButton = useRef<HTMLButtonElement>(null)
  const renameInput = useRef<HTMLInputElement>(null)
  const wasEditing = useRef(false)
  useEffect(() => {
    if (editing) renameInput.current?.focus()
    else if (wasEditing.current) renameButton.current?.focus()
    wasEditing.current = editing
  }, [editing])
  const id = useId()
  return <li>
    <strong className="wardrobe-saved__name">{outfit.name}</strong>
    {editing ? <form onSubmit={event => { event.preventDefault(); if (onRename(name)) setEditing(false) }}>
      <label className="input-field" htmlFor={id}>{copy.outfitName}<input ref={renameInput} id={id} className="text-input" value={name} maxLength={80} required onChange={event => setName(event.target.value)} /></label>
      <div className="wardrobe-saved__actions"><Button disabled={!name.trim()} type="submit">{copy.confirmRename}</Button><Button className="button--quiet" onClick={() => setEditing(false)}>{copy.cancel}</Button></div>
    </form> : <div className="wardrobe-saved__actions">
      <Button onClick={onLoad} aria-label={`${copy.loadOutfit}: ${outfit.name}`}>{copy.loadOutfit}</Button>
      <button ref={renameButton} type="button" className="button button--quiet" onClick={() => { setName(outfit.name ?? ''); setEditing(true); setDeleting(false) }}>{copy.renameOutfit}</button>
      <button ref={deleteButton} type="button" className="button button--quiet" onClick={() => setDeleting(true)} aria-label={`${copy.deleteOutfit}: ${outfit.name}`}>{copy.deleteOutfit}</button>
    </div>}
    {deleting ? <div><p className="wardrobe-small">{copy.confirmDelete}</p><div className="wardrobe-saved__actions"><Button onClick={onDelete}>{copy.deleteOutfit}</Button><Button className="button--quiet" onClick={() => { setDeleting(false); deleteButton.current?.focus() }}>{copy.cancel}</Button></div></div> : null}
  </li>
}

export function SavedOutfits({ storage, selection, onLoad }: {
  storage: ReturnType<typeof createOutfitStorage>; selection: WardrobeSelection; onLoad: (outfit: OutfitSnapshot) => void
}) {
  const { locale } = useLocale()
  const copy = wardrobeCopy[locale]
  const [saved, setSaved] = useState(() => storage.read())
  const [name, setName] = useState('')
  const [message, setMessage] = useState<keyof typeof copy.libraryMessages | null>(null)
  const nameInput = useRef<HTMLInputElement>(null)
  const id = useId()
  const apply = (mutation: (library: OutfitLibrary) => ValidationResult<OutfitLibrary>, success: typeof message) => {
    const result = mutation(storage.read().value)
    if (!result.valid) { setMessage('error'); return null }
    const next = storage.write(result.value)
    setSaved(next); setMessage(success)
    return next.value
  }
  return <section className="wardrobe-saved" aria-labelledby={`${id}-title`}>
    <h3 id={`${id}-title`}>{copy.savedOutfits} · {saved.value.outfits.length}/50</h3>
    <form onSubmit={event => {
      event.preventDefault()
      const next = apply(library => saveOutfit(library, demoPackage, selection, `outfit-${crypto.randomUUID()}`, name, new Date().toISOString()), 'saved')
      if (next) { setName(''); nameInput.current?.focus() }
    }}>
      <label className="input-field" htmlFor={`${id}-name`}>{copy.outfitName}<input ref={nameInput} id={`${id}-name`} className="text-input" value={name} maxLength={80} required onChange={event => setName(event.target.value)} /></label>
      <Button type="submit" disabled={!name.trim() || saved.value.outfits.length >= 50}>{copy.saveNewOutfit}</Button>
    </form>
    <p className="wardrobe-small" role="status">{saved.issue ? saved.issue === 'future_version' ? copy.libraryFuture : copy.librarySession : message ? copy.libraryMessages[message] : copy.libraryNote}</p>
    {saved.issue !== null && saved.issue !== 'future_version' ? <Button className="button--quiet" onClick={() => setSaved(storage.retry())}>{copy.retrySave}</Button> : null}
    {!saved.value.outfits.length ? <p className="wardrobe-small">{copy.noSavedOutfits}</p> : <ul className="wardrobe-saved__list">
      {saved.value.outfits.map(outfit => <SavedOutfitRow key={outfit.id} outfit={outfit} copy={copy}
        onLoad={() => {
          const next = apply(library => selectOutfit(library, demoPackage, outfit.id!), 'loaded')
          const chosen = next?.outfits.find(value => value.id === outfit.id)
          if (chosen) onLoad(chosen)
        }}
        onRename={nextName => Boolean(apply(library => renameOutfit(library, demoPackage, outfit.id!, nextName), 'renamed'))}
        onDelete={() => { if (apply(library => deleteOutfit(library, demoPackage, outfit.id!), 'deleted')) nameInput.current?.focus() }} />)}
    </ul>}
    <OutfitBackup library={saved.value} onReplace={library => { setSaved(storage.write(library)); setMessage('imported') }}
      onReset={() => { setSaved(storage.reset()); setMessage('reset') }} />
  </section>
}
