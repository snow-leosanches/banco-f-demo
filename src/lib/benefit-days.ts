import type { Benefit } from '@/lib/config'

const WEEKDAYS = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const

export type Weekday = (typeof WEEKDAYS)[number]

const ABBREVIATIONS: Record<string, Weekday> = {
  lu: 'lunes',
  ma: 'martes',
  mi: 'miercoles',
  ju: 'jueves',
  vi: 'viernes',
  sa: 'sabado',
  do: 'domingo',
}

const DAY = WEEKDAYS.join('|')
const RANGE = new RegExp(`\\b(${DAY}) a (${DAY})\\b`, 'g')
const SINGLE = new RegExp(`\\b(${DAY})\\b`, 'g')
const ABBREVIATED = /\b(lu|ma|mi|ju|vi|sa|do)(-(lu|ma|mi|ju|vi|sa|do))+\b/g

function normalize(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

/**
 * Weekdays a benefit applies on, read from its description and terms.
 * Null when the catalog doesn't say (or only says a scraped "Hoy"/"Mañana").
 */
export function benefitDays(benefit: Benefit): Weekday[] | null {
  const text = normalize(`${benefit.description} ${benefit.terms}`)
  if (/todos los dias/.test(text)) return [...WEEKDAYS]

  const days = new Set<Weekday>()
  for (const [, from, to] of text.matchAll(RANGE)) {
    const start = WEEKDAYS.indexOf(from as Weekday)
    const end = WEEKDAYS.indexOf(to as Weekday)
    for (let i = start; i !== (end + 1) % 7; i = (i + 1) % 7) {
      days.add(WEEKDAYS[i])
    }
  }
  for (const [day] of text.matchAll(SINGLE)) days.add(day as Weekday)
  for (const [group] of text.matchAll(ABBREVIATED)) {
    for (const part of group.split('-')) days.add(ABBREVIATIONS[part])
  }

  if (days.size === 0) return null
  return WEEKDAYS.filter((day) => days.has(day))
}

/** Today's weekday in Chile, where every benefit is redeemed. */
export function chileWeekday(now: Date = new Date()): Weekday {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Santiago',
    weekday: 'short',
  }).format(now)
  return WEEKDAYS[
    ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(short)
  ]
}

export function benefitSchedule(benefit: Benefit, now: Date = new Date()) {
  const days = benefitDays(benefit)
  const today = chileWeekday(now)
  return {
    days,
    today,
    appliesToday: days == null ? null : days.includes(today),
  }
}

const TODAY_RANK = { true: 0, null: 1, false: 2 } as const

/**
 * Best first: applies today, then no day limit, then another day; ties go to
 * the bigger discount. One entry per merchant.
 */
export function rankForToday(benefits: Benefit[], now: Date = new Date()) {
  const ranked = benefits
    .map((benefit) => ({ benefit, schedule: benefitSchedule(benefit, now) }))
    .sort(
      (a, b) =>
        TODAY_RANK[`${a.schedule.appliesToday}`] -
          TODAY_RANK[`${b.schedule.appliesToday}`] ||
        b.benefit.discountPct - a.benefit.discountPct,
    )
  const seen = new Set<string>()
  return ranked.filter(({ benefit }) => {
    if (seen.has(benefit.merchant)) return false
    seen.add(benefit.merchant)
    return true
  })
}
