import { useCallback, useEffect, useState } from 'react'

import { isSignalsEnabled } from '@/lib/consent'
import { siteConfig } from '@/lib/config'
import { getSnowplowDomainUserId } from '@/lib/snowplow-config'
import { isGuid } from '@/lib/user-id'
import { useUser } from '@/contexts/user-context'
import {
  ANONYMOUS_ATTRIBUTE_GROUP,
  IDENTIFIED_ATTRIBUTE_GROUP,
  hasSessionBehavior,
  parseCustomerMemory,
  parseSessionBehavior,
  type CustomerMemoryAttributes,
  type SessionBehaviorAttributes,
} from '@/lib/signals-attributes'

async function fetchAttributeGroup(
  attributeKey: string,
  identifier: string,
  name: string,
  version: number,
  attributes: readonly string[],
): Promise<Record<string, unknown>> {
  const params = new URLSearchParams({
    attribute_key: attributeKey,
    identifier,
    name,
    version: String(version),
    attributes: attributes.join(','),
  })
  const res = await fetch(`/api/attribute-groups?${params.toString()}`)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message || `Signals request failed (${res.status})`)
  }
  const json = (await res.json()) as Record<string, unknown>
  return json.attributes && typeof json.attributes === 'object'
    ? (json.attributes as Record<string, unknown>)
    : json
}

export interface SignalsAttributesState {
  anonymous: SessionBehaviorAttributes | null
  identified: CustomerMemoryAttributes | null
  domainUserId: string | null
  customerId: string | null
  isIdentified: boolean
  isLoading: boolean
  error: string | null
}

export function useSignalsAttributes(options?: {
  enabled?: boolean
  refetchInterval?: number | false
}): SignalsAttributesState {
  const { user } = useUser()
  const customerId = user?.isLoggedIn ? (user.customerId ?? user.userId ?? null) : null
  const identifiedId = isGuid(customerId) ? customerId : null

  const [domainUserId, setDomainUserId] = useState<string | null>(null)
  const [signalsOn, setSignalsOn] = useState(() =>
    typeof window === 'undefined' ? true : isSignalsEnabled(),
  )
  const [anonymous, setAnonymous] = useState<SessionBehaviorAttributes | null>(null)
  const [identified, setIdentified] = useState<CustomerMemoryAttributes | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const featuresOn = signalsOn && siteConfig.features.signals
  const shouldFetch = (options?.enabled ?? true) && featuresOn

  useEffect(() => {
    setSignalsOn(isSignalsEnabled())
    setDomainUserId(getSnowplowDomainUserId())

    const onPreference = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled: boolean }>).detail?.enabled
      setSignalsOn(typeof enabled === 'boolean' ? enabled : isSignalsEnabled())
    }
    window.addEventListener('signalsPreferenceChanged', onPreference)

    const idTimer = window.setInterval(() => {
      const next = getSnowplowDomainUserId()
      if (next) {
        setDomainUserId(next)
        window.clearInterval(idTimer)
      }
    }, 750)

    return () => {
      window.removeEventListener('signalsPreferenceChanged', onPreference)
      window.clearInterval(idTimer)
    }
  }, [])

  const load = useCallback(async () => {
    if (!shouldFetch) return

    const fetchAnonymous = !!domainUserId
    const fetchIdentified = !!identifiedId
    if (!fetchAnonymous && !fetchIdentified) return

    setIsLoading(true)
    setError(null)
    try {
      const [anonRaw, identRaw] = await Promise.all([
        fetchAnonymous
          ? fetchAttributeGroup(
              ANONYMOUS_ATTRIBUTE_GROUP.attributeKey,
              domainUserId!,
              ANONYMOUS_ATTRIBUTE_GROUP.name,
              ANONYMOUS_ATTRIBUTE_GROUP.version,
              ANONYMOUS_ATTRIBUTE_GROUP.attributes,
            )
          : Promise.resolve({}),
        fetchIdentified
          ? fetchAttributeGroup(
              IDENTIFIED_ATTRIBUTE_GROUP.attributeKey,
              identifiedId!,
              IDENTIFIED_ATTRIBUTE_GROUP.name,
              IDENTIFIED_ATTRIBUTE_GROUP.version,
              IDENTIFIED_ATTRIBUTE_GROUP.attributes,
            )
          : Promise.resolve({}),
      ])
      const nextAnon = parseSessionBehavior(anonRaw)
      const nextIdent = parseCustomerMemory(identRaw)
      setAnonymous(hasSessionBehavior(nextAnon) || fetchAnonymous ? nextAnon : null)
      setIdentified(fetchIdentified ? nextIdent : null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [shouldFetch, domainUserId, identifiedId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    const interval = options?.refetchInterval
    if (!shouldFetch || !interval) return
    const timer = window.setInterval(() => {
      void load()
    }, interval)
    return () => window.clearInterval(timer)
  }, [load, options?.refetchInterval, shouldFetch])

  return {
    anonymous,
    identified,
    domainUserId,
    customerId: identifiedId,
    isIdentified: !!identifiedId,
    isLoading: shouldFetch && isLoading && !anonymous && !identified,
    error,
  }
}
