/**
 * Stream attribute groups shown in the presenter Signals panel.
 *
 * Same calculations, two identity keys:
 * - domain_userid: cookie identity, populated even before login
 * - customer_id: signed-in customer entity, starts calculating after login
 */
export const SESSION_BEHAVIOR_ATTRIBUTES = [
  'categories_viewed_last_30m',
  'last_merchant_viewed',
  'benefit_views_last_10m',
  'travel_pages_last_10m',
] as const

export const ANONYMOUS_ATTRIBUTE_GROUP = {
  name: 'banco_falabella_domain_userid_attributes',
  version: 1,
  attributeKey: 'domain_userid',
  attributes: SESSION_BEHAVIOR_ATTRIBUTES,
} as const

export const IDENTIFIED_ATTRIBUTE_GROUP = {
  name: 'banco_falabella_customer_id_attributes',
  version: 1,
  attributeKey: 'customer_id',
  attributes: SESSION_BEHAVIOR_ATTRIBUTES,
} as const

export interface SessionBehaviorAttributes {
  categories_viewed_last_30m?: string[]
  last_merchant_viewed?: string
  benefit_views_last_10m?: number
  travel_pages_last_10m?: number
}

export function parseSessionBehavior(raw: Record<string, unknown>): SessionBehaviorAttributes {
  return {
    categories_viewed_last_30m: asStringList(raw.categories_viewed_last_30m),
    last_merchant_viewed: asString(raw.last_merchant_viewed),
    benefit_views_last_10m: asNumber(raw.benefit_views_last_10m),
    travel_pages_last_10m: asNumber(raw.travel_pages_last_10m),
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
