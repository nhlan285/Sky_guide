import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { translations } from './translations'
import type { Locale, TranslationKey } from './translations'
import { createLocaleStorage, localeStorageKey } from './localeStorage.ts'
import type { StorageIssue } from '../storage/versionedStorage.ts'

interface LocaleValue {
  locale: Locale; setLocale: (locale: Locale) => void; t: (key: TranslationKey) => string
  storageIssue: StorageIssue | null; retryLocaleSave: () => void; resetLocale: () => void
}
const LocaleContext = createContext<LocaleValue | null>(null)
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [storage] = useState(() => createLocaleStorage(() => window.localStorage))
  const [saved, setSaved] = useState(() => storage.read())
  const locale = saved.value
  const t = useCallback((key: TranslationKey) => translations[locale][key], [locale])
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === localeStorageKey || event.key === null) setSaved(storage.read())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [storage])
  function setLocale(next: Locale) {
    setSaved(storage.write(next))
  }
  return <LocaleContext.Provider value={{ locale, setLocale, t, storageIssue: saved.issue,
    retryLocaleSave: () => setSaved(storage.retry()), resetLocale: () => setSaved(storage.reset()),
  }}>{children}</LocaleContext.Provider>
}
export function useLocale() {
  const value = useContext(LocaleContext)
  if (!value) throw new Error('useLocale requires LocaleProvider.')
  return value
}
