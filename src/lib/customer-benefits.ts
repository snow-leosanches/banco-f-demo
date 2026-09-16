import { benefits, getBenefitById, type Benefit, type BenefitCategory } from './config'
import { CAMILA_USER_ID, DIEGO_USER_ID, VALENTINA_USER_ID } from './user-id'

/**
 * Hardcoded entitlements for the three demo logins. The marketing catalog
 * (`benefits`) stays complete so browsing still generates Signals events;
 * the agent only sees this slice via tools.
 *
 * Diego (CMR Verde) — fewest. No Viajes, so travel browsing cannot produce
 * a TurBus recommendation from the agent.
 * Camila (CMR Lover) — the deck's example: Bandit top-3 + Shell/Tottus.
 * Valentina (CMR Elite) — full catalog.
 * Anyone else (guest, manual, random) — same as Diego.
 */
const DIEGO_BENEFIT_IDS = ['copec', 'burger-king', 'tottus'] as const
const CAMILA_BENEFIT_IDS = ['turbus', 'lipigas', 'dunkin', 'shell', 'tottus'] as const

const IDS_BY_CUSTOMER: Record<string, readonly string[]> = {
  [DIEGO_USER_ID]: DIEGO_BENEFIT_IDS,
  [CAMILA_USER_ID]: CAMILA_BENEFIT_IDS,
  [VALENTINA_USER_ID]: benefits.map((b) => b.id),
}

function idsFor(customerId: string): readonly string[] {
  return IDS_BY_CUSTOMER[customerId] ?? DIEGO_BENEFIT_IDS
}

export function getEntitledBenefits(customerId: string, category?: BenefitCategory): Benefit[] {
  const entitled = idsFor(customerId)
    .map((id) => getBenefitById(id))
    .filter((b): b is Benefit => b != null)
  return category ? entitled.filter((b) => b.category === category) : entitled
}

export function getEntitledBenefit(customerId: string, benefitId: string): Benefit | undefined {
  if (!idsFor(customerId).includes(benefitId)) return undefined
  return getBenefitById(benefitId)
}
