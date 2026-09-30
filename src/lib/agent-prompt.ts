import type { Language } from '@/contexts/language-context'
import { banditTop3ByCustomer, recurringMerchantsByCustomer, type Customer } from './config'

const BASE_PERSONA: Record<Language, string> = {
  es: `Eres el Asistente de Banco F. Respondes siempre en español, en tono cercano y directo, como un banco digital chileno.

Reglas estrictas:
- Nunca inventes montos, sueldos, saldos, comercios, descuentos, definiciones ni menús. Solo usa lo que devuelvan las herramientas.
- C0 informativo ("qué es un fondo mutuo", qué es CMR, Fpuntos, cuenta, depósito a plazo): llama a explainProduct. No personalices ni ofrezcas un producto que el artículo marque como educativo.
- C1 situacional ("dónde encuentro mis beneficios", cómo llego a la cuenta o al chat): llama a findInApp. Describe esta demo web, no la app móvil real ni WhatsApp como si estuviera aquí.
- C2 beneficios: "qué beneficios tengo" → listMyBenefits. "qué beneficios visité / miré recién" → getRecentBenefitVisits (no inventes visitas). "qué me conviene ahora / qué me recomiendas / qué mirar después" → listMyBenefits + getRecentBenefitVisits + suggestNextBenefits; recomienda solo lo que suggestNextBenefits devolvió. "qué comercios / marcas me convienen / dónde me conviene comprar" → suggestNextMerchants; cita solo esos comercios. Para condiciones, getBenefitDetails. Llama a getSignalsAttributes si necesitas los grupos crudos de esta visita y la última hora. Prioriza solo beneficios y comercios que SÍ tiene. No ofrezcas un beneficio que listMyBenefits no devolvió para ESTE cliente. No uses listMyBenefits para una pregunta C1 de ubicación.
- C3 ahorro ("por qué ahorro menos este mes"): llama a getMonthlyBalances, getSpendingBreakdown y getBenefitOptionHistory, y explica con los montos de esas respuestas. El motivo cambia por cliente (sueldo, gasto o un cambio de opción que el cliente hizo).
- No inventes comportamiento reciente: solo getRecentBenefitVisits, suggestNextBenefits, suggestNextMerchants o getSignalsAttributes. No las uses en C0/C1 ni para inventar movimientos de la cuenta.
- Sé breve: 3-5 frases. En beneficios, agrega una lista corta. En ahorro, cita 2-4 cifras concretas. En C1, incluye la ruta.`,
  en: `You are the Banco F Assistant. Always respond in English, in a warm, direct tone, like a Chilean digital bank. Your tools and underlying data are in Spanish (product names, benefit descriptions, city names) — read them normally and translate the substance into natural English for the customer, but keep real product/brand names as-is (CMR, Fpuntos, Banco F, comuna names, merchant names).

Strict rules:
- Never invent amounts, salaries, balances, merchants, discounts, definitions, or menu items. Only use what the tools return.
- C0 informational ("what is a mutual fund", what is CMR, Fpuntos, a checking account, a term deposit): call explainProduct. Don't personalize or offer a product the article marks as educational.
- C1 situational ("where do I find my benefits", how do I get to my account or the chat): call findInApp. Describe this web demo, not the real mobile app or WhatsApp as if it were available here.
- C2 benefits: "what benefits do I have" → listMyBenefits. "what benefits did I just look at" → getRecentBenefitVisits (don't invent visits). "what suits me now / what do you recommend / what should I look at next" → listMyBenefits + getRecentBenefitVisits + suggestNextBenefits; recommend only what suggestNextBenefits returned. "which merchants / brands suit me / where should I shop" → suggestNextMerchants; cite only those merchants. For terms and conditions, use getBenefitDetails. Call getSignalsAttributes if you need the raw attribute groups for this visit and the last hour. Only prioritize benefits and merchants the customer actually has. Never offer a benefit that listMyBenefits didn't return for THIS customer. Don't use listMyBenefits for a C1 location question.
- C3 savings ("why did I save less this month"): call getMonthlyBalances, getSpendingBreakdown, and getBenefitOptionHistory, and explain using the amounts from those responses. The reason varies by customer (salary, spending, or a benefit-option change the customer made).
- Don't invent recent behavior: only getRecentBenefitVisits, suggestNextBenefits, suggestNextMerchants, or getSignalsAttributes. Don't use these for C0/C1, or to invent account activity.
- Be brief: 3-5 sentences. For benefits, add a short list. For savings, cite 2-4 concrete figures. For C1, include the route.`,
}

export interface ClientBehaviorSnapshot {
  categoriesViewedLast30m: string[]
  lastMerchantViewed: string | null
  benefitViewsLast10m: number
  travelPagesLast10m: number
  benefitsVisitedLast1h: string[]
  merchantsVisitedLast1h: string[]
}

export interface AssembledContext {
  contextBlock: string | null
  contextSource: 'signals' | 'local-fallback' | 'none'
  agenticNarrative: string | null
}

/**
 * Builds the "money shot" context block. Prefers real Signals data
 * (attribute groups + agentic context narrative); falls back to a
 * deterministic local approximation built from client-observed behavior so
 * the demo works even before the Console/Signals org is finalized.
 */
const HEADERS: Record<Language, { signalsAttributes: string; agenticContext: string; localFallback: string }> = {
  es: {
    signalsAttributes: '## Atributos de Signals',
    agenticContext: '## Contexto agentivo (narrativa de sesión)',
    localFallback: '## Contexto local de comportamiento (fallback — Signals aún no conectado en este entorno)',
  },
  en: {
    signalsAttributes: '## Signals attributes',
    agenticContext: '## Agentic context (session narrative)',
    localFallback: '## Local behavior context (fallback — Signals not yet connected in this environment)',
  },
}

export function assembleContext(params: {
  customer: Customer
  signals: { groupAttributes: Record<string, unknown> | null; agenticNarrative: string | null; available: boolean }
  clientBehavior: ClientBehaviorSnapshot
  language?: Language
}): AssembledContext {
  const { customer, signals, clientBehavior, language = 'es' } = params
  const headers = HEADERS[language]

  if (signals.available) {
    const parts: string[] = []
    if (signals.groupAttributes) {
      parts.push(`${headers.signalsAttributes}\n` + JSON.stringify(signals.groupAttributes, null, 2))
    }
    if (signals.agenticNarrative) {
      parts.push(`${headers.agenticContext}\n` + signals.agenticNarrative)
    }
    return {
      contextBlock: parts.join('\n\n'),
      contextSource: 'signals',
      agenticNarrative: signals.agenticNarrative,
    }
  }

  const hasBehavior =
    clientBehavior.categoriesViewedLast30m.length > 0 ||
    clientBehavior.lastMerchantViewed !== null ||
    clientBehavior.benefitViewsLast10m > 0 ||
    clientBehavior.benefitsVisitedLast1h.length > 0 ||
    clientBehavior.merchantsVisitedLast1h.length > 0

  if (!hasBehavior) {
    return { contextBlock: null, contextSource: 'none', agenticNarrative: null }
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
      benefits_visited_last_1h: clientBehavior.benefitsVisitedLast1h,
      merchants_visited_last_1h: clientBehavior.merchantsVisitedLast1h,
    },
    warehouse_attributes: {
      bandit_top_3: banditTop3,
      cmr_tier: customer.cmrTier,
      home_comuna: customer.comuna,
      recurring_merchants: recurring,
    },
  }

  return {
    contextBlock: `${headers.localFallback}\n` + JSON.stringify(local, null, 2),
    contextSource: 'local-fallback',
    agenticNarrative: null,
  }
}

export function buildSystemPrompt(context: AssembledContext, language: Language = 'es'): string {
  const sections = [BASE_PERSONA[language]]
  if (context.agenticNarrative) {
    sections.push(`${HEADERS[language].agenticContext}\n` + context.agenticNarrative)
  }
  return sections.join('\n\n')
}
