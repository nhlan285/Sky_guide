import { createContext, useContext, useState } from 'react';
import { translations } from './translations';
import type { Locale, TranslationKey } from './translations';

type LocaleContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const stored = localStorage.getItem('sky-guide-locale');
    if (stored === 'vi' || stored === 'en') return stored as Locale;
    return 'vi';
  });

  const setLocale = (l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('sky-guide-locale', l);
  };

  const t = (key: TranslationKey): string => {
    return translations[locale][key] || key;
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextType {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
