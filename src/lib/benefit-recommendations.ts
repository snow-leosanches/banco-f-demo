import { type VisitedBenefit } from '@/lib/benefit-visits'
import {
  banditTop3ByCustomer,
  formatBenefitOffer,
  recurringMerchantsByCustomer,
  type Benefit,
  type BenefitCategory,
} from '@/lib/config'
import { getEntitledBenefits } from '@/lib/customer-benefits'

const MAX_SUGGESTIONS = 3

export type NextBenefitSuggestion = {
  id: string
  merchant: string
  category: BenefitCategory
  offer: string
  reason: string
}

export type NextMerchantSuggestion = {
  merchant: string
  category: BenefitCategory
  offer: string
  benefitIds: string[]
  reason: string
}

export type NextBenefitSuggestions = {
  suggestions: NextBenefitSuggestion[]
  merchants: NextMerchantSuggestion[]
  visitedCategories: string[]
  visitedMerchants: string[]
  unusedEntitlements: number
  unusedMerchants: number
  categoryGaps: string[]
  note?: string
}

function scoreBenefit(
  benefit: Benefit,
  visited: VisitedBenefit[],
  visitedCategories: Set<string>,
  bandit: string[],
): number {
  let score = 0
  if (visitedCategories.has(benefit.category)) score += 4
  if (visited.some((item) => item.category === benefit.category && item.id !== benefit.id)) score += 1
  if (bandit.includes(benefit.id)) score += 2
  score += Math.min(3, Math.round(benefit.discountPct / 15))
  return score
}

function reasonFor(benefit: Benefit, visits: VisitedBenefit[], visitedCategories: Set<string>, bandit: string[]): string {
  const matchingVisit = visits.find((item) => item.category === benefit.category)
  if (matchingVisit) {
    return `Coincide con ${benefit.category}, que miraste recién (${matchingVisit.merchant}). Lo tienes vigente y aún no lo abriste.`
  }
  if (visitedCategories.has(benefit.category)) {
    return `Coincide con ${benefit.category}, que filtraste recién. Lo tienes vigente y aún no lo abriste.`
  }
  if (bandit.includes(benefit.id)) {
    return 'Está entre tus beneficios más relevantes y aún no lo abriste en esta visita.'
  }
  return 'Lo tienes vigente este mes y aún no lo abriste.'
}

function isNamedMerchant(merchant: string, category: string) {
  const name = merchant.trim()
  if (name.length < 2) return false
  if (name.toLowerCase() === category.toLowerCase()) return false
  if (/^(beneficio|beneficios|restaurante)\b/i.test(name)) return false
  if (/^(salud y bienestar|planes seleccionados|paga con tus fpuntos)$/i.test(name)) return false
  return true
}

function bestOffer(benefits: Benefit[]): Benefit {
  return [...benefits].sort((a, b) => b.discountPct - a.discountPct || a.merchant.localeCompare(b.merchant))[0]
}

function scoreMerchant(
  group: Benefit[],
  visits: VisitedBenefit[],
  visitedCategories: Set<string>,
  bandit: string[],
  recurringIds: string[],
): number {
  let score = 0
  const categories = new Set(group.map((item) => item.category))
  if ([...categories].some((category) => visitedCategories.has(category))) score += 4
  if (visits.some((item) => categories.has(item.category) && !group.some((benefit) => benefit.merchant === item.merchant))) {
    score += 1
  }
  if (group.some((item) => bandit.includes(item.id))) score += 2
  if (group.some((item) => recurringIds.includes(item.id))) score += 2
  score += Math.min(3, Math.round(bestOffer(group).discountPct / 15))
  return score
}

function reasonForMerchant(
  group: Benefit[],
  visits: VisitedBenefit[],
  visitedCategories: Set<string>,
  bandit: string[],
  recurringIds: string[],
): string {
  const matchingVisit = visits.find((item) => group.some((benefit) => benefit.category === item.category))
  if (matchingVisit) {
    return `Coincide con ${matchingVisit.category}, que miraste recién (${matchingVisit.merchant}). Tienes un descuento vigente en este comercio y aún no lo abriste.`
  }
  if (group.some((item) => visitedCategories.has(item.category))) {
    return `Coincide con una categoría que filtraste recién. Tienes un descuento vigente en este comercio.`
  }
  if (group.some((item) => recurringIds.includes(item.id))) {
    return 'Es un comercio donde sueles comprar y aún no lo abriste en esta visita.'
  }
  if (group.some((item) => bandit.includes(item.id))) {
    return 'Está entre tus comercios más relevantes y aún no lo abriste en esta visita.'
  }
  return 'Tienes un beneficio vigente en este comercio y aún no lo abriste.'
}

function rankUnusedMerchants(
  unused: Benefit[],
  visits: VisitedBenefit[],
  visitedCategories: Set<string>,
  bandit: string[],
  recurringIds: string[],
): { merchants: NextMerchantSuggestion[]; unusedCount: number } {
  const visitedMerchants = new Set(visits.map((item) => item.merchant.trim().toLowerCase()))
  const groups = new Map<string, Benefit[]>()

  for (const benefit of unused) {
    if (!isNamedMerchant(benefit.merchant, benefit.category)) continue
    if (visitedMerchants.has(benefit.merchant.trim().toLowerCase())) continue
    const list = groups.get(benefit.merchant) ?? []
    list.push(benefit)
    groups.set(benefit.merchant, list)
  }

  const merchants = [...groups.entries()]
    .map(([merchant, group]) => {
      const top = bestOffer(group)
      return {
        merchant,
        category: top.category,
        offer: formatBenefitOffer(top),
        benefitIds: group.map((item) => item.id),
        reason: reasonForMerchant(group, visits, visitedCategories, bandit, recurringIds),
        score: scoreMerchant(group, visits, visitedCategories, bandit, recurringIds),
      }
    })
    .sort((a, b) => b.score - a.score || a.merchant.localeCompare(b.merchant))
    .slice(0, MAX_SUGGESTIONS)
    .map(({ score: _score, ...rest }) => rest)

  return { merchants, unusedCount: groups.size }
}

export function suggestNextBenefits(
  customerId: string,
  visits: VisitedBenefit[],
  categoriesViewed: string[],
): NextBenefitSuggestions {
  const entitled = getEntitledBenefits(customerId)
  const visitedIds = new Set(visits.map((item) => item.id))
  const visitedCategories = new Set<string>([...visits.map((item) => item.category), ...categoriesViewed])
  const visitedMerchants = [...new Set(visits.map((item) => item.merchant))]
  const bandit = banditTop3ByCustomer[customerId] ?? []
  const recurringIds = recurringMerchantsByCustomer[customerId] ?? []
  const unused = entitled.filter((benefit) => !visitedIds.has(benefit.id))
  const categoryGaps = [...visitedCategories].filter((category) => !entitled.some((benefit) => benefit.category === category))

  const ranked = unused
    .map((benefit) => ({
      id: benefit.id,
      merchant: benefit.merchant,
      category: benefit.category,
      offer: formatBenefitOffer(benefit),
      reason: reasonFor(benefit, visits, visitedCategories, bandit),
      score: scoreBenefit(benefit, visits, visitedCategories, bandit),
    }))
    .sort((a, b) => b.score - a.score || a.merchant.localeCompare(b.merchant))

  const suggestions = ranked.slice(0, MAX_SUGGESTIONS).map(({ score: _score, ...rest }) => rest)
  const { merchants, unusedCount: unusedMerchants } = rankUnusedMerchants(
    unused,
    visits,
    visitedCategories,
    bandit,
    recurringIds,
  )

  const notes: string[] = []
  if (visits.length === 0 && categoriesViewed.length === 0) {
    notes.push('No hay visitas recientes. Sugiere beneficios y comercios vigentes, priorizando los más relevantes del cliente.')
  }
  if (categoryGaps.length > 0) {
    notes.push(
      `El cliente miró ${categoryGaps.join(', ')} pero no tiene beneficios vigentes en esa categoría. No ofrezcas el catálogo general. Si pregunta por viajes, menciona que puede pedir una CMR.`,
    )
  }
  if (suggestions.length === 0) {
    notes.push(
      entitled.length === 0
        ? 'El cliente no tiene beneficios vigentes. No inventes descuentos ni comercios.'
        : 'El cliente ya abrió todos sus beneficios vigentes. Recapitula los que tiene; no ofrezcas otros del catálogo.',
    )
  }

  return {
    suggestions,
    merchants,
    visitedCategories: [...visitedCategories],
    visitedMerchants,
    unusedEntitlements: unused.length,
    unusedMerchants,
    categoryGaps,
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
  }
}
