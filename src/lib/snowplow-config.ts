/**
 * Snowplow tracker configuration + tracking functions for the Banco F demo.
 *
 * Custom event/entity schemas are published for real under vendor
 * `com.bancofalabella` in Console org b12539df (Snowplow Sales AWS) — see
 * specs/data-structures/ and specs/tracking-requirements.md.
 */
import {
  newTracker,
  enableActivityTracking,
  crossDomainLinker,
  trackPageView,
  trackSelfDescribingEvent,
  addGlobalContexts,
  clearGlobalContexts,
  setUserId,
  newSession,
  clearUserData,
  enableAnonymousTracking,
  disableAnonymousTracking,
} from '@snowplow/browser-tracker'
import { LinkClickTrackingPlugin, enableLinkClickTracking } from '@snowplow/browser-plugin-link-click-tracking'
import {
  EnhancedConsentPlugin,
  trackConsentAllow,
  trackConsentDeny,
  trackConsentSelected,
  trackCmpVisible,
} from '@snowplow/browser-plugin-enhanced-consent'
import { SnowplowMediaPlugin } from '@snowplow/browser-plugin-media'
import { YouTubeTrackingPlugin, startYouTubeTracking, endYouTubeTracking } from '@snowplow/browser-plugin-youtube-tracking'
import {
  SignalsPlugin,
  addInterventionHandlers,
  subscribeToInterventions,
  type Intervention,
} from '@snowplow/signals-browser-plugin'

import { siteConfig, type Customer, type BenefitCategory } from './config'
import { getConsentPreferences, isSignalsEnabled } from './consent'
import {
  flattenInterventionAttributes,
  recordInterventionTrigger,
} from './intervention-log'
import { isGuid } from './user-id'

// ─── Constants ───────────────────────────────────────────────────────────────

const COLLECTOR_ENDPOINT = 'https://com-snplow-sales-aws-prod1.collector.snplow.net'
const TRACKER_NAMESPACE = 'sp1'
const SIGNALS_ENDPOINT = 'https://7f9742b834d7.signals.snowplowanalytics.com'

const SCHEMA_VENDOR = 'com.bancofalabella'
const INTERVENTION_ATTRIBUTE_KEY_TARGETS = {
  customer_id: ['/cx/com.bancofalabella/customer/jsonschema/1/customer_id'] as [`/${string}`],
}

const SCHEMAS = {
  customer: `iglu:${SCHEMA_VENDOR}/customer/jsonschema/1-0-0`,
  benefitViewed: `iglu:${SCHEMA_VENDOR}/benefit_viewed/jsonschema/1-0-0`,
  benefitCategoryFiltered: `iglu:${SCHEMA_VENDOR}/benefit_category_filtered/jsonschema/1-0-0`,
  productPageViewed: `iglu:${SCHEMA_VENDOR}/product_page_viewed/jsonschema/1-0-0`,
  assistantMessageSent: `iglu:${SCHEMA_VENDOR}/assistant_message_sent/jsonschema/1-0-0`,
} as const

// ─── Tracker initialization ─────────────────────────────────────────────────

let isInitialized = false
let tracker: ReturnType<typeof newTracker>

export function initializeSnowplow(): void {
  if (isInitialized || typeof window === 'undefined') return

  tracker = newTracker(TRACKER_NAMESPACE, COLLECTOR_ENDPOINT, {
    appId: siteConfig.brand.appId,
    appVersion: '1.0.0',
    cookieSameSite: 'Lax',
    eventMethod: 'post',
    bufferSize: 1,
    contexts: { webPage: true },
    plugins: [
      LinkClickTrackingPlugin(),
      EnhancedConsentPlugin(),
      SnowplowMediaPlugin(),
      YouTubeTrackingPlugin(),
      SignalsPlugin(),
    ],
    crossDomainLinker: function (linkElement: HTMLAnchorElement | HTMLAreaElement) {
      return linkElement.hostname === 'snowplow.io'
    },
  })

  enableActivityTracking({ minimumVisitLength: 20, heartbeatDelay: 10 })
  enableLinkClickTracking({ trackContent: true })
  crossDomainLinker((linkElement) => linkElement.hostname === 'snowplow.io')

  const preferences = getConsentPreferences()
  if (preferences && !preferences.analytics) {
    enableAnonymousMode()
  }

  addInterventionHandlers({
    signalsPanel(intervention: Intervention) {
      recordInterventionTrigger({
        name: intervention.name,
        version: intervention.version,
        source: 'signals',
        interventionId: intervention.intervention_id,
        targetKey: intervention.target_attribute_key?.name,
        targetId: intervention.target_attribute_key?.id,
        attributes: flattenInterventionAttributes(intervention.attributes),
      })
    },
  })

  isInitialized = true
}

// ─── Page view tracking ─────────────────────────────────────────────────────

export function trackPageViewEvent(): void {
  trackPageView()
  cleanUpSpParam()
}

function cleanUpSpParam(): void {
  if (typeof window === 'undefined') return
  const url = new URL(window.location.href)
  if (url.searchParams.has('_sp')) {
    url.searchParams.delete('_sp')
    window.history.replaceState({}, '', url.toString())
  }
}

// ─── User identity ──────────────────────────────────────────────────────────

export function setUserForTracking(userId: string): void {
  if (!isGuid(userId)) {
    if (import.meta.env.DEV) console.warn('[snowplow] refusing non-GUID user id for Signals:', userId)
    return
  }
  setUserId(userId)
}

export function clearUserForTracking(): void {
  setUserId(null)
}

/** First-party Snowplow domain user id — the Signals key for anonymous attributes. */
export function getSnowplowDomainUserId(): string | null {
  if (!tracker) return null
  try {
    return tracker.getDomainUserId() || null
  } catch {
    return null
  }
}

// ─── Customer entity (attached to every event) ──────────────────────────────
// Uses addGlobalContexts so customer_id / cmr_tier / comuna land on every
// event without threading the entity through each individual track call.

export function setCustomerContext(customer: Customer): void {
  if (!isGuid(customer.customerId)) {
    if (import.meta.env.DEV) {
      console.warn('[snowplow] refusing non-GUID customer_id for Signals:', customer.customerId)
    }
    return
  }
  clearGlobalContexts([SCHEMAS.customer])
  addGlobalContexts([
    {
      schema: SCHEMAS.customer,
      data: {
        customer_id: customer.customerId,
        ...(customer.cmrTier ? { cmr_tier: customer.cmrTier } : {}),
        comuna: customer.comuna,
      },
    },
  ])
  updateInterventionIdentity(customer.customerId)
}

/**
 * Pushes customer_id into the interventions subscription on login.
 * banco_falabella_travel_intent_nudge is exclusive to identified customers.
 */
function updateInterventionIdentity(customerId: string): void {
  if (!siteConfig.features.signals || !isSignalsEnabled() || !isGuid(customerId)) return
  subscribeToInterventions({
    endpoint: SIGNALS_ENDPOINT,
    attributeKeyTargets: INTERVENTION_ATTRIBUTE_KEY_TARGETS,
    attributeKeyIds: { customer_id: customerId },
  })
}

export function clearCustomerContext(): void {
  clearGlobalContexts([SCHEMAS.customer])
}

// ─── Session management ─────────────────────────────────────────────────────

export function resetSession(): void {
  newSession()
}

/** Clears domain/session cookies, the Snowplow user id, and the customer entity (demo login reset). */
export function resetSnowplowIdentity(): void {
  clearUserData({ preserveSession: false, preserveUser: false })
  setUserId(null)
  clearCustomerContext()
}

// ─── Custom event tracking (Banco F benefits journey) ───────────────────────

export function trackBenefitViewed(params: {
  benefitId: string
  merchant: string
  category: BenefitCategory
  discountPct: number
}): void {
  trackSelfDescribingEvent({
    event: {
      schema: SCHEMAS.benefitViewed,
      data: {
        benefit_id: params.benefitId,
        merchant: params.merchant,
        category: params.category,
        discount_pct: params.discountPct,
      },
    },
  })
}

export function trackBenefitCategoryFiltered(category: BenefitCategory): void {
  trackSelfDescribingEvent({
    event: {
      schema: SCHEMAS.benefitCategoryFiltered,
      data: { category },
    },
  })
}

export function trackProductPageViewed(product: string): void {
  trackSelfDescribingEvent({
    event: {
      schema: SCHEMAS.productPageViewed,
      data: { product },
    },
  })
}

export function trackAssistantMessageSent(params: { channel: 'app' | 'whatsapp'; intentGuess: string }): void {
  trackSelfDescribingEvent({
    event: {
      schema: SCHEMAS.assistantMessageSent,
      data: { channel: params.channel, intent_guess: params.intentGuess },
    },
  })
}

// ─── Consent tracking ───────────────────────────────────────────────────────

const consentBasePayload = () => ({
  basisForProcessing: 'consent' as const,
  consentUrl: window.location.origin + '/privacy-policy',
  consentVersion: '1.0',
  domainsApplied: [window.location.hostname],
  gdprApplies: true,
})

export function trackConsentAllowEvent(scopes: string[]): void {
  trackConsentAllow({ ...consentBasePayload(), consentScopes: scopes })
}

export function trackConsentDenyEvent(scopes: string[]): void {
  trackConsentDeny({ ...consentBasePayload(), consentScopes: scopes })
}

export function trackConsentSelectedEvent(scopes: string[]): void {
  trackConsentSelected({ ...consentBasePayload(), consentScopes: scopes })
}

export function trackCmpVisibleEvent(): void {
  trackCmpVisible({ elapsedTime: performance.now() })
}

// ─── Anonymous tracking ─────────────────────────────────────────────────────

export function enableAnonymousMode(): void {
  enableAnonymousTracking({ options: { withServerAnonymisation: true, withSessionTracking: true } })
}

export function disableAnonymousMode(): void {
  disableAnonymousTracking()
}

// ─── Video tracking ─────────────────────────────────────────────────────────

export { startYouTubeTracking, endYouTubeTracking }
