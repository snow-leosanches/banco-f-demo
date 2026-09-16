import { useEffect, useState } from 'react'

import {
  getInterventionTriggers,
  subscribeInterventionTriggers,
  type InterventionTrigger,
} from '@/lib/intervention-log'

export function useInterventionLog(): readonly InterventionTrigger[] {
  const [triggers, setTriggers] = useState<readonly InterventionTrigger[]>(getInterventionTriggers)

  useEffect(() => {
    return subscribeInterventionTriggers(() => {
      setTriggers(getInterventionTriggers())
    })
  }, [])

  return triggers
}
