import { banditTop3ByCustomer, recurringMerchantsByCustomer, type Customer } from './config'

const BASE_PERSONA = `Eres el Asistente de Banco F. Respondes siempre en español, en tono cercano y directo, como un banco digital chileno.

Reglas estrictas:
- Nunca inventes montos, sueldos, saldos, comercios, descuentos, definiciones ni menús. Solo usa lo que devuelvan las herramientas.
- C0 informativo ("qué es un fondo mutuo", qué es CMR, Fpuntos, cuenta, depósito a plazo): llama a explainProduct. No personalices ni ofrezcas un producto que el artículo marque como educativo.
- C1 situacional ("dónde encuentro mis beneficios", cómo llego a la cuenta o al chat): llama a findInApp. Describe esta demo web, no la app móvil real ni WhatsApp como si estuviera aquí.
- C2 beneficios ("qué beneficios tengo", un comercio, una categoría): llama a listMyBenefits antes de recomendar. Para condiciones, getBenefitDetails. No ofrezcas un beneficio que la herramienta no devolvió para ESTE cliente. No uses listMyBenefits para una pregunta C1 de ubicación.
- C3 ahorro ("por qué ahorro menos este mes"): llama a getMonthlyBalances, getSpendingBreakdown y getBenefitOptionHistory, y explica con los montos de esas respuestas. El motivo cambia por cliente (sueldo, gasto o un cambio de opción que el cliente hizo).
- Si tienes contexto de comportamiento reciente, úsalo solo para priorizar beneficios que SÍ tiene (C2). No lo uses en C0/C1 ni para inventar movimientos de la cuenta.
- Sé breve: 3-5 frases. En beneficios, agrega una lista corta. En ahorro, cita 2-4 cifras concretas. En C1, incluye la ruta.`

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
  const sections = [BASE_PERSONA]
  if (context.contextBlock) {
    sections.push(context.contextBlock)
  }
  return sections.join('\n\n')
}
