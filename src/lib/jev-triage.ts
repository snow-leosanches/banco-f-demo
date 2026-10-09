import { experimental_evaluate as evaluate } from 'ai'

import type { Language } from '@/contexts/language-context'
import {
  CONFIDENCE_FLOOR,
  INTENT_GUESSES,
  INTENT_LABELS,
  PROBABILITY_FLOOR,
  sensitivityLabel,
  type IntentClass,
  type JevTriage,
} from '@/lib/jev-decision'

import type { ChatTurn } from '@/lib/chat-mentions'

export type { IntentClass, JevTriage } from '@/lib/jev-decision'
export { jevSystemNote } from '@/lib/jev-decision'

/** Last exchange only: enough to resolve "dame otras" without biasing new topics. */
const RECENT_TURNS = 2
const RECENT_TURN_MAX_CHARS = 600

function recentTurns(history: ChatTurn[]): ChatTurn[] {
  return history.slice(-RECENT_TURNS).map((turn) => ({
    role: turn.role,
    content: turn.content.slice(0, RECENT_TURN_MAX_CHARS),
  }))
}

function readTypesafeConfidence(
  metadata: { typesafe?: unknown } | undefined,
  questionId: string,
): number | null {
  const typesafe = metadata?.typesafe
  if (!typesafe || typeof typesafe !== 'object') return null
  const confidence = (typesafe as { confidence?: unknown }).confidence
  if (
    !confidence ||
    typeof confidence !== 'object' ||
    Array.isArray(confidence)
  )
    return null
  const value = (confidence as Record<string, unknown>)[questionId]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function triageQuestion(
  message: string,
  history: ChatTurn[] = [],
  language: Language = 'es',
  abortSignal?: AbortSignal,
): Promise<JevTriage> {
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    state: { message, recentTurns: recentTurns(history) },
    abortSignal,
    providerOptions: {
      gateway: { zeroDataRetention: true },
    },
    questions: {
      intent: {
        type: 'choice',
        instructions:
          'Classify `message`, the latest Banco Falabella assistant question, into exactly one class. `recentTurns` is the previous exchange: use it only to resolve a short follow-up ("more", "other ones", "and that one?") to the topic it continues. If `message` stands on its own, ignore `recentTurns`.',
        criteria: {
          c0: 'Asks what a product or concept is (fondo mutuo, CMR, Fpuntos, cuenta, depósito a plazo, crédito). Informational, not about their own products.',
          c1: 'Asks where to find a screen in this web demo (beneficios, cuenta, chat, login). Navigation, not a list of their benefits.',
          c2: 'Asks about their benefits, discounts they already have, recent benefit or merchant visits, what to look at next, which merchants suit them, or for more, other, or different benefit or merchant suggestions.',
          c3: 'Asks why they saved less this month, or about balances, spending, salary, or a change in how a benefit is applied.',
        },
      },
      needsPersonalData: {
        type: 'boolean',
        instructions:
          'Does a correct answer require this customer’s own balances, entitlements, visits, or spending?',
        criteria: {
          true: 'The answer depends on this customer’s data.',
          false: 'A general definition or an in-app location is enough.',
        },
      },
      sensitivity: {
        type: 'score',
        instructions: 'How financially sensitive is the question?',
        criteria: [
          'General product education',
          'Finding a screen in the demo',
          'Personal benefits or merchant recommendations',
          'Balances, spending, or why savings changed',
        ],
      },
    },
  })

  const { intent, needsPersonalData, sensitivity } = result.answers
  const intentProbability = intent.probabilities?.[intent.choice] ?? null
  const confidence = readTypesafeConfidence(result.providerMetadata, 'intent')
  const routed =
    intentProbability != null &&
    intentProbability >= PROBABILITY_FLOOR &&
    confidence != null &&
    confidence >= CONFIDENCE_FLOOR

  return {
    intent: intent.choice satisfies IntentClass,
    label: INTENT_LABELS[language][intent.choice],
    intentGuess: INTENT_GUESSES[intent.choice],
    intentProbability,
    probabilities: intent.probabilities ?? null,
    confidence,
    needsPersonalData: needsPersonalData.probability,
    sensitivity: sensitivity.score,
    sensitivityLabel: sensitivityLabel(sensitivity.score, language),
    routed,
  }
}
