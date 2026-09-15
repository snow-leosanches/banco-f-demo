/**
 * Server-only helper for fetching Banco F's Signals context: the stream +
 * warehouse attribute groups (via the `benefits_agent_context_v1` service)
 * and the session-scoped agentic context narrative.
 *
 * Requires SIGNALS_API_ENDPOINT / SIGNALS_API_KEY / SIGNALS_API_KEY_ID /
 * SNOWPLOW_CONSOLE_ORG_ID env vars once the Console org is finalized. Until
 * then every call fails soft: the chat route falls back to catalog-only
 * grounding rather than throwing, so `npm run dev` works before Signals is
 * wired up for real.
 */
import { Signals } from '@snowplow/signals-node'
import { isGuid } from './user-id'

const SERVICE_NAME = 'benefits_agent_context_v1'
const AGENTIC_CONTEXT_NAME = 'benefits_assistant_context'

let client: Signals | null | undefined

function getClient(): Signals | null {
  if (client !== undefined) return client

  const baseUrl = process.env.SIGNALS_API_ENDPOINT
  const apiKey = process.env.SIGNALS_API_KEY
  const apiKeyId = process.env.SIGNALS_API_KEY_ID
  const organizationId = process.env.SNOWPLOW_CONSOLE_ORG_ID

  if (!baseUrl || !apiKey || !apiKeyId || !organizationId || baseUrl.startsWith('[')) {
    client = null
    return client
  }

  client = new Signals({ baseUrl, apiKey, apiKeyId, organizationId })
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
        name: SERVICE_NAME,
      })
      .catch(() => null),
    params.domainSessionId
      ? signals
          .getAgenticContext({
            name: AGENTIC_CONTEXT_NAME,
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
