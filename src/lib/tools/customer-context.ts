import { z } from 'zod'

export const customerContextSchema = z.object({
  customerId: z.string(),
})

export type CustomerToolContext = { customerId: string }

export function customerToolsContext(customerId: string) {
  const context: CustomerToolContext = { customerId }
  return {
    listMyBenefits: context,
    getBenefitDetails: context,
    getMonthlyBalances: context,
    getSpendingBreakdown: context,
    getBenefitOptionHistory: context,
  }
}
