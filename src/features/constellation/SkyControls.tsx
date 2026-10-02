import { useEffect, useRef } from 'react'
import { useTheme } from './useTheme'
import { useLocale } from '../../shared/i18n/useLocale'

const modes = ['auto', 'daylight', 'sunset', 'night'] as const
export function SkyControls() {
  const details = useRef<HTMLDetailsElement>(null)
  const { mode, setMode } = useTheme()
  const { locale, setLocale, t } = useLocale()
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) details.current.open = false
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [])
  return (
    <details ref={details} className="sky-controls" onKeyDown={event => {
      if (event.key === 'Escape' && details.current?.open) {
        details.current.open = false
        details.current.querySelector('summary')?.focus()
      }
    }}>
      <summary>{t('sky.controls')} <span aria-hidden="true">⌄</span></summary>
      <div className="sky-controls__panel">
        <p>{t('sky.settings')}</p>
        <fieldset><legend>{t('sky.mode')}</legend>
          <div className="sky-options">{modes.map(next => (
            <label key={next}>
              <input type="radio" name="sky-theme" value={next} checked={mode === next} onChange={() => setMode(next)} />
              <span>{t(`landing.theme.${next}`)}</span>
            </label>
          ))}</div>
        </fieldset>
        <p className="sky-controls__note">{t('sky.autoNote')}</p>
        <fieldset><legend>{t('sky.language')}</legend>
          <div className="sky-options">{(['vi', 'en'] as const).map(next => (
            <label key={next}>
              <input type="radio" name="sky-language" value={next} checked={locale === next} onChange={() => setLocale(next)} />
              <span>{t(`lang.${next}`)}</span>
            </label>
          ))}</div>
        </fieldset>
      </div>
    </details>
  )
}
