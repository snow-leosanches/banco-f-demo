/**
 * Session log of travel-nudge triggers for the presenter Signals panel.
 * Records both Signals API deliveries and the client-side fallback that
 * opens the orb when the plugin has not delivered yet.
 */
import { SIGNALS_INTERVENTION_NAME } from './signals-definitions'

export type InterventionTriggerSource = 'signals' | 'local-fallback'

export interface InterventionTrigger {
  name: string
  version: number
  source: InterventionTriggerSource
  receivedAt: number
  interventionId?: string
  targetKey?: string
  targetId?: string
  attributes?: Record<string, string | number | boolean>
}

type Listener = () => void

let triggers: InterventionTrigger[] = []
const listeners = new Set<Listener>()

function notify() {
  for (const listener of listeners) listener()
}

export function getInterventionTriggers(): readonly InterventionTrigger[] {
  return triggers
}

export function recordInterventionTrigger(
  trigger: Omit<InterventionTrigger, 'receivedAt'> & { receivedAt?: number },
): void {
  triggers = [
    ...triggers,
    {
      ...trigger,
      receivedAt: trigger.receivedAt ?? Date.now(),
    },
  ]
  notify()
}

export function clearInterventionTriggers(): void {
  if (triggers.length === 0) return
  triggers = []
  notify()
}

export function subscribeInterventionTriggers(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function flattenInterventionAttributes(
  attributes: Record<string, string | number | boolean | Array<string | number | boolean>> | undefined,
): Record<string, string | number | boolean> | undefined {
  if (!attributes) return undefined
  const next: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(attributes)) {
    if (Array.isArray(value)) {
      if (value.length === 1) next[key] = value[0]
      else next[key] = value.map(String).join(', ')
    } else {
      next[key] = value
    }
  }
  return Object.keys(next).length > 0 ? next : undefined
}

export function travelNudgeTriggers(
  all: readonly InterventionTrigger[] = triggers,
): InterventionTrigger[] {
  return all.filter((trigger) => trigger.name === SIGNALS_INTERVENTION_NAME)
}
