/**
 * Stream attribute groups shown in the presenter Signals panel.
 *
 * domain_userid: this-visit intent (short windows, cookie identity)
 * customer_id: this-customer memory (7-day rolling window, after login)
 */
export const PAGE_PING_HEARTBEAT_SECONDS = 10

export const SESSION_BEHAVIOR_ATTRIBUTES = [
  'categories_viewed_last_30m',
  'last_merchant_viewed',
  'benefit_views_last_10m',
  'travel_pages_last_10m',
] as const

export const CUSTOMER_MEMORY_ATTRIBUTES = [
  'benefits_visited_last_7d',
  'merchants_visited_last_7d',
  'page_pings_last_7d',
  'sessions_last_7d',
] as const

export const ANONYMOUS_ATTRIBUTE_GROUP = {
  name: 'banco_falabella_domain_userid_attributes',
  version: 1,
  attributeKey: 'domain_userid',
  attributes: SESSION_BEHAVIOR_ATTRIBUTES,
} as const

export const IDENTIFIED_ATTRIBUTE_GROUP = {
  name: 'banco_falabella_customer_id_attributes',
  version: 2,
  attributeKey: 'customer_id',
  attributes: CUSTOMER_MEMORY_ATTRIBUTES,
} as const

export interface SessionBehaviorAttributes {
  categories_viewed_last_30m?: string[]
  last_merchant_viewed?: string
  benefit_views_last_10m?: number
  travel_pages_last_10m?: number
}

export interface CustomerMemoryAttributes {
  benefits_visited_last_7d?: string[]
  merchants_visited_last_7d?: string[]
  page_pings_last_7d?: number
  sessions_last_7d?: number
}

export function parseSessionBehavior(raw: Record<string, unknown>): SessionBehaviorAttributes {
  return {
    categories_viewed_last_30m: asStringList(raw.categories_viewed_last_30m),
    last_merchant_viewed: asString(raw.last_merchant_viewed),
    benefit_views_last_10m: asNumber(raw.benefit_views_last_10m),
    travel_pages_last_10m: asNumber(raw.travel_pages_last_10m),
  }
}

export function parseCustomerMemory(raw: Record<string, unknown>): CustomerMemoryAttributes {
  return {
    benefits_visited_last_7d: asStringList(raw.benefits_visited_last_7d),
    merchants_visited_last_7d: asStringList(raw.merchants_visited_last_7d),
    page_pings_last_7d: asNumber(raw.page_pings_last_7d),
    sessions_last_7d: asNumber(raw.sessions_last_7d),
  }
}

export function hasSessionBehavior(attrs: SessionBehaviorAttributes | null): boolean {
  if (!attrs) return false
  return (
    (attrs.categories_viewed_last_30m?.length ?? 0) > 0 ||
    !!attrs.last_merchant_viewed ||
    typeof attrs.benefit_views_last_10m === 'number' ||
    typeof attrs.travel_pages_last_10m === 'number'
  )
}

export function hasCustomerMemory(attrs: CustomerMemoryAttributes | null): boolean {
  if (!attrs) return false
  return (
    (attrs.benefits_visited_last_7d?.length ?? 0) > 0 ||
    (attrs.merchants_visited_last_7d?.length ?? 0) > 0 ||
    typeof attrs.page_pings_last_7d === 'number' ||
    typeof attrs.sessions_last_7d === 'number'
  )
}

export function estimatedAvgSessionSeconds(
  pings: number | undefined,
  sessions: number | undefined,
): number | undefined {
  if (typeof pings !== 'number' || typeof sessions !== 'number' || sessions <= 0) return undefined
  return Math.round((pings * PAGE_PING_HEARTBEAT_SECONDS) / sessions)
}

export function formatEngagedDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return undefined
}

function asStringList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const items = value.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
    return items.length > 0 ? items : undefined
  }
  if (typeof value === 'string' && value.trim()) {
    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
    return items.length > 0 ? items : undefined
  }
  return undefined
}
