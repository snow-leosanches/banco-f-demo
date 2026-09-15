import type { ReactNode } from 'react'

import { initializeSnowplow } from '../lib/snowplow-config'
import { useSnowplowTracking } from '../hooks/use-snowplow-tracking'
import { UserProvider } from '../contexts/user-context'

/**
 * Tracker provider. Mandatory nesting order:
 *
 *   <SnowplowInit>       // initializes tracker, tracks page views via hook
 *     <UserProvider>     // manages login state, calls setUserId()
 *       {children}
 *     </UserProvider>
 *   </SnowplowInit>
 *
 * `initializeSnowplow()` is called directly in the render body (guarded by
 * `typeof window` and an internal `isInitialized` flag), NOT inside a
 * `useEffect`. This is deliberate: React fires child effects before parent
 * effects on mount, so if tracker init lived in this component's own effect,
 * `UserProvider`'s child effect (which calls `setUserId()` to restore a saved
 * session) could run first and fire before the tracker exists. Calling the
 * (idempotent) init function during render guarantees the tracker is ready
 * before any descendant effect — including `UserProvider`'s — ever runs.
 */
export function SnowplowInit({ children }: { children: ReactNode }) {
  if (typeof window !== 'undefined') {
    initializeSnowplow()
  }

  useSnowplowTracking()

  return <UserProvider>{children}</UserProvider>
}
