import { useEffect, useRef } from 'react'
import { useRouterState } from '@tanstack/react-router'

import { trackPageViewEvent } from '../lib/snowplow-config'

export function useSnowplowTracking(): void {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const lastPathnameRef = useRef<string | null>(null)
  const isInitialMount = useRef(true)

  useEffect(() => {
    if (!isInitialMount.current && lastPathnameRef.current === pathname) return

    isInitialMount.current = false
    lastPathnameRef.current = pathname
    trackPageViewEvent()
  }, [pathname])
}
