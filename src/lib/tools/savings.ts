import { tool } from 'ai'
import { z } from 'zod'

import { getSavingsSnapshot } from '@/lib/customer-savings'
import { customerContextSchema } from '@/lib/tools/customer-context'

export const getMonthlyBalances = tool({
  description:
    'Saldos, sueldo y ahorro neto de los últimos 3 meses (julio–septiembre 2026). Úsala para "por qué ahorro menos" y para citar montos. No inventes cifras.',
  inputSchema: z.object({}),
  contextSchema: customerContextSchema,
  execute: async (_input, { context }) => {
    const snapshot = getSavingsSnapshot(context.customerId)
    return {
      window: snapshot.window,
      months: snapshot.months,
    }
  },
})

export const getSpendingBreakdown = tool({
  description:
    'Gasto de este mes vs el mes anterior, por categoría. Úsala para ver si el cliente está gastando más.',
  inputSchema: z.object({}),
  contextSchema: customerContextSchema,
  execute: async (_input, { context }) => {
    const snapshot = getSavingsSnapshot(context.customerId)
    return snapshot.spending
  },
})

export const getBenefitOptionHistory = tool({
  description:
    'Cambios de opción de beneficios que el propio cliente hizo en la app (no campañas del banco). Úsala para ver si un cambio de preferencia explica menos ahorro en efectivo.',
  inputSchema: z.object({}),
  contextSchema: customerContextSchema,
  execute: async (_input, { context }) => {
    const snapshot = getSavingsSnapshot(context.customerId)
    return {
      changes: snapshot.benefitOptionChanges,
      ...(snapshot.benefitOptionChanges.length === 0
        ? { note: 'El cliente no cambió opciones de beneficios en esta ventana.' }
        : {}),
    }
  },
})

export const savingsTools = {
  getMonthlyBalances,
  getSpendingBreakdown,
  getBenefitOptionHistory,
}
