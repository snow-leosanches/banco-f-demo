import { benefits } from '@/lib/config'

export type ChatTurn = {
  role: 'user' | 'assistant'
  content: string
}

/** Letters and digits only, so "Tur Bus", "TurBus", and "turbus" match. */
export function merchantKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')
}

const SUGGESTION_ASK =
  /comerci|merchant|marcas?\b|brands?\b|conviene|recommend|recomiend|suit me|sugerenc|suggestions?|\bm[aá]s\b|\bmore\b|another|otros?\b|otras?\b|what else|look at next|mirar despu[eé]s|siguientes|diferent|otra vez|de nuevo|\bagain\b/i

function tokens(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
}

function textMentions(text: string, phrase: string): boolean {
  const needle = merchantKey(phrase)
  if (needle.length < 4) return false
  const parts = tokens(text)
  for (let start = 0; start < parts.length; start++) {
    let acc = ''
    for (
      let index = start;
      index < Math.min(parts.length, start + 6);
      index++
    ) {
      acc += parts[index]
      if (acc === needle) return true
      if (acc.length > needle.length) break
    }
  }
  return false
}

export function isSuggestionAsk(message: string): boolean {
  return SUGGESTION_ASK.test(message)
}

/** True when this message asks for suggestions and an earlier user turn already did. */
export function isRepeatSuggestion(
  history: ChatTurn[],
  message: string,
): boolean {
  if (!isSuggestionAsk(message)) return false
  return history.some(
    (turn) => turn.role === 'user' && isSuggestionAsk(turn.content),
  )
}

/**
 * Catalog benefits and merchants named anywhere in the chat so far.
 * Naming a merchant also blocks every benefit of that merchant.
 */
export function mentionsFromHistory(history: ChatTurn[]): {
  benefitIds: string[]
  merchants: string[]
} {
  const text = history.map((turn) => turn.content).join('\n')
  const merchants = new Set<string>()
  const benefitIds = new Set<string>()

  for (const benefit of benefits) {
    const namedMerchant = textMentions(text, benefit.merchant)
    const namedId = benefit.id.length >= 6 && textMentions(text, benefit.id)
    if (!namedMerchant && !namedId) continue
    merchants.add(benefit.merchant)
    if (namedMerchant) {
      for (const sibling of benefits) {
        if (merchantKey(sibling.merchant) === merchantKey(benefit.merchant))
          benefitIds.add(sibling.id)
      }
    }
    if (namedId) benefitIds.add(benefit.id)
  }

  return { benefitIds: [...benefitIds], merchants: [...merchants] }
}
