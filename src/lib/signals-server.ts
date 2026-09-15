/**
 * Server-only Signals client. Used by the chat route (service + agentic
 * context) and by the presenter Signals panel (per-identity attribute groups).
 *
 * Requires SIGNALS_API_ENDPOINT / SIGNALS_API_KEY / SIGNALS_API_KEY_ID /
 * SNOWPLOW_CONSOLE_ORG_ID. Until those are set every call fails soft so
 * `npm run dev` still works.
 */
import { Signals } from '@snowplow/signals-node'
import { SIGNALS_AGENTIC_CONTEXT_NAME, SIGNALS_SERVICE_NAME } from './signals-definitions'
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

export interface BenefitsSignalsContext {
  /** Raw attribute values from the benefits_agent_context_v1 service (stream + warehouse). */
  serviceAttributes: Record<string, unknown> | null
  /** LLM-ready narrative of the customer's current session activity. */
  agenticNarrative: string | null
  /** True if we reached Signals at all (even partially). */
  available: boolean
}

export async function getBenefitsSignalsContext(params: {
  customerId: string
  domainSessionId: string | null
}): Promise<BenefitsSignalsContext> {
  const signals = getClient()
  if (!signals || !isGuid(params.customerId)) {
    return { serviceAttributes: null, agenticNarrative: null, available: false }
  }

  const [serviceAttributes, agenticNarrative] = await Promise.all([
    signals
      .getServiceAttributes({
        attribute_key: 'customer_id',
        identifier: params.customerId,
        name: SIGNALS_SERVICE_NAME,
      })
      .catch(() => null),
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

  return {
    serviceAttributes,
    agenticNarrative,
    available: serviceAttributes !== null || agenticNarrative !== null,
  }
}
