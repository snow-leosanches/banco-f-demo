const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const MANUAL_LOGIN_IDS_KEY = 'bancof-manual-login-user-ids'

/** Stable demo identities. Signals' real-time API rejects non-GUID attribute keys. */
export const CAMILA_USER_ID = 'a1a1a1a1-1111-4111-8111-111111111111'
export const DIEGO_USER_ID = 'b2b2b2b2-2222-4222-8222-222222222222'
export const VALENTINA_USER_ID = 'c3c3c3c3-3333-4333-8333-333333333333'
export const GUEST_USER_ID = '00000000-0000-4000-8000-000000000000'

const LEGACY_TO_GUID: Record<string, string> = {
  'cust-84213': CAMILA_USER_ID,
  'cust-10001': DIEGO_USER_ID,
  'cust-90001': VALENTINA_USER_ID,
  guest: GUEST_USER_ID,
}

export function isGuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && GUID_RE.test(value)
}

/** Returns a GUID, mapping leftover slug IDs from earlier demo sessions. */
export function toGuid(value: string | null | undefined): string | null {
  if (!value) return null
  if (isGuid(value)) return value
  return LEGACY_TO_GUID[value] ?? null
}

/**
 * Stable per-email UUID for manual logins, persisted so re-entering the same
 * email reuses the same identity.
 */
export function getManualLoginUserId(email: string): string {
  const key = email.trim().toLowerCase()
  let map: Record<string, string> = {}
  try {
    map = JSON.parse(window.localStorage.getItem(MANUAL_LOGIN_IDS_KEY) ?? '{}')
  } catch {
    map = {}
  }
  if (!isGuid(map[key])) {
    map[key] = crypto.randomUUID()
    window.localStorage.setItem(MANUAL_LOGIN_IDS_KEY, JSON.stringify(map))
  }
  return map[key]
}
