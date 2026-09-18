import { tool } from 'ai'
import { z } from 'zod'

import {
  ANONYMOUS_ATTRIBUTE_GROUP,
  IDENTIFIED_ATTRIBUTE_GROUP,
  estimatedAvgSessionSeconds,
  hasCustomerMemory,
  hasSessionBehavior,
  parseCustomerMemory,
  parseSessionBehavior,
} from '@/lib/signals-attributes'
import { getSignalsAttributeGroups } from '@/lib/signals-server'
import { type ClientBehaviorSnapshot } from '@/lib/agent-prompt'

export const signalsToolContextSchema = z.object({
  customerId: z.string(),
  domainUserId: z.string().nullable(),
  signalsEnabled: z.boolean(),
  clientBehavior: z.object({
    categoriesViewedLast30m: z.array(z.string()),
    lastMerchantViewed: z.string().nullable(),
    benefitViewsLast10m: z.number(),
    travelPagesLast10m: z.number(),
  }),
})

export type SignalsToolContext = {
  customerId: string
  domainUserId: string | null
  signalsEnabled: boolean
  clientBehavior: ClientBehaviorSnapshot
}

function localVisitAttributes(behavior: ClientBehaviorSnapshot) {
  return {
    categories_viewed_last_30m: behavior.categoriesViewedLast30m,
    last_merchant_viewed: behavior.lastMerchantViewed,
    benefit_views_last_10m: behavior.benefitViewsLast10m,
    travel_pages_last_10m: behavior.travelPagesLast10m,
  }
}

function hasLocalVisit(behavior: ClientBehaviorSnapshot) {
  return (
    behavior.categoriesViewedLast30m.length > 0 ||
    behavior.lastMerchantViewed !== null ||
    behavior.benefitViewsLast10m > 0 ||
    behavior.travelPagesLast10m > 0
  )
}

function shapeMemory(raw: Record<string, unknown> | null) {
  const parsed = raw ? parseCustomerMemory(raw) : null
  if (!hasCustomerMemory(parsed) || !parsed) return null
  const avg = estimatedAvgSessionSeconds(parsed.page_pings_last_7d, parsed.sessions_last_7d)
  return {
    ...parsed,
    estimated_avg_engaged_session_seconds: avg ?? null,
  }
}

function shapeVisit(raw: Record<string, unknown> | null) {
  const parsed = raw ? parseSessionBehavior(raw) : null
  return hasSessionBehavior(parsed) ? parsed : null
}

export const getSignalsAttributes = tool({
  description:
    'Lee los dos grupos de atributos de Snowplow Signals: intención de esta visita (domain_userid: categorías, último comercio, vistas, viajes) y memoria del cliente (beneficios y comercios de la última hora; pings y sesiones de 7 días). Llámalas en C2 para priorizar beneficios que SÍ tiene. No inventes estos valores. No la uses en C0/C1 ni para inventar movimientos de la cuenta.',
  inputSchema: z.object({}),
  contextSchema: signalsToolContextSchema,
  execute: async (_input, { context }) => {
    if (!context.signalsEnabled) {
      return {
        source: 'none' as const,
        note: 'Signals está apagado. No uses comportamiento reciente para personalizar.',
        [ANONYMOUS_ATTRIBUTE_GROUP.name]: null,
        [IDENTIFIED_ATTRIBUTE_GROUP.name]: null,
      }
    }

    const groups = await getSignalsAttributeGroups({
      customerId: context.customerId,
      domainUserId: context.domainUserId,
    })

    const visit = shapeVisit(groups.visit)
    const memory = shapeMemory(groups.memory)

    if (visit || memory) {
      return {
        source: 'signals' as const,
        [ANONYMOUS_ATTRIBUTE_GROUP.name]: visit,
        [IDENTIFIED_ATTRIBUTE_GROUP.name]: memory,
      }
    }

    if (hasLocalVisit(context.clientBehavior)) {
      return {
        source: 'local-fallback' as const,
        note: 'Signals aún no tiene valores; usa este fallback local de la visita actual. No inventes memoria de la última hora.',
        [ANONYMOUS_ATTRIBUTE_GROUP.name]: localVisitAttributes(context.clientBehavior),
        [IDENTIFIED_ATTRIBUTE_GROUP.name]: null,
      }
    }

    return {
      source: groups.reachedSignals ? 'signals' as const : 'none' as const,
      note: 'No hay atributos de comportamiento todavía. No inventes visitas ni comercios.',
      [ANONYMOUS_ATTRIBUTE_GROUP.name]: null,
      [IDENTIFIED_ATTRIBUTE_GROUP.name]: null,
    }
  },
})

export const signalsTools = {
  getSignalsAttributes,
}
