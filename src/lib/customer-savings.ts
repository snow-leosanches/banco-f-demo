import { CAMILA_USER_ID, DIEGO_USER_ID, VALENTINA_USER_ID } from './user-id'

export interface MonthlyBalance {
  month: string
  label: string
  salaryClp: number
  spendClp: number
  cashDiscountsClp: number
  netSavedClp: number
  closingBalanceClp: number
}

export interface SpendCategory {
  category: string
  thisMonthClp: number
  priorMonthClp: number
}

export interface BenefitOptionChange {
  date: string
  channel: 'app'
  initiatedBy: 'customer'
  from: string
  to: string
  cashEffect: string
}

export interface SavingsSnapshot {
  window: { from: string; to: string; asOf: string }
  months: MonthlyBalance[]
  spending: { categories: SpendCategory[]; thisMonthTotalClp: number; priorMonthTotalClp: number }
  benefitOptionChanges: BenefitOptionChange[]
}

/**
 * Mock PFM slice for C3 ("¿por qué ahorro menos este mes?").
 *
 * Diego — salary cut in September vs the prior two months.
 * Camila — same salary, much higher spend (viaje a la playa + asado).
 * Valentina — she switched her CMR benefit option from cash discount to Fpuntos.
 * Anyone else — Diego's snapshot.
 */
const WINDOW = { from: '2026-07-01', to: '2026-09-16', asOf: '2026-09-16' } as const

const DIEGO: SavingsSnapshot = {
  window: WINDOW,
  months: [
    { month: '2026-07', label: 'julio 2026', salaryClp: 920000, spendClp: 710000, cashDiscountsClp: 0, netSavedClp: 210000, closingBalanceClp: 1680000 },
    { month: '2026-08', label: 'agosto 2026', salaryClp: 920000, spendClp: 725000, cashDiscountsClp: 0, netSavedClp: 195000, closingBalanceClp: 1875000 },
    { month: '2026-09', label: 'septiembre 2026 (al 16)', salaryClp: 680000, spendClp: 718000, cashDiscountsClp: 0, netSavedClp: -38000, closingBalanceClp: 1240500 },
  ],
  spending: {
    thisMonthTotalClp: 718000,
    priorMonthTotalClp: 725000,
    categories: [
      { category: 'Retail', thisMonthClp: 248000, priorMonthClp: 255000 },
      { category: 'Combustible', thisMonthClp: 142000, priorMonthClp: 138000 },
      { category: 'Restaurantes', thisMonthClp: 98000, priorMonthClp: 102000 },
      { category: 'Vivienda y cuentas', thisMonthClp: 230000, priorMonthClp: 230000 },
    ],
  },
  benefitOptionChanges: [],
}

const CAMILA: SavingsSnapshot = {
  window: WINDOW,
  months: [
    { month: '2026-07', label: 'julio 2026', salaryClp: 780000, spendClp: 612000, cashDiscountsClp: 0, netSavedClp: 168000, closingBalanceClp: 1512000 },
    { month: '2026-08', label: 'agosto 2026', salaryClp: 780000, spendClp: 628000, cashDiscountsClp: 0, netSavedClp: 152000, closingBalanceClp: 1664000 },
    { month: '2026-09', label: 'septiembre 2026 (al 16)', salaryClp: 780000, spendClp: 1048000, cashDiscountsClp: 0, netSavedClp: -268000, closingBalanceClp: 896000 },
  ],
  spending: {
    thisMonthTotalClp: 1048000,
    priorMonthTotalClp: 628000,
    categories: [
      { category: 'Viajes', thisMonthClp: 285000, priorMonthClp: 0 },
      { category: 'Restaurantes', thisMonthClp: 142000, priorMonthClp: 38000 },
      { category: 'Retail', thisMonthClp: 268000, priorMonthClp: 190000 },
      { category: 'Combustible', thisMonthClp: 89000, priorMonthClp: 67000 },
      { category: 'Vivienda y cuentas', thisMonthClp: 264000, priorMonthClp: 333000 },
    ],
  },
  benefitOptionChanges: [],
}

const VALENTINA: SavingsSnapshot = {
  window: WINDOW,
  months: [
    { month: '2026-07', label: 'julio 2026', salaryClp: 2400000, spendClp: 1550000, cashDiscountsClp: 380000, netSavedClp: 850000, closingBalanceClp: 6120000 },
    { month: '2026-08', label: 'agosto 2026', salaryClp: 2400000, spendClp: 1570000, cashDiscountsClp: 360000, netSavedClp: 830000, closingBalanceClp: 6950000 },
    { month: '2026-09', label: 'septiembre 2026 (al 16)', salaryClp: 2400000, spendClp: 1582000, cashDiscountsClp: 0, netSavedClp: 180000, closingBalanceClp: 7130000 },
  ],
  spending: {
    thisMonthTotalClp: 1582000,
    priorMonthTotalClp: 1570000,
    categories: [
      { category: 'Retail', thisMonthClp: 620000, priorMonthClp: 610000 },
      { category: 'Viajes', thisMonthClp: 180000, priorMonthClp: 175000 },
      { category: 'Restaurantes', thisMonthClp: 210000, priorMonthClp: 205000 },
      { category: 'Combustible', thisMonthClp: 72000, priorMonthClp: 70000 },
      { category: 'Vivienda y cuentas', thisMonthClp: 500000, priorMonthClp: 510000 },
    ],
  },
  benefitOptionChanges: [
    {
      date: '2026-09-04',
      channel: 'app',
      initiatedBy: 'customer',
      from: 'Descuento en efectivo en Falabella.com y Tottus (el ahorro baja la boleta y el saldo de la cuenta)',
      to: 'Acumular Fpuntos en lugar de descuento en efectivo',
      cashEffect:
        'Desde el 4 de septiembre el valor del beneficio ya no reduce el gasto en pesos. Este mes acumuló 18.400 Fpuntos; el ahorro en efectivo de la cuenta bajó aunque el gasto nominal es casi igual al de agosto.',
    },
  ],
}

const BY_CUSTOMER: Record<string, SavingsSnapshot> = {
  [DIEGO_USER_ID]: DIEGO,
  [CAMILA_USER_ID]: CAMILA,
  [VALENTINA_USER_ID]: VALENTINA,
}

export function getSavingsSnapshot(customerId: string): SavingsSnapshot {
  return BY_CUSTOMER[customerId] ?? DIEGO
}
