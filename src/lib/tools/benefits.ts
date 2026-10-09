import { tool } from 'ai'
import { z } from 'zod'

import { benefitSchedule, rankForToday } from '@/lib/benefit-days'
import { suggestNextBenefits as rankNextBenefits } from '@/lib/benefit-recommendations'
import { loadRecentBenefitVisits } from '@/lib/benefit-visits'
import { merchantKey } from '@/lib/chat-mentions'
import { type Benefit } from '@/lib/config'
import {
  getEntitledBenefit,
  getEntitledBenefits,
} from '@/lib/customer-benefits'
import { customerContextSchema } from '@/lib/tools/customer-context'
import { signalsToolContextSchema } from '@/lib/tools/signals'

const categories = ['Restaurantes', 'Viajes', 'Combustible', 'Retail'] as const

function summarize(benefit: Benefit) {
  return {
    id: benefit.id,
    merchant: benefit.merchant,
    category: benefit.category,
    discountPct: benefit.discountPct,
    ...(benefit.offerLabel ? { offerLabel: benefit.offerLabel } : {}),
    description: benefit.description,
    ...(benefit.terms ? { terms: benefit.terms } : {}),
  }
}

export const listMyBenefits = tool({
  description:
    'C2: lista los beneficios CMR vigentes de ESTE cliente este mes. Úsala para “qué beneficios tengo”. Llámalas siempre antes de recomendar. No uses un catálogo general: cada login tiene un subconjunto distinto.',
  inputSchema: z.object({
    category: z
      .enum(categories)
      .optional()
      .describe('Filtra por categoría si el cliente preguntó por una sola'),
  }),
  contextSchema: customerContextSchema,
  execute: async ({ category }, { context }) => {
    const entitled = getEntitledBenefits(context.customerId, category)
    return {
      count: entitled.length,
      benefits: entitled.map(summarize),
      ...(entitled.length === 0
        ? {
            note: category
              ? `El cliente no tiene beneficios vigentes en ${category} este mes.`
              : 'El cliente no tiene beneficios vigentes este mes.',
          }
        : {}),
    }
  },
})

function withSchedule(benefit: Benefit) {
  return { ...summarize(benefit), ...benefitSchedule(benefit) }
}

/** Exact id first; otherwise every entitled benefit of the named merchant. */
function resolveEntitled(customerId: string, idOrMerchant: string): Benefit[] {
  const byId = getEntitledBenefit(customerId, idOrMerchant)
  if (byId) return [byId]
  const key = merchantKey(idOrMerchant)
  return getEntitledBenefits(customerId).filter(
    (benefit) =>
      merchantKey(benefit.merchant) === key || merchantKey(benefit.id) === key,
  )
}

export const getBenefitDetails = tool({
  description:
    'Devuelve el detalle, las condiciones y los días (days, appliesToday) de un beneficio SOLO si está vigente para este cliente. Acepta el id (ej. turbus, shell) o el nombre del comercio tal como se dijo en el chat (ej. Falabella.com). appliesToday null significa que el catálogo no limita días.',
  inputSchema: z.object({
    benefitId: z
      .string()
      .describe(
        'Id del beneficio (turbus, dunkin) o nombre del comercio (Falabella.com)',
      ),
  }),
  contextSchema: customerContextSchema,
  execute: async ({ benefitId }, { context }) => {
    const matches = resolveEntitled(context.customerId, benefitId)
    if (matches.length === 0) {
      return {
        found: false,
        benefitId,
        note: 'Este beneficio no está vigente para el cliente. No lo ofrezcas.',
      }
    }
    const [benefit, ...others] = matches
    return {
      found: true,
      benefit: withSchedule(benefit),
      ...(others.length > 0
        ? { otherBenefitsAtMerchant: others.map(withSchedule) }
        : {}),
    }
  },
})

export const pickContextSchema = customerContextSchema.extend({
  pickBenefitIds: z.array(z.string()).default([]),
})

export const rankMentionedBenefits = tool({
  description:
    'C2: para "cuál de esos me conviene más / cuál elijo". Ordena los beneficios vigentes que nombró tu última respuesta: primero los que aplican hoy, luego sin límite de día, al final los de otro día; a igual día, el mayor descuento. Recomienda pick y cita sus razones; no cambies el orden.',
  inputSchema: z.object({}),
  contextSchema: pickContextSchema,
  execute: async (_input, { context }) => {
    const entitled = context.pickBenefitIds
      .map((id) => getEntitledBenefit(context.customerId, id))
      .filter((benefit): benefit is Benefit => benefit != null)
    const ranked = rankForToday(entitled).map(({ benefit, schedule }) => ({
      ...summarize(benefit),
      ...schedule,
    }))
    if (ranked.length === 0) {
      return {
        found: false,
        note: 'Tu última respuesta no nombró beneficios vigentes de este cliente. Usa listMyBenefits; no inventes.',
      }
    }
    return { found: true, pick: ranked[0], ranked }
  },
})

export const getRecentBenefitVisits = tool({
  description:
    'C2: beneficios y categorías del catálogo que ESTE cliente visitó recientemente (última hora y esta visita). Úsala para “qué beneficios visité recién”. Resuelve ids y comercios contra el catálogo. Marca si cada visita está vigente para el cliente. No inventes visitas.',
  inputSchema: z.object({}),
  contextSchema: signalsToolContextSchema,
  execute: async (_input, { context }) => loadRecentBenefitVisits(context),
})

function suggestionOptions(
  context: {
    mentionedBenefitIds: string[]
    mentionedMerchants: string[]
    repeatSuggestions: boolean
  },
  recent: { visitedBenefitIds: string[]; visitedMerchantNames: string[] },
) {
  return {
    visitedBenefitIds: recent.visitedBenefitIds,
    visitedMerchants: recent.visitedMerchantNames,
    mentionedBenefitIds: context.mentionedBenefitIds,
    mentionedMerchants: context.mentionedMerchants,
    repeatSuggestions: context.repeatSuggestions,
  }
}

export const suggestNextBenefits = tool({
  description:
    'C2: sugiere hasta 3 beneficios vigentes. La primera vez en el chat, benefits_visited_last_1h y merchants_visited_last_1h eligen lo que sigue a cada beneficio o comercio visitado. Si el cliente ya pidió sugerencias, devuelve otros 3 al azar y omite beneficios y comercios ya mencionados. Cita solo este resultado. Nunca sugieras un beneficio que el cliente no tenga.',
  inputSchema: z.object({}),
  contextSchema: signalsToolContextSchema,
  execute: async (_input, { context }) => {
    const recent = await loadRecentBenefitVisits(context)
    const ranked = rankNextBenefits(
      context.customerId,
      recent.visits,
      recent.categoriesViewed,
      suggestionOptions(context, recent),
    )
    return {
      source: recent.source,
      visited: recent.visits.map((visit) => ({
        id: visit.id,
        merchant: visit.merchant,
        category: visit.category,
        entitled: visit.entitled,
      })),
      ...ranked,
    }
  },
})

export const suggestNextMerchants = tool({
  description:
    'C2: sugiere hasta 3 comercios vigentes. La primera vez en el chat, benefits_visited_last_1h y merchants_visited_last_1h eligen el comercio que sigue a cada beneficio o comercio visitado. Si el cliente ya pidió sugerencias, devuelve otros 3 al azar y omite beneficios y comercios ya mencionados en el chat. Cita solo merchants. No inventes marcas.',
  inputSchema: z.object({}),
  contextSchema: signalsToolContextSchema,
  execute: async (_input, { context }) => {
    const recent = await loadRecentBenefitVisits(context)
    const ranked = rankNextBenefits(
      context.customerId,
      recent.visits,
      recent.categoriesViewed,
      suggestionOptions(context, recent),
    )
    return {
      source: recent.source,
      ranking: ranked.ranking,
      signalsUsed: ranked.signalsUsed,
      alreadyMentionedMerchants: ranked.alreadyMentionedMerchants,
      visitedMerchants: ranked.visitedMerchants,
      merchants: ranked.merchants,
      categoryGaps: ranked.categoryGaps,
      ...(ranked.note ? { note: ranked.note } : {}),
    }
  },
})

export const benefitsTools = {
  listMyBenefits,
  getBenefitDetails,
  rankMentionedBenefits,
  getRecentBenefitVisits,
  suggestNextBenefits,
  suggestNextMerchants,
}
