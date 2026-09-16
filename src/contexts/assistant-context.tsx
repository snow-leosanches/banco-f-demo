import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { getDomainSessionId } from '@snowplow/browser-tracker'

import type { BenefitCategory } from '@/lib/config'
import { isSignalsEnabled } from '@/lib/consent'
import {
  clearInterventionTriggers,
  getInterventionTriggers,
  recordInterventionTrigger,
  subscribeInterventionTriggers,
} from '@/lib/intervention-log'
import { SIGNALS_INTERVENTION_NAME } from '@/lib/signals-definitions'
import { useUser } from '@/contexts/user-context'

const CTX_START = '__CTX__'
const CTX_END = '__ENDCTX__'

const TEN_MINUTES_MS = 10 * 60 * 1000
const THIRTY_MINUTES_MS = 30 * 60 * 1000
const TRAVEL_NUDGE_THRESHOLD = 3

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  contextSource?: 'signals' | 'local-fallback' | 'none'
  contextBlock?: string | null
}

interface BehaviorEvent {
  category: BenefitCategory
  merchant: string
  at: number
}

interface AssistantContextValue {
  isOpen: boolean
  toggleOpen: () => void
  openAssistant: () => void
  closeAssistant: () => void
  messages: ChatMessage[]
  isSending: boolean
  sendMessage: (text: string) => Promise<void>
  recordBenefitView: (category: BenefitCategory, merchant?: string) => void
  orbVisible: boolean
  dismissOrb: () => void
}

const AssistantContext = createContext<AssistantContextValue | null>(null)

export function AssistantProvider({ children }: { children: ReactNode }) {
  const { customer } = useUser()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isSending, setIsSending] = useState(false)
  const [orbVisible, setOrbVisible] = useState(false)

  const behaviorRef = useRef<BehaviorEvent[]>([])
  const orbShownRef = useRef(false)

  const customerId = customer?.customerId ?? null
  const maybeShowTravelOrb = useCallback(() => {
    if (!customerId || !isSignalsEnabled() || orbShownRef.current) return
    const recentTravel = behaviorRef.current.filter(
      (e) => e.category === 'Viajes' && Date.now() - e.at <= TEN_MINUTES_MS,
    )
    if (recentTravel.length >= TRAVEL_NUDGE_THRESHOLD) {
      orbShownRef.current = true
      setOrbVisible(true)
      recordInterventionTrigger({
        name: SIGNALS_INTERVENTION_NAME,
        version: 1,
        source: 'local-fallback',
      })
    }
  }, [customerId])

  const recordBenefitView = useCallback(
    (category: BenefitCategory, merchant: string = '(catálogo)') => {
      behaviorRef.current.push({ category, merchant, at: Date.now() })
      if (category === 'Viajes') maybeShowTravelOrb()
    },
    [maybeShowTravelOrb],
  )

  const lastCustomerIdRef = useRef<string | null>(null)
  useEffect(() => {
    const id = customerId
    if (id !== lastCustomerIdRef.current) {
      lastCustomerIdRef.current = id
      orbShownRef.current = false
      setOrbVisible(false)
      clearInterventionTriggers()
    }
    if (!customerId) return
    maybeShowTravelOrb()
  }, [customerId, maybeShowTravelOrb])

  useEffect(() => {
    return subscribeInterventionTriggers(() => {
      if (!customerId || !isSignalsEnabled() || orbShownRef.current) return
      const delivered = getInterventionTriggers().some(
        (trigger) => trigger.source === 'signals' && trigger.name === SIGNALS_INTERVENTION_NAME,
      )
      if (!delivered) return
      orbShownRef.current = true
      setOrbVisible(true)
    })
  }, [customerId])

  const dismissOrb = useCallback(() => setOrbVisible(false), [])

  const getClientBehaviorSnapshot = useCallback(() => {
    const now = Date.now()
    const last30m = behaviorRef.current.filter((e) => now - e.at <= THIRTY_MINUTES_MS)
    const last10m = behaviorRef.current.filter((e) => now - e.at <= TEN_MINUTES_MS)
    const categoriesViewedLast30m = Array.from(new Set(last30m.map((e) => e.category)))
    const lastMerchantViewed = behaviorRef.current.length
      ? behaviorRef.current[behaviorRef.current.length - 1].merchant
      : null
    const travelPagesLast10m = last10m.filter((e) => e.category === 'Viajes').length

    return {
      categoriesViewedLast30m,
      lastMerchantViewed,
      benefitViewsLast10m: last10m.length,
      travelPagesLast10m,
    }
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      setMessages((prev) => [...prev, { role: 'user', content: text }])
      setIsSending(true)

      const assistantIndex = { current: -1 }
      setMessages((prev) => {
        assistantIndex.current = prev.length
        return [...prev, { role: 'assistant', content: '' }]
      })

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            domainSessionId: getDomainSessionId() ?? null,
            signalsEnabled: isSignalsEnabled(),
            clientBehavior: getClientBehaviorSnapshot(),
            customer,
          }),
        })

        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let headerParsed = false
        let contextSource: ChatMessage['contextSource'] = 'none'
        let contextBlock: string | null = null

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          if (!headerParsed) {
            const endIdx = buffer.indexOf(CTX_END)
            if (endIdx === -1) continue
            const startIdx = buffer.indexOf(CTX_START)
            const headerJson = buffer.slice(startIdx + CTX_START.length, endIdx)
            try {
              const parsed = JSON.parse(headerJson) as { contextSource: ChatMessage['contextSource']; contextBlock: string | null }
              contextSource = parsed.contextSource
              contextBlock = parsed.contextBlock
            } catch {
              // ignore malformed header, fall back to defaults
            }
            buffer = buffer.slice(endIdx + CTX_END.length)
            headerParsed = true

            setMessages((prev) => {
              const next = [...prev]
              next[assistantIndex.current] = { ...next[assistantIndex.current], contextSource, contextBlock }
              return next
            })
          }

          if (headerParsed && buffer) {
            const chunk = buffer
            buffer = ''
            setMessages((prev) => {
              const next = [...prev]
              const existing = next[assistantIndex.current]
              next[assistantIndex.current] = { ...existing, content: existing.content + chunk }
              return next
            })
          }
        }
      } catch {
        setMessages((prev) => {
          const next = [...prev]
          next[assistantIndex.current] = {
            role: 'assistant',
            content: 'No pude conectarme con el asistente. Intenta nuevamente en unos segundos.',
          }
          return next
        })
      } finally {
        setIsSending(false)
      }
    },
    [getClientBehaviorSnapshot, customer],
  )

  return (
    <AssistantContext.Provider
      value={{
        isOpen,
        toggleOpen: () => setIsOpen((v) => !v),
        openAssistant: () => setIsOpen(true),
        closeAssistant: () => setIsOpen(false),
        messages,
        isSending,
        sendMessage,
        recordBenefitView,
        orbVisible,
        dismissOrb,
      }}
    >
      {children}
    </AssistantContext.Provider>
  )
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext)
  if (!ctx) throw new Error('useAssistant must be used within an AssistantProvider')
  return ctx
}
