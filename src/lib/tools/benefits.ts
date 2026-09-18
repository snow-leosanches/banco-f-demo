import { tool } from 'ai'
import { z } from 'zod'

import { type Benefit } from '@/lib/config'
import { getEntitledBenefit, getEntitledBenefits } from '@/lib/customer-benefits'
import { customerContextSchema } from '@/lib/tools/customer-context'

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
    'Lista los beneficios CMR vigentes de ESTE cliente este mes. Llámalas siempre antes de recomendar. No uses un catálogo general: cada login tiene un subconjunto distinto.',
  inputSchema: z.object({
    category: z.enum(categories).optional().describe('Filtra por categoría si el cliente preguntó por una sola'),
  }),
  contextSchema: customerContextSchema,
  execute: async ({ category }, { context }) => {
    const entitled = getEntitledBenefits(context.customerId, category)
    return {
      count: entitled.length,
      benefits: entitled.map(summarize),
      ...(entitled.length === 0
        ? { note: category ? `El cliente no tiene beneficios vigentes en ${category} este mes.` : 'El cliente no tiene beneficios vigentes este mes.' }
        : {}),
    }
  },
})

export const getBenefitDetails = tool({
  description:
    'Devuelve el detalle y las condiciones de un beneficio SOLO si está vigente para este cliente. Usa el id devuelto por listMyBenefits (ej. turbus, shell).',
  inputSchema: z.object({
    benefitId: z.string().describe('Id del beneficio, por ejemplo turbus o dunkin'),
  }),
  contextSchema: customerContextSchema,
  execute: async ({ benefitId }, { context }) => {
    const benefit = getEntitledBenefit(context.customerId, benefitId)
    if (!benefit) {
      return {
        found: false,
        benefitId,
        note: 'Este beneficio no está vigente para el cliente. No lo ofrezcas.',
      }
    }
    return { found: true, benefit: summarize(benefit) }
  },
})

export const benefitsTools = {
  listMyBenefits,
  getBenefitDetails,
}
