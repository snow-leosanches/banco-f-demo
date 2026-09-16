/**
 * Server-only Signals client. Used by the chat route (attribute groups +
 * agentic context) and by the presenter Signals panel.
 *
 * Requires SIGNALS_API_ENDPOINT / SIGNALS_API_KEY / SIGNALS_API_KEY_ID /
 * SNOWPLOW_CONSOLE_ORG_ID. Until those are set every call fails soft so
 * `npm run dev` still works.
 */
import { Signals } from '@snowplow/signals-node'
import { SIGNALS_AGENTIC_CONTEXT_NAME } from './signals-definitions'
import { ANONYMOUS_ATTRIBUTE_GROUP, IDENTIFIED_ATTRIBUTE_GROUP } from './signals-attributes'
import { getSignalsEnv, signalsEnvDetails } from './signals-env'
import { isGuid } from './user-id'

export type SignalsInitResult =
  | { success: true; signals: Signals }
  | { success: false; error: string; details: Record<string, boolean> }

let client: Signals | null | undefined

export function getSignalsInstance(): SignalsInitResult {
  const { baseUrl, apiKey, apiKeyId, organizationId, sandboxToken } = getSignalsEnv()
  const details = signalsEnvDetails({ baseUrl, apiKey, apiKeyId, organizationId, sandboxToken })

  if (!baseUrl || baseUrl.startsWith('[')) {
    return {
      success: false,
      error: 'Missing SIGNALS_API_ENDPOINT environment variable',
      details,
    }
  }

  try {
    if (sandboxToken) {
      return { success: true, signals: new Signals({ baseUrl, sandboxToken }) }
    }

    if (!apiKey || !apiKeyId || !organizationId) {
      return {
        success: false,
        error: 'Missing required parameters for API key mode',
        details,
      }
    }

    return {
      success: true,
      signals: new Signals({ baseUrl, apiKey, apiKeyId, organizationId }),
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      error: `Failed to initialize Snowplow Signals: ${message}`,
      details,
    }
  }
}

function getClient(): Signals | null {
  if (client !== undefined) return client
  const result = getSignalsInstance()
  client = result.success ? result.signals : null
  return client
}

type StreamGroup = typeof ANONYMOUS_ATTRIBUTE_GROUP | typeof IDENTIFIED_ATTRIBUTE_GROUP

function fetchGroupAttributes(signals: Signals, group: StreamGroup, identifier: string) {
  return signals.getGroupAttributes({
    attribute_key: group.attributeKey,
    identifier,
    name: group.name,
    version: group.version,
    attributes: [...group.attributes] as [string, ...string[]],
  })
}

export interface BenefitsSignalsContext {
  /** Raw values from the two stream attribute groups, keyed by group name. */
  groupAttributes: Record<string, unknown> | null
  /** LLM-ready narrative of the customer's current session activity. */
  agenticNarrative: string | null
  /** True if we reached Signals at all (even partially). */
  available: boolean
}

export async function getBenefitsSignalsContext(params: {
  customerId: string
  domainUserId: string | null
  domainSessionId: string | null
}): Promise<BenefitsSignalsContext> {
  const signals = getClient()
  if (!signals || !isGuid(params.customerId)) {
    return { groupAttributes: null, agenticNarrative: null, available: false }
  }

  const [identifiedAttributes, visitAttributes, agenticNarrative] = await Promise.all([
    fetchGroupAttributes(signals, IDENTIFIED_ATTRIBUTE_GROUP, params.customerId).catch(() => null),
    params.domainUserId
      ? fetchGroupAttributes(signals, ANONYMOUS_ATTRIBUTE_GROUP, params.domainUserId).catch(() => null)
      : Promise.resolve(null),
    params.domainSessionId
      ? signals
          .getAgenticContext({
            name: SIGNALS_AGENTIC_CONTEXT_NAME,
            identifier: params.domainSessionId,
            format: 'narrative',
          })
          .catch(() => null)
      : Promise.resolve(null),
  ])

  const groupAttributes =
    identifiedAttributes || visitAttributes
      ? {
          ...(identifiedAttributes ? { [IDENTIFIED_ATTRIBUTE_GROUP.name]: identifiedAttributes } : {}),
          ...(visitAttributes ? { [ANONYMOUS_ATTRIBUTE_GROUP.name]: visitAttributes } : {}),
        }
      : null

  return {
    groupAttributes,
    agenticNarrative,
    available: groupAttributes !== null || agenticNarrative !== null,
  }
}
