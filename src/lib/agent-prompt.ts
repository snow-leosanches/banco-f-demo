import { benefits, banditTop3ByCustomer, recurringMerchantsByCustomer, type Customer } from './config'

const BASE_PERSONA = `Eres el Asistente de beneficios de Banco F. Respondes siempre en español, en tono cercano y directo, como un banco digital chileno.

Reglas estrictas:
- Nunca inventes beneficios, comercios o descuentos que no aparezcan en el catálogo entregado.
- Si tienes contexto de comportamiento reciente del cliente, úsalo para priorizar y ordenar los beneficios que mencionas primero.
- Sé breve: 3-5 frases más una lista corta de beneficios recomendados.
- Si no tienes contexto de comportamiento, responde con una selección genérica y equilibrada del catálogo, sin inventar personalización.`

function formatCatalog(): string {
  return benefits
    .map((b) => `- ${b.id}: ${b.merchant} (${b.category}), ${b.discountPct}% dcto. ${b.description}`)
    .join('\n')
}

export interface ClientBehaviorSnapshot {
  categoriesViewedLast30m: string[]
  lastMerchantViewed: string | null
  benefitViewsLast10m: number
  travelPagesLast10m: number
}

export interface AssembledContext {
  contextBlock: string | null
  contextSource: 'signals' | 'local-fallback' | 'none'
}

/**
 * Builds the "money shot" context block. Prefers real Signals data
 * (service attributes + agentic context narrative); falls back to a
 * deterministic local approximation built from client-observed behavior so
 * the demo works even before the Console/Signals org is finalized.
 */
export function assembleContext(params: {
  customer: Customer
  signals: { serviceAttributes: Record<string, unknown> | null; agenticNarrative: string | null; available: boolean }
  clientBehavior: ClientBehaviorSnapshot
}): AssembledContext {
  const { customer, signals, clientBehavior } = params

  if (signals.available) {
    const parts: string[] = []
    if (signals.serviceAttributes) {
      parts.push(
        '## Atributos de Signals (benefits_agent_context_v1)\n' + JSON.stringify(signals.serviceAttributes, null, 2),
      )
    }
    if (signals.agenticNarrative) {
      parts.push('## Contexto agentivo (narrativa de sesión)\n' + signals.agenticNarrative)
    }
    return { contextBlock: parts.join('\n\n'), contextSource: 'signals' }
  }

  const hasBehavior =
    clientBehavior.categoriesViewedLast30m.length > 0 ||
    clientBehavior.lastMerchantViewed !== null ||
    clientBehavior.benefitViewsLast10m > 0

  if (!hasBehavior) {
    return { contextBlock: null, contextSource: 'none' }
  }

  const banditTop3 = banditTop3ByCustomer[customer.customerId] ?? []
  const recurring = recurringMerchantsByCustomer[customer.customerId] ?? []

  const local = {
    attribute_key: 'customer_id',
    identifier: customer.customerId,
    stream_attributes: {
      categories_viewed_last_30m: clientBehavior.categoriesViewedLast30m,
      last_merchant_viewed: clientBehavior.lastMerchantViewed,
      benefit_views_last_10m: clientBehavior.benefitViewsLast10m,
      travel_pages_last_10m: clientBehavior.travelPagesLast10m,
    },
    warehouse_attributes: {
      bandit_top_3: banditTop3,
      cmr_tier: customer.cmrTier,
      home_comuna: customer.comuna,
      recurring_merchants: recurring,
    },
  }

  return {
    contextBlock:
      '## Contexto local de comportamiento (fallback — Signals aún no conectado en este entorno)\n' +
      JSON.stringify(local, null, 2),
    contextSource: 'local-fallback',
  }
}

export function buildSystemPrompt(context: AssembledContext): string {
  const sections = [BASE_PERSONA, '## Catálogo de beneficios disponibles\n' + formatCatalog()]
  if (context.contextBlock) {
    sections.push(context.contextBlock)
  }
  return sections.join('\n\n')
}
