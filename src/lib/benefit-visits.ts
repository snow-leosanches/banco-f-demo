import { type ClientBehaviorSnapshot } from '@/lib/agent-prompt'
import { benefits, getBenefitById, type Benefit } from '@/lib/config'
import { getEntitledBenefit } from '@/lib/customer-benefits'
import {
  hasCustomerMemory,
  hasSessionBehavior,
  parseCustomerMemory,
  parseSessionBehavior,
} from '@/lib/signals-attributes'
import { getSignalsAttributeGroups } from '@/lib/signals-server'

export type VisitSource = 'signals' | 'local-fallback' | 'none'

export type VisitedBenefit = {
  id: string
  merchant: string
  category: Benefit['category']
  discountPct: number
  offerLabel?: string
  entitled: boolean
}

export type RecentBenefitVisits = {
  source: VisitSource
  visits: VisitedBenefit[]
  categoriesViewed: string[]
  lastMerchantViewed: string | null
  note?: string
}

function summarizeVisit(benefit: Benefit, customerId: string): VisitedBenefit {
  return {
    id: benefit.id,
    merchant: benefit.merchant,
    category: benefit.category,
    discountPct: benefit.discountPct,
    ...(benefit.offerLabel ? { offerLabel: benefit.offerLabel } : {}),
    entitled: getEntitledBenefit(customerId, benefit.id) != null,
  }
}

function isCatalogMerchant(merchant: string) {
  const needle = merchant.trim().toLowerCase()
  return needle !== '' && needle !== '(catálogo)'
}

function benefitsForMerchant(merchant: string): Benefit[] {
  if (!isCatalogMerchant(merchant)) return []
  const needle = merchant.trim().toLowerCase()
  return benefits.filter((b) => b.merchant.toLowerCase() === needle)
}

function resolveFromIdsAndMerchants(ids: string[], merchants: string[], customerId: string): VisitedBenefit[] {
  const seen = new Set<string>()
  const out: VisitedBenefit[] = []

  for (const id of ids) {
    const benefit = getBenefitById(id)
    if (!benefit || seen.has(benefit.id)) continue
    seen.add(benefit.id)
    out.push(summarizeVisit(benefit, customerId))
  }

  for (const merchant of merchants) {
    for (const benefit of benefitsForMerchant(merchant)) {
      if (seen.has(benefit.id)) continue
      seen.add(benefit.id)
      out.push(summarizeVisit(benefit, customerId))
    }
  }

  return out
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))]
}

function mergeVisits(primary: VisitedBenefit[], extra: VisitedBenefit[]): VisitedBenefit[] {
  const seen = new Set(primary.map((item) => item.id))
  const merged = [...primary]
  for (const item of extra) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    merged.push(item)
  }
  return merged
}

export async function loadRecentBenefitVisits(params: {
  customerId: string
  domainUserId: string | null
  signalsEnabled: boolean
  clientBehavior: ClientBehaviorSnapshot
}): Promise<RecentBenefitVisits> {
  if (!params.signalsEnabled) {
    return {
      source: 'none',
      visits: [],
      categoriesViewed: [],
      lastMerchantViewed: null,
      note: 'Signals está apagado. No uses comportamiento reciente para personalizar.',
    }
  }

  const groups = await getSignalsAttributeGroups({
    customerId: params.customerId,
    domainUserId: params.domainUserId,
  })
  const memory = groups.memory ? parseCustomerMemory(groups.memory) : null
  const visit = groups.visit ? parseSessionBehavior(groups.visit) : null

  const signalIds = hasCustomerMemory(memory) ? (memory?.benefits_visited_last_1h ?? []) : []
  const signalMerchants = [
    ...(hasCustomerMemory(memory) ? (memory?.merchants_visited_last_1h ?? []) : []),
    ...(hasSessionBehavior(visit) && visit?.last_merchant_viewed ? [visit.last_merchant_viewed] : []),
  ]
  const signalCategories = hasSessionBehavior(visit) ? (visit?.categories_viewed_last_30m ?? []) : []
  const local = params.clientBehavior
  const localVisits = resolveFromIdsAndMerchants(
    local.benefitsVisitedLast1h,
    [...local.merchantsVisitedLast1h, ...(local.lastMerchantViewed ? [local.lastMerchantViewed] : [])],
    params.customerId,
  )
  const fromSignals = resolveFromIdsAndMerchants(signalIds, signalMerchants, params.customerId)
  const visits = mergeVisits(fromSignals, localVisits)
  const categoriesViewed = uniqueStrings([...signalCategories, ...local.categoriesViewedLast30m])
  const lastMerchantViewed = visit?.last_merchant_viewed ?? local.lastMerchantViewed ?? visits.at(-1)?.merchant ?? null

  if (fromSignals.length > 0 || signalCategories.length > 0) {
    return {
      source: 'signals',
      visits,
      categoriesViewed,
      lastMerchantViewed,
      ...(localVisits.length > 0 && fromSignals.length < localVisits.length
        ? { note: 'Signals aún no trae todos los ids de esta visita; se unieron las páginas abiertas ahora.' }
        : {}),
    }
  }

  if (localVisits.length > 0 || local.categoriesViewedLast30m.length > 0) {
    return {
      source: 'local-fallback',
      visits: localVisits,
      categoriesViewed: local.categoriesViewedLast30m,
      lastMerchantViewed: local.lastMerchantViewed,
      note: 'Signals aún no tiene visitas; usa este fallback local de la visita actual. No inventes memoria de la última hora.',
    }
  }

  return {
    source: groups.reachedSignals ? 'signals' : 'none',
    visits: [],
    categoriesViewed: [],
    lastMerchantViewed: null,
    note: 'No hay visitas a beneficios todavía. No inventes comercios ni páginas vistas.',
  }
}
