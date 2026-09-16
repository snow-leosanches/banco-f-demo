/**
 * Banco F Signals registry objects. Source of truth for what we publish
 * through POST /api/signals/registry — same payloads the Python SDK used to send.
 *
 * Warehouse group `customer_scores` is intentionally omitted until a real
 * BigQuery/Snowflake table exists.
 */
import { ANONYMOUS_ATTRIBUTE_GROUP, IDENTIFIED_ATTRIBUTE_GROUP } from './signals-attributes'

export const SIGNALS_OWNER = 'leonel.sanches@snowplowanalytics.com'
export const SIGNALS_VENDOR = 'com.bancofalabella'
export const SIGNALS_SERVICE_NAME = 'benefits_agent_context_v1'
export const SIGNALS_AGENTIC_CONTEXT_NAME = 'benefits_assistant_context'
export const SIGNALS_INTERVENTION_NAME = 'banco_falabella_travel_intent_nudge'

const EVENT_VERSION = '1-0-0'

function schemaEvent(name: string) {
  return { name, vendor: SIGNALS_VENDOR, version: EVENT_VERSION }
}

function eventProperty(eventName: string, path: string, outputName?: string) {
  return {
    type: 'event' as const,
    vendor: SIGNALS_VENDOR,
    name: eventName,
    major_version: 1,
    path,
    ...(outputName ? { output_name: outputName } : {}),
  }
}

function atomicProperty(name: string) {
  return { type: 'atomic' as const, name }
}

function snowplowEvent(name: string) {
  return { name, vendor: 'com.snowplowanalytics.snowplow', version: EVENT_VERSION }
}

export const customerIdKey = {
  description: 'Banco F bank customer ID',
  is_published: true,
  key: 'customer_id',
  name: 'customer_id',
  owner: SIGNALS_OWNER,
  property: {
    index: 0,
    major_version: 1,
    name: 'customer',
    path: '$.customer_id',
    type: 'entity' as const,
    vendor: SIGNALS_VENDOR,
  },
}

const sessionBehaviorAttributes = [
  {
    aggregation: 'unique_list',
    description: 'Distinct benefit categories the customer filtered on in the last 30 minutes',
    events: [schemaEvent('benefit_category_filtered')],
    name: 'categories_viewed_last_30m',
    period: 'PT30M',
    property: eventProperty('benefit_category_filtered', '$.category'),
    type: 'string_list',
  },
  {
    aggregation: 'last',
    description: 'Most recent benefit merchant the customer viewed',
    events: [schemaEvent('benefit_viewed')],
    name: 'last_merchant_viewed',
    property: eventProperty('benefit_viewed', '$.merchant'),
    type: 'string',
  },
  {
    aggregation: 'counter',
    description: 'Count of benefit detail views in the last 10 minutes',
    events: [schemaEvent('benefit_viewed')],
    name: 'benefit_views_last_10m',
    period: 'PT10M',
    property: atomicProperty('event_id'),
    type: 'int32',
  },
  {
    aggregation: 'counter',
    criteria: {
      all: [
        {
          operator: '=',
          property: eventProperty('benefit_viewed', '$.category'),
          value: 'Viajes',
        },
      ],
    },
    description:
      'Count of Viajes-category benefit views in the last 10 minutes — drives the banco_falabella_travel_intent_nudge intervention',
    events: [schemaEvent('benefit_viewed')],
    name: 'travel_pages_last_10m',
    period: 'PT10M',
    property: atomicProperty('event_id'),
    type: 'int32',
  },
] as const

const customerMemoryAttributes = [
  {
    aggregation: 'unique_list',
    description: 'Distinct benefit catalog IDs the customer opened in the last 7 days',
    events: [schemaEvent('benefit_viewed')],
    name: 'benefits_visited_last_7d',
    period: 'P7D',
    property: eventProperty('benefit_viewed', '$.benefit_id'),
    type: 'string_list',
  },
  {
    aggregation: 'unique_list',
    description: 'Distinct benefit merchants the customer opened in the last 7 days',
    events: [schemaEvent('benefit_viewed')],
    name: 'merchants_visited_last_7d',
    period: 'P7D',
    property: eventProperty('benefit_viewed', '$.merchant'),
    type: 'string_list',
  },
  {
    aggregation: 'counter',
    description:
      'Page pings in the last 7 days. Heartbeat is 10s (after 20s on the page); panel estimates engaged time as pings × 10s',
    events: [snowplowEvent('page_ping')],
    name: 'page_pings_last_7d',
    period: 'P7D',
    property: atomicProperty('event_id'),
    type: 'int32',
  },
  {
    aggregation: 'approx_count_distinct',
    description: 'Approximate distinct domain_sessionid values from page views in the last 7 days',
    events: [snowplowEvent('page_view')],
    name: 'sessions_last_7d',
    period: 'P7D',
    property: atomicProperty('domain_sessionid'),
    type: 'int32',
  },
] as const

export const customerIdAttributesGroup = {
  attribute_key: { name: 'customer_id' },
  attributes: customerMemoryAttributes,
  description:
    'Seven-day customer memory for the Banco F Signals POC: benefits and merchants visited, plus ping/session volume for estimated average engaged session',
  is_published: true,
  name: IDENTIFIED_ATTRIBUTE_GROUP.name,
  offline: false,
  online: true,
  owner: SIGNALS_OWNER,
  version: IDENTIFIED_ATTRIBUTE_GROUP.version,
}

export const domainUseridAttributesGroup = {
  attribute_key: { name: 'domain_userid' },
  attributes: sessionBehaviorAttributes,
  description:
    'This-visit benefits-browsing behavior keyed by domain_userid so attributes calculate for anonymous visitors and keep updating after login',
  is_published: true,
  name: ANONYMOUS_ATTRIBUTE_GROUP.name,
  offline: false,
  online: true,
  owner: SIGNALS_OWNER,
  version: ANONYMOUS_ATTRIBUTE_GROUP.version,
}

export const benefitsAssistantContext = {
  attribute_key: { name: 'domain_sessionid' },
  description: 'Rolling session activity for the Banco F Benefits assistant',
  events: [
    {
      event: schemaEvent('benefit_viewed'),
      properties: [
        atomicProperty('event_name'),
        atomicProperty('page_urlpath'),
        eventProperty('benefit_viewed', '$.merchant', 'merchant'),
        eventProperty('benefit_viewed', '$.category', 'category'),
        eventProperty('benefit_viewed', '$.discount_pct', 'discount_pct'),
      ],
    },
    {
      event: schemaEvent('benefit_category_filtered'),
      properties: [
        atomicProperty('event_name'),
        eventProperty('benefit_category_filtered', '$.category', 'category'),
      ],
    },
    {
      event: schemaEvent('product_page_viewed'),
      properties: [
        atomicProperty('event_name'),
        eventProperty('product_page_viewed', '$.product', 'product'),
      ],
    },
  ],
  max_age_seconds: 1800,
  max_events: 50,
  name: SIGNALS_AGENTIC_CONTEXT_NAME,
  owner: SIGNALS_OWNER,
  prompt:
    "You are Banco Falabella's benefits assistant. Use recent activity to prioritize benefits the customer is actively exploring. Never invent benefits not in the catalog.",
  version: 1,
}

export const benefitsAgentContextService = {
  attribute_groups: [{ name: IDENTIFIED_ATTRIBUTE_GROUP.name, version: IDENTIFIED_ATTRIBUTE_GROUP.version }],
  description: 'Context package for the Banco F Benefits assistant (Signals POC)',
  is_published: true,
  name: SIGNALS_SERVICE_NAME,
  owner: SIGNALS_OWNER,
}

export const travelIntentNudge = {
  criteria: {
    attribute: `${ANONYMOUS_ATTRIBUTE_GROUP.name}:travel_pages_last_10m`,
    operator: '>=',
    value: 3,
  },
  description:
    'Fires after 3+ Viajes benefit views in 10 minutes on domain_userid. The in-app orb still only renders after login (CMR vs sign-up copy).',
  is_published: true,
  name: SIGNALS_INTERVENTION_NAME,
  owner: SIGNALS_OWNER,
  target_attribute_keys: [{ name: 'domain_userid' }],
  version: 1,
}

export const RETIRED_ATTRIBUTE_GROUPS = [
  { name: 'benefits_session_behavior', version: 1 },
  { name: 'benefits_anonymous_behavior', version: 1 },
] as const

export const RETIRED_INTERVENTIONS = [{ name: 'travel_intent_nudge', version: 1 }] as const

export const signalsRegistryCatalog = [
  { type: 'attribute_key', name: customerIdKey.name, version: null },
  {
    type: 'attribute_group',
    name: customerIdAttributesGroup.name,
    version: customerIdAttributesGroup.version,
    attributeKey: 'customer_id',
  },
  {
    type: 'attribute_group',
    name: domainUseridAttributesGroup.name,
    version: domainUseridAttributesGroup.version,
    attributeKey: 'domain_userid',
  },
  { type: 'event_log', name: benefitsAssistantContext.name, version: benefitsAssistantContext.version },
  { type: 'service', name: benefitsAgentContextService.name, version: null },
  { type: 'intervention', name: travelIntentNudge.name, version: travelIntentNudge.version },
] as const
