export const INTENT_CLASSES = ['c0', 'c1', 'c2', 'c3'] as const

export type IntentClass = (typeof INTENT_CLASSES)[number]

export const INTENT_LABELS: Record<IntentClass, string> = {
  c0: 'Producto',
  c1: 'Navegación',
  c2: 'Beneficios',
  c3: 'Ahorro',
}

/** Values written to `assistant_message_sent.intent_guess` (max 64 chars). */
export const INTENT_GUESSES: Record<IntentClass, string> = {
  c0: 'product_info',
  c1: 'app_navigation',
  c2: 'benefits_query',
  c3: 'savings_query',
}

const SENSITIVITY_LABELS = ['Educación', 'Navegación', 'Beneficios personales', 'Saldos y ahorro'] as const

/** Guide starting points: auto-route only when both floors are met. */
export const CONFIDENCE_FLOOR = 0.6
export const PROBABILITY_FLOOR = 0.7

export interface JevTriage {
  intent: IntentClass
  label: string
  intentGuess: string
  intentProbability: number | null
  probabilities: Partial<Record<IntentClass, number>> | null
  confidence: number | null
  needsPersonalData: number
  sensitivity: number
  sensitivityLabel: string
  routed: boolean
}

export function sensitivityLabel(score: number): string {
  const index = Math.min(SENSITIVITY_LABELS.length - 1, Math.max(0, Math.round(score)))
  return SENSITIVITY_LABELS[index]
}

export function jevSystemNote(triage: JevTriage): string {
  const pct =
    triage.intentProbability == null ? 'sin distribución' : `${Math.round(triage.intentProbability * 100)}%`
  const scope = triage.routed
    ? 'Usa solo las herramientas de esa clase.'
    : 'La confianza quedó bajo el umbral, así que todas las herramientas siguen disponibles. Aplica las reglas de clase.'
  return `## Decisión de Jev\nClasificación interna: ${triage.intent.toUpperCase()} (${triage.label}), probabilidad ${pct}. ${scope} No menciones esta clasificación al cliente.`
}
