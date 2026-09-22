import { experimental_evaluate as evaluate } from 'ai'

import {
  CONFIDENCE_FLOOR,
  INTENT_GUESSES,
  INTENT_LABELS,
  PROBABILITY_FLOOR,
  sensitivityLabel,
  type IntentClass,
  type JevTriage,
} from '@/lib/jev-decision'

export type { IntentClass, JevTriage } from '@/lib/jev-decision'
export { jevSystemNote } from '@/lib/jev-decision'

function readTypesafeConfidence(metadata: { typesafe?: unknown } | undefined, questionId: string): number | null {
  const typesafe = metadata?.typesafe
  if (!typesafe || typeof typesafe !== 'object') return null
  const confidence = (typesafe as { confidence?: unknown }).confidence
  if (!confidence || typeof confidence !== 'object' || Array.isArray(confidence)) return null
  const value = (confidence as Record<string, unknown>)[questionId]
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export async function triageQuestion(message: string, abortSignal?: AbortSignal): Promise<JevTriage> {
  const result = await evaluate({
    model: 'typesafe-ai/jev',
    state: { message },
    abortSignal,
    providerOptions: {
      gateway: { zeroDataRetention: true },
    },
    questions: {
      intent: {
        type: 'choice',
        instructions: 'Classify this Banco Falabella assistant question into exactly one class.',
        criteria: {
          c0: 'Asks what a product or concept is (fondo mutuo, CMR, Fpuntos, cuenta, depósito a plazo, crédito). Informational, not about their own products.',
          c1: 'Asks where to find a screen in this web demo (beneficios, cuenta, chat, login). Navigation, not a list of their benefits.',
          c2: 'Asks about their benefits, discounts they already have, recent benefit or merchant visits, what to look at next, or which merchants suit them.',
          c3: 'Asks why they saved less this month, or about balances, spending, salary, or a change in how a benefit is applied.',
        },
      },
      needsPersonalData: {
        type: 'boolean',
        instructions: 'Does a correct answer require this customer’s own balances, entitlements, visits, or spending?',
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
    label: INTENT_LABELS[intent.choice],
    intentGuess: INTENT_GUESSES[intent.choice],
    intentProbability,
    probabilities: intent.probabilities ?? null,
    confidence,
    needsPersonalData: needsPersonalData.probability,
    sensitivity: sensitivity.score,
    sensitivityLabel: sensitivityLabel(sensitivity.score),
    routed,
  }
}
