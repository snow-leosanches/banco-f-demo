import { merchantKey } from '@/lib/chat-mentions'
import { type VisitedBenefit } from '@/lib/benefit-visits'
import {
  banditTop3ByCustomer,
  benefits as catalog,
  formatBenefitOffer,
  getBenefitById,
  recurringMerchantsByCustomer,
  type Benefit,
  type BenefitCategory,
} from '@/lib/config'
import { getEntitledBenefits } from '@/lib/customer-benefits'

const MAX_SUGGESTIONS = 3

export type SuggestionInfluence =
  | 'benefits_visited_last_1h'
  | 'merchants_visited_last_1h'
  | 'random'
  | 'default'

export type SuggestionOptions = {
  visitedBenefitIds: string[]
  visitedMerchants: string[]
  mentionedBenefitIds: string[]
  mentionedMerchants: string[]
  repeatSuggestions: boolean
  random?: () => number
}

export type NextBenefitSuggestion = {
  id: string
  merchant: string
  category: BenefitCategory
  offer: string
  reason: string
  influencedBy: SuggestionInfluence
}

export type NextMerchantSuggestion = {
  merchant: string
  category: BenefitCategory
  offer: string
  benefitIds: string[]
  reason: string
  influencedBy: SuggestionInfluence
}

export type SuggestionRanking = 'visits' | 'random' | 'default'

export type NextBenefitSuggestions = {
  suggestions: NextBenefitSuggestion[]
  merchants: NextMerchantSuggestion[]
  ranking: SuggestionRanking
  visitedCategories: string[]
  visitedMerchants: string[]
  unusedEntitlements: number
  unusedMerchants: number
  categoryGaps: string[]
  signalsUsed: {
    benefits_visited_last_1h: string[]
    merchants_visited_last_1h: string[]
  }
  alreadyMentionedBenefitIds: string[]
  alreadyMentionedMerchants: string[]
  note?: string
}

type MerchantPick = {
  merchant: string
  benefit: Benefit
  benefitIds: string[]
  influencedBy: SuggestionInfluence
  anchor: string
  reason: string
}

const EMPTY_OPTIONS: SuggestionOptions = {
  visitedBenefitIds: [],
  visitedMerchants: [],
  mentionedBenefitIds: [],
  mentionedMerchants: [],
  repeatSuggestions: false,
}

function isNamedMerchant(merchant: string, category: string) {
  const name = merchant.trim()
  if (name.length < 2) return false
  if (name.toLowerCase() === category.toLowerCase()) return false
  if (/^(beneficio|beneficios|restaurante)\b/i.test(name)) return false
  if (
    /^(salud y bienestar|planes seleccionados|paga con tus fpuntos)$/i.test(
      name,
    )
  )
    return false
  return true
}

function bestOffer(group: Benefit[]): Benefit {
  return [...group].sort(
    (a, b) =>
      b.discountPct - a.discountPct ||
      a.merchant.localeCompare(b.merchant, 'es'),
  )[0]
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
  if ([...categories].some((category) => visitedCategories.has(category)))
    score += 4
  if (
    visits.some(
      (item) =>
        categories.has(item.category) &&
        !group.some((benefit) => benefit.merchant === item.merchant),
    )
  ) {
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
  const matchingVisit = visits.find((item) =>
    group.some((benefit) => benefit.category === item.category),
  )
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

function sameMerchant(left: string, right: string) {
  return merchantKey(left) === merchantKey(right)
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items]
  for (let index = copy.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = copy[index]
    copy[index] = copy[swapIndex]
    copy[swapIndex] = current
  }
  return copy
}

function rotateAfter(names: string[], anchor: string): string[] {
  const index = names.findIndex((name) => sameMerchant(name, anchor))
  if (index === -1) return names
  return [...names.slice(index + 1), ...names.slice(0, index)]
}

function merchantNamesInCategory(
  entitled: Benefit[],
  category: BenefitCategory,
): string[] {
  const names = new Set<string>()
  for (const benefit of entitled) {
    if (benefit.category !== category) continue
    if (!isNamedMerchant(benefit.merchant, benefit.category)) continue
    names.add(benefit.merchant)
  }
  return [...names].sort((left, right) => left.localeCompare(right, 'es'))
}

function groupForMerchant(
  entitled: Benefit[],
  merchant: string,
  category: BenefitCategory,
): Benefit[] {
  return entitled.filter(
    (benefit) =>
      benefit.category === category &&
      sameMerchant(benefit.merchant, merchant) &&
      isNamedMerchant(benefit.merchant, benefit.category),
  )
}

function catalogAnchor(merchant: string): Benefit | undefined {
  const matches = catalog.filter(
    (benefit) =>
      sameMerchant(benefit.merchant, merchant) &&
      isNamedMerchant(benefit.merchant, benefit.category),
  )
  return matches.length > 0 ? bestOffer(matches) : undefined
}

function nextAfterMerchant(
  anchorMerchant: string,
  category: BenefitCategory,
  entitled: Benefit[],
  blockedMerchants: Set<string>,
  blockedBenefitIds: Set<string>,
  influencedBy: SuggestionInfluence,
): MerchantPick[] {
  const rotated = rotateAfter(
    merchantNamesInCategory(entitled, category),
    anchorMerchant,
  ).filter((name) => !blockedMerchants.has(merchantKey(name)))
  const picks: MerchantPick[] = []
  for (const name of rotated) {
    const group = groupForMerchant(entitled, name, category).filter(
      (benefit) => !blockedBenefitIds.has(benefit.id),
    )
    if (group.length === 0) continue
    const benefit = bestOffer(group)
    const pick = {
      merchant: benefit.merchant,
      benefit,
      benefitIds: group.map((item) => item.id),
      influencedBy,
      anchor: anchorMerchant,
      reason: '',
    }
    pick.reason = visitReason(pick)
    picks.push(pick)
  }
  return picks
}

function roundRobin(lists: MerchantPick[][], limit: number): MerchantPick[] {
  const out: MerchantPick[] = []
  const seen = new Set<string>()
  const max = lists.reduce((length, list) => Math.max(length, list.length), 0)
  for (let index = 0; index < max && out.length < limit; index++) {
    for (const list of lists) {
      const pick = list[index]
      if (!pick) continue
      const key = merchantKey(pick.merchant)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(pick)
      if (out.length === limit) return out
    }
  }
  return out
}

function interleave(
  left: MerchantPick[],
  right: MerchantPick[],
  limit: number,
): MerchantPick[] {
  const out: MerchantPick[] = []
  const seen = new Set<string>()
  const max = Math.max(left.length, right.length)
  for (let index = 0; index < max && out.length < limit; index++) {
    for (const list of [left, right]) {
      const pick = list[index]
      if (!pick) continue
      const key = merchantKey(pick.merchant)
      if (seen.has(key)) continue
      seen.add(key)
      out.push(pick)
      if (out.length === limit) return out
    }
  }
  return out
}

function visitReason(pick: MerchantPick): string {
  if (pick.influencedBy === 'benefits_visited_last_1h') {
    return `Sigue a ${pick.anchor}, un beneficio que visitaste en la última hora (benefits_visited_last_1h), en ${pick.benefit.category}. Aún no lo abriste.`
  }
  return `Va después de ${pick.anchor}, un comercio que visitaste en la última hora (merchants_visited_last_1h), en ${pick.benefit.category}. Aún no lo abriste.`
}

const RANDOM_REASON =
  'Otra opción vigente, en un orden al azar, que aún no mencionamos en este chat.'

function toBenefitSuggestion(pick: MerchantPick): NextBenefitSuggestion {
  return {
    id: pick.benefit.id,
    merchant: pick.merchant,
    category: pick.benefit.category,
    offer: formatBenefitOffer(pick.benefit),
    reason: pick.reason,
    influencedBy: pick.influencedBy,
  }
}

function toMerchantSuggestion(pick: MerchantPick): NextMerchantSuggestion {
  return {
    merchant: pick.merchant,
    category: pick.benefit.category,
    offer: formatBenefitOffer(pick.benefit),
    benefitIds: pick.benefitIds,
    reason: pick.reason,
    influencedBy: pick.influencedBy,
  }
}

function defaultMerchantPicks(
  available: Benefit[],
  visits: VisitedBenefit[],
  visitedCategories: Set<string>,
  bandit: string[],
  recurringIds: string[],
  skip: Set<string>,
): MerchantPick[] {
  const groups = new Map<string, Benefit[]>()
  for (const benefit of available) {
    if (!isNamedMerchant(benefit.merchant, benefit.category)) continue
    if (skip.has(merchantKey(benefit.merchant))) continue
    const list = groups.get(benefit.merchant) ?? []
    list.push(benefit)
    groups.set(benefit.merchant, list)
  }

  return [...groups.entries()]
    .map(([merchant, group]) => ({
      merchant,
      group,
      score: scoreMerchant(
        group,
        visits,
        visitedCategories,
        bandit,
        recurringIds,
      ),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        left.merchant.localeCompare(right.merchant, 'es'),
    )
    .map(({ merchant, group }) => {
      const benefit = bestOffer(group)
      return {
        merchant,
        benefit,
        benefitIds: group.map((item) => item.id),
        influencedBy: 'default' as const,
        anchor: '',
        reason: reasonForMerchant(
          group,
          visits,
          visitedCategories,
          bandit,
          recurringIds,
        ),
      }
    })
}

export function suggestNextBenefits(
  customerId: string,
  visits: VisitedBenefit[],
  categoriesViewed: string[],
  suggestionOptions?: SuggestionOptions,
): NextBenefitSuggestions {
  const options = suggestionOptions ?? EMPTY_OPTIONS
  const entitled = getEntitledBenefits(customerId)
  const visitedIds = new Set([
    ...visits.map((item) => item.id),
    ...options.visitedBenefitIds,
  ])
  const visitedCategories = new Set<string>([
    ...visits.map((item) => item.category),
    ...categoriesViewed,
  ])
  const visitedMerchants = [...new Set(visits.map((item) => item.merchant))]
  const bandit = banditTop3ByCustomer[customerId] ?? []
  const recurringIds = recurringMerchantsByCustomer[customerId] ?? []
  const categoryGaps = [...visitedCategories].filter(
    (category) => !entitled.some((benefit) => benefit.category === category),
  )

  const mentionedMerchantKeys = new Set(
    options.mentionedMerchants.map((merchant) => merchantKey(merchant)),
  )
  const visitedMerchantKeys = new Set<string>([
    ...visits.map((item) => merchantKey(item.merchant)),
    ...options.visitedMerchants.map((merchant) => merchantKey(merchant)),
    ...options.visitedBenefitIds
      .map((id) => getBenefitById(id)?.merchant)
      .filter((merchant): merchant is string => Boolean(merchant))
      .map((merchant) => merchantKey(merchant)),
  ])
  const blockedMerchants = new Set<string>([
    ...mentionedMerchantKeys,
    ...(options.repeatSuggestions ? [] : visitedMerchantKeys),
  ])
  const blockedBenefitIds = new Set<string>([
    ...options.mentionedBenefitIds,
    ...(options.repeatSuggestions ? [] : visitedIds),
  ])

  const available = entitled.filter(
    (benefit) =>
      !blockedBenefitIds.has(benefit.id) &&
      !blockedMerchants.has(merchantKey(benefit.merchant)),
  )

  let picks: MerchantPick[] = []
  let ranking: SuggestionRanking = 'default'

  if (options.repeatSuggestions) {
    const groups = new Map<string, Benefit[]>()
    for (const benefit of available) {
      if (!isNamedMerchant(benefit.merchant, benefit.category)) continue
      const list = groups.get(benefit.merchant) ?? []
      list.push(benefit)
      groups.set(benefit.merchant, list)
    }
    picks = shuffle([...groups.entries()], options.random ?? Math.random)
      .slice(0, MAX_SUGGESTIONS)
      .map(([merchant, group]) => {
        const benefit = bestOffer(group)
        return {
          merchant,
          benefit,
          benefitIds: group.map((item) => item.id),
          influencedBy: 'random' as const,
          anchor: '',
          reason: RANDOM_REASON,
        }
      })
    ranking = 'random'
  } else if (
    options.visitedBenefitIds.length > 0 ||
    options.visitedMerchants.length > 0
  ) {
    const fromBenefits = options.visitedBenefitIds.flatMap((id) => {
      const visited = getBenefitById(id)
      if (!visited || !isNamedMerchant(visited.merchant, visited.category))
        return []
      return [
        nextAfterMerchant(
          visited.merchant,
          visited.category,
          entitled,
          blockedMerchants,
          blockedBenefitIds,
          'benefits_visited_last_1h',
        ),
      ]
    })
    const fromMerchants = options.visitedMerchants.flatMap((merchant) => {
      const anchor = catalogAnchor(merchant)
      if (!anchor) return []
      return [
        nextAfterMerchant(
          anchor.merchant,
          anchor.category,
          entitled,
          blockedMerchants,
          blockedBenefitIds,
          'merchants_visited_last_1h',
        ),
      ]
    })
    const visitPicks = interleave(
      roundRobin(fromBenefits, MAX_SUGGESTIONS),
      roundRobin(fromMerchants, MAX_SUGGESTIONS),
      MAX_SUGGESTIONS,
    )
    const chosen = new Set(visitPicks.map((pick) => merchantKey(pick.merchant)))
    const fill = defaultMerchantPicks(
      available,
      visits,
      visitedCategories,
      bandit,
      recurringIds,
      chosen,
    )
    picks = [...visitPicks, ...fill].slice(0, MAX_SUGGESTIONS)
    ranking = visitPicks.length > 0 ? 'visits' : 'default'
  } else {
    picks = defaultMerchantPicks(
      available,
      visits,
      visitedCategories,
      bandit,
      recurringIds,
      new Set(),
    ).slice(0, MAX_SUGGESTIONS)
  }

  const suggestions = picks.map((pick) => toBenefitSuggestion(pick))
  const merchants = picks.map((pick) => toMerchantSuggestion(pick))
  const unused = entitled.filter(
    (benefit) =>
      !visitedIds.has(benefit.id) &&
      isNamedMerchant(benefit.merchant, benefit.category),
  )
  const unusedMerchantCount = new Set(
    unused.map((benefit) => merchantKey(benefit.merchant)),
  ).size

  const notes: string[] = []
  if (ranking === 'random') {
    notes.push(
      merchants.length > 0
        ? 'El cliente pidió más sugerencias. Este orden es aleatorio sobre los beneficios vigentes que aún no se mencionaron en el chat. No repitas un beneficio ni un comercio ya dicho.'
        : 'Ya se mencionaron todos los comercios vigentes en este chat. No inventes otros.',
    )
  } else if (ranking === 'visits') {
    notes.push(
      'El orden usa benefits_visited_last_1h y merchants_visited_last_1h: cada sugerencia sigue a un beneficio o comercio visitado. No ofrezcas lo que ya abrió ni lo ya dicho en el chat.',
    )
  } else if (
    options.visitedBenefitIds.length > 0 ||
    options.visitedMerchants.length > 0
  ) {
    notes.push(
      'Lo que visitó no tiene otro beneficio vigente al lado. Estas son otras opciones que sí tiene, sin repetir lo ya abierto ni lo ya dicho en el chat.',
    )
  } else if (visits.length === 0 && categoriesViewed.length === 0) {
    notes.push(
      'No hay visitas recientes. Sugiere beneficios y comercios vigentes, priorizando los más relevantes del cliente.',
    )
  }
  if (categoryGaps.length > 0) {
    notes.push(
      `El cliente miró ${categoryGaps.join(', ')} pero no tiene beneficios vigentes en esa categoría. No ofrezcas el catálogo general. Si pregunta por viajes, menciona que puede pedir una CMR.`,
    )
  }
  if (suggestions.length === 0 && ranking !== 'random') {
    notes.push(
      entitled.length === 0
        ? 'El cliente no tiene beneficios vigentes. No inventes descuentos ni comercios.'
        : 'El cliente ya abrió todos sus beneficios vigentes. Recapitula los que tiene; no ofrezcas otros del catálogo.',
    )
  }

  return {
    suggestions,
    merchants,
    ranking,
    visitedCategories: [...visitedCategories],
    visitedMerchants,
    unusedEntitlements: entitled.filter(
      (benefit) => !visitedIds.has(benefit.id),
    ).length,
    unusedMerchants: unusedMerchantCount,
    categoryGaps,
    signalsUsed: {
      benefits_visited_last_1h: options.visitedBenefitIds,
      merchants_visited_last_1h: options.visitedMerchants,
    },
    alreadyMentionedBenefitIds: options.mentionedBenefitIds,
    alreadyMentionedMerchants: options.mentionedMerchants,
    ...(notes.length > 0 ? { note: notes.join(' ') } : {}),
  }
}
