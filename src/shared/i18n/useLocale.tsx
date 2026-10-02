import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { translations } from './translations'
import type { Locale, TranslationKey } from './translations'

interface LocaleValue { locale: Locale; setLocale: (locale: Locale) => void; t: (key: TranslationKey) => string }
const LocaleContext = createContext<LocaleValue | null>(null)
function readLocale(): Locale {
  try { return localStorage.getItem('sky-guide-locale') === 'en' ? 'en' : 'vi' } catch { return 'vi' }
}
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState(readLocale)
  const t = useCallback((key: TranslationKey) => translations[locale][key], [locale])
  useEffect(() => {
    document.documentElement.lang = locale
    const sync = (event: StorageEvent) => {
      if (event.key === 'sky-guide-locale') setLocaleState(readLocale())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [locale])
  function setLocale(next: Locale) {
    setLocaleState(next)
    try { localStorage.setItem('sky-guide-locale', next) } catch { /* Keep the session usable. */ }
  }
  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
}
export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale requires LocaleProvider.')
  return value
}
