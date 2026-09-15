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

const DEFAULT_PREFERENCES: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
  preferences: false,
}

export function ConsentManager() {
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

  const categories: { key: keyof ConsentPreferences; label: string; description: string }[] = [
    { key: 'necessary', label: 'Necesarias', description: 'Requeridas para que la banca en línea funcione. Siempre activas.' },
    { key: 'analytics', label: 'Analíticas', description: 'Nos ayudan a entender cómo usas la app para mejorar tu experiencia.' },
    { key: 'marketing', label: 'Marketing', description: 'Personalizan los beneficios y campañas que te mostramos.' },
    { key: 'preferences', label: 'Preferencias', description: 'Recuerdan tus ajustes entre sesiones.' },
  ]

  return (
    <>
      {barOpen && !isOpen && (
        <div className="fixed bottom-6 left-1/2 z-50 flex w-[min(613px,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-[16px] bg-white px-4 py-3 shadow-md">
          <p className="text-small text-text">
            Usamos cookies para mejorar tu experiencia. Consulta más{' '}
            <button
              type="button"
              className="font-medium text-secondary"
              onClick={() => {
                setIsOpen(true)
                setBarOpen(false)
              }}
            >
              aquí
            </button>
            .
          </p>
          <button
            type="button"
            onClick={acceptAll}
            className="h-14 shrink-0 rounded-full bg-secondary px-8 text-body text-white hover:bg-highlight"
          >
            Entendido
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-lg rounded-[24px] bg-surface p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <h2 className="font-heading text-h3 text-text">Preferencias de privacidad</h2>
              <button onClick={close} aria-label="Cerrar" className="text-text-secondary hover:text-text">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-small text-text-secondary">
              Usamos cookies para mejorar tu experiencia. Consulta más en{' '}
              <a href="https://snowplow.io/privacy-policy/" target="_blank" rel="noopener noreferrer" className="text-secondary">
                aquí
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
                Rechazar todo
              </button>
              <button
                onClick={savePreferences}
                className="h-12 rounded-full border-[1.5px] border-hazteBg bg-hazteBg px-5 text-small font-medium text-primary"
              >
                Guardar preferencias
              </button>
              <button
                onClick={acceptAll}
                className="h-12 rounded-full bg-secondary px-5 text-small font-medium text-white hover:bg-highlight"
              >
                Aceptar todo
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
