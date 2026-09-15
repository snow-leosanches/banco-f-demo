import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const UTM_PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'msclkid',
  'dclid',
] as const

export function buildUrlWithUtm(
  baseUrl: string,
  utmOptions: { sources: string[]; campaigns: string[] },
): string {
  const url = new URL(baseUrl)

  UTM_PARAM_KEYS.forEach((key) => url.searchParams.delete(key))

  const source = pickRandom(utmOptions.sources)
  const medium = pickRandom(['cpc', 'social', 'email', 'referral', 'organic'])
  const campaign = pickRandom(utmOptions.campaigns)

  url.searchParams.set('utm_source', source)
  url.searchParams.set('utm_medium', medium)
  url.searchParams.set('utm_campaign', campaign)

  return url.toString()
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
