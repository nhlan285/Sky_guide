import { useEffect, useId, useRef } from 'react'
import { useTheme } from './useTheme.tsx'
import { useLocale } from '../../shared/i18n/useLocale'
import { outsideBounds } from './dialog.ts'

const modes = ['auto', 'daylight', 'sunset', 'night'] as const
export function SkyControls() {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const previousOverflow = useRef<string | null>(null)
  const id = useId()
  const { mode, setMode } = useTheme()
  const { locale, setLocale, t, storageIssue, retryLocaleSave, resetLocale } = useLocale()
  useEffect(() => {
    return () => {
      if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current
    }
  }, [])
  function open() {
    if (!dialog.current || dialog.current.open) return
    previousOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current.showModal()
  }
  function closed() {
    if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current
    previousOverflow.current = null
    trigger.current?.focus({ preventScroll: true })
  }
  return (
    <div className="sky-controls">
      <button ref={trigger} type="button" className="sky-controls__trigger" aria-haspopup="dialog" aria-controls={id} onClick={open}>{t('sky.controls')} <span aria-hidden="true">⌄</span></button>
      <dialog ref={dialog} id={id} className="sky-settings" aria-labelledby={`${id}-title`} onClose={closed} onClick={event => {
        if (event.target === event.currentTarget && outsideBounds(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())) event.currentTarget.close()
      }}>
        <div className="sky-settings__heading"><h2 id={`${id}-title`}>{t('sky.settings')}</h2><button type="button" className="button button--quiet" onClick={() => dialog.current?.close()}>{t('sky.close')}</button></div>
        <fieldset><legend>{t('sky.mode')}</legend>
          <div className="sky-options">{modes.map(next => (
            <label key={next}>
              <input type="radio" name={`${id}-theme`} value={next} checked={mode === next} onChange={() => setMode(next)} />
              <span>{t(`landing.theme.${next}`)}</span>
            </label>
          ))}</div>
        </fieldset>
        <p className="sky-controls__note">{t('sky.autoNote')}</p>
        <fieldset><legend>{t('sky.language')}</legend>
          <div className="sky-options">{(['vi', 'en'] as const).map(next => (
            <label key={next}>
              <input type="radio" name={`${id}-language`} value={next} checked={locale === next} onChange={() => setLocale(next)} />
              <span>{t(`lang.${next}`)}</span>
            </label>
          ))}</div>
        </fieldset>
        {storageIssue ? <div>
          <p className="sky-controls__note" role="status">{t(storageIssue === 'future_version' ? 'storage.future' : 'storage.sessionOnly')}</p>
          {storageIssue === 'future_version'
            ? <button type="button" className="button button--quiet" onClick={resetLocale}>{t('storage.resetLocale')}</button>
            : <button type="button" className="button button--quiet" onClick={retryLocaleSave}>{t('storage.retry')}</button>}
          {storageIssue === 'corrupt' || storageIssue === 'migration_failed'
            ? <button type="button" className="button button--quiet" onClick={resetLocale}>{t('storage.resetLocale')}</button> : null}
        </div> : null}
      </dialog>
    </div>
  )
}
