import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Language = 'es' | 'en'

const LANGUAGE_KEY = 'bancof-demo-lang'

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('es')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANGUAGE_KEY)
      if (saved === 'es' || saved === 'en') setLanguageState(saved)
    } catch {
      // ignore unreadable localStorage
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = language
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language)
    } catch {
      // ignore unwritable localStorage
    }
  }, [language])

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage: setLanguageState,
        toggleLanguage: () => setLanguageState((prev) => (prev === 'es' ? 'en' : 'es')),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within a LanguageProvider')
  return ctx
}
