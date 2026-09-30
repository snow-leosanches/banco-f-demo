'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import {
  getConsentPreferences,
  hasGivenConsent,
  setConsentPreferences,
  type ConsentPreferences,
} from '../lib/consent'
import {
  trackConsentAllowEvent,
  trackConsentDenyEvent,
  trackConsentSelectedEvent,
  trackCmpVisibleEvent,
  enableAnonymousMode,
  disableAnonymousMode,
} from '../lib/snowplow-config'
import { useLanguage } from '../contexts/language-context'

const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
}

const COPY = {
  es: {
    barText: 'Usamos cookies para mejorar tu experiencia. Consulta más ',
    here: 'aquí',
    understood: 'Entendido',
    title: 'Preferencias de privacidad',
    close: 'Cerrar',
    modalText: 'Usamos cookies para mejorar tu experiencia. Consulta más en ',
    rejectAll: 'Rechazar todo',
    savePreferences: 'Guardar preferencias',
    acceptAll: 'Aceptar todo',
    categories: [
      { key: 'necessary' as const, label: 'Necesarias', description: 'Requeridas para que la banca en línea funcione. Siempre activas.' },
      { key: 'analytics' as const, label: 'Analíticas', description: 'Nos ayudan a entender cómo usas la app para mejorar tu experiencia.' },
      { key: 'marketing' as const, label: 'Marketing', description: 'Personalizan los beneficios y campañas que te mostramos.' },
      { key: 'preferences' as const, label: 'Preferencias', description: 'Recuerdan tus ajustes entre sesiones.' },
    ],
  },
  en: {
    barText: 'We use cookies to improve your experience. Read more ',
    here: 'here',
    understood: 'Got it',
    title: 'Privacy preferences',
    close: 'Close',
    modalText: 'We use cookies to improve your experience. Read more ',
    rejectAll: 'Reject all',
    savePreferences: 'Save preferences',
    acceptAll: 'Accept all',
    categories: [
      { key: 'necessary' as const, label: 'Necessary', description: 'Required for online banking to work. Always on.' },
      { key: 'analytics' as const, label: 'Analytics', description: 'Help us understand how you use the app to improve your experience.' },
      { key: 'marketing' as const, label: 'Marketing', description: 'Personalize the benefits and campaigns we show you.' },
      { key: 'preferences' as const, label: 'Preferences', description: 'Remember your settings between sessions.' },
    ],
  },
} as const

export function ConsentManager() {
  const { language } = useLanguage()
  const t = COPY[language]
  const [barOpen, setBarOpen] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [preferences, setPreferences] = useState<ConsentPreferences>(DEFAULT_PREFERENCES)

  useEffect(() => {
    if (!hasGivenConsent()) {
      setBarOpen(true)
      trackCmpVisibleEvent()
    }

    function handleShow() {
      const saved = getConsentPreferences()
      setPreferences(saved ?? DEFAULT_PREFERENCES)
      setIsOpen(true)
      setBarOpen(false)
      trackCmpVisibleEvent()
    }
    window.addEventListener('showConsentManager', handleShow)
    return () => window.removeEventListener('showConsentManager', handleShow)
  }, [])

  const close = () => {
    setIsOpen(false)
    setBarOpen(false)
  }

  const acceptAll = () => {
    const next: ConsentPreferences = { necessary: true, analytics: true, marketing: true, preferences: true }
    setConsentPreferences(next)
    disableAnonymousMode()
    trackConsentAllowEvent(['necessary', 'analytics', 'marketing', 'preferences'])
    close()
  }

  const rejectAll = () => {
    const next: ConsentPreferences = { necessary: true, analytics: false, marketing: false, preferences: false }
    setConsentPreferences(next)
    enableAnonymousMode()
    trackConsentDenyEvent(['necessary'])
    close()
  }

  const savePreferences = () => {
    setConsentPreferences(preferences)
    if (preferences.analytics) {
      disableAnonymousMode()
    } else {
      enableAnonymousMode()
    }
    const scopes = (Object.keys(preferences) as (keyof ConsentPreferences)[]).filter((k) => preferences[k])
    trackConsentSelectedEvent(scopes)
    close()
  }

  const toggle = (key: keyof ConsentPreferences) => {
    if (key === 'necessary') return
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const categories = t.categories

  return (
    <>
      {barOpen && !isOpen && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[min(613px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-[16px] bg-white px-4 py-3 shadow-md">
          <p className="text-small text-text">
            {t.barText}
            <button
              type="button"
              className="font-medium text-secondary"
              onClick={() => {
                setIsOpen(true)
                setBarOpen(false)
              }}
            >
              {t.here}
            </button>
            .
          </p>
          <button
            type="button"
            onClick={acceptAll}
            className="h-14 shrink-0 rounded-full bg-secondary px-8 text-body text-white hover:bg-highlight"
          >
            {t.understood}
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[24px] bg-surface p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h2 className="font-heading text-h3 text-text">{t.title}</h2>
              <button onClick={close} aria-label={t.close} className="text-text-secondary hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-small text-text-secondary">
              {t.modalText}
              <a href="https://snowplow.io/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-secondary">
                {t.here}
              </a>
              .
            </p>

            <div className="mt-4 space-y-3">
              {categories.map((c) => (
                <label key={c.key} className="flex items-start justify-between gap-4 rounded-md bg-sectionGray px-4 py-3">
                  <span>
                    <span className="block text-body font-medium text-text">{c.label}</span>
                    <span className="block text-small text-text-secondary">{c.description}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences[c.key]}
                    disabled={c.key === 'necessary'}
                    onChange={() => toggle(c.key)}
                    className="mt-1 h-4 w-4 accent-secondary disabled:opacity-50"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                onClick={rejectAll}
                className="h-12 rounded-full border border-border px-5 text-small font-medium text-text hover:bg-sectionGray"
              >
                {t.rejectAll}
              </button>
              <button
                onClick={savePreferences}
                className="h-12 rounded-full border-[1.5px] border-hazteBg bg-hazteBg px-5 text-small font-medium text-primary"
              >
                {t.savePreferences}
              </button>
              <button
                onClick={acceptAll}
                className="h-12 rounded-full bg-secondary px-5 text-small font-medium text-white hover:bg-highlight"
              >
                {t.acceptAll}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
