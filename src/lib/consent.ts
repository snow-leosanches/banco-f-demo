export interface ConsentPreferences {
  necessary: boolean
  analytics: boolean
  marketing: boolean
  preferences: boolean
}

const CONSENT_GIVEN_KEY = 'consent-given'
const CONSENT_PREFERENCES_KEY = 'consent-preferences'
const CONSENT_DATE_KEY = 'consent-date'
const SIGNALS_ENABLED_KEY = 'signals-enabled'

export function hasGivenConsent(): boolean {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(CONSENT_GIVEN_KEY) === 'true'
}

export function getConsentPreferences(): ConsentPreferences | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(CONSENT_PREFERENCES_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as ConsentPreferences
  } catch {
    return null
  }
}

export function setConsentPreferences(preferences: ConsentPreferences): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CONSENT_GIVEN_KEY, 'true')
  window.localStorage.setItem(CONSENT_PREFERENCES_KEY, JSON.stringify(preferences))
  window.localStorage.setItem(CONSENT_DATE_KEY, new Date().toISOString())
}

// ─── Signals toggle ───────────────────────────────────────────────────────────

export function isSignalsEnabled(): boolean {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(SIGNALS_ENABLED_KEY)
  if (raw === null) return true
  return raw === 'true'
}

export function setSignalsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIGNALS_ENABLED_KEY, String(enabled))
  window.dispatchEvent(new CustomEvent('signalsPreferenceChanged', { detail: { enabled } }))
}
