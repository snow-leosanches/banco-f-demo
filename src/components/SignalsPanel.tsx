'use client'

import { useEffect, useState } from 'react'
import { Activity, X } from 'lucide-react'

import { isSignalsEnabled } from '@/lib/consent'
import { siteConfig } from '@/lib/config'
import { hasSessionBehavior, type SessionBehaviorAttributes } from '@/lib/signals-attributes'
import { useSignalsAttributes } from '@/hooks/use-signals-attributes'
import { useUser } from '@/contexts/user-context'

const POLL_MS = 5000

function shortenId(id: string | null): string {
  if (!id) return '—'
  return id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-4)}` : id
}

function CategoryPills({ values }: { values: string[] | undefined }) {
  if (!values || values.length === 0) {
    return <span className="text-xs text-text-secondary">None yet</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((label) => (
        <span
          key={label}
          className="inline-flex items-center rounded-full bg-mint px-2 py-0.5 text-xs font-medium text-primary"
        >
          {label}
        </span>
      ))}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string | number | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text">{value ?? '—'}</span>
    </div>
  )
}

function AttributeBlock({
  title,
  keyLabel,
  identifier,
  helper,
  attributes,
  emptyHint,
  locked,
}: {
  title: string
  keyLabel: string
  identifier: string | null
  helper: string
  attributes: SessionBehaviorAttributes | null
  emptyHint: string
  locked?: boolean
}) {
  const showData = hasSessionBehavior(attributes)

  return (
    <section>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">{title}</h4>
        <span className="rounded-full bg-sectionGray px-2 py-0.5 font-mono text-[10px] text-text-secondary">
          {keyLabel}
        </span>
      </div>
      <p className="mb-3 font-mono text-[11px] text-text-secondary">{shortenId(identifier)}</p>
      <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">{helper}</p>

      {locked ? (
        <p className="rounded-md bg-sectionGray px-3 py-2 text-xs text-text-secondary">
          Log in to start calculating attributes on <span className="font-mono">customer_id</span>.
        </p>
      ) : (
        <div className="space-y-3">
          <Row label="Last merchant" value={attributes?.last_merchant_viewed} />
          <div>
            <span className="mb-1.5 block text-text-secondary">Categories (30m)</span>
            <CategoryPills values={attributes?.categories_viewed_last_30m} />
          </div>
          <Row label="Benefit views (10m)" value={attributes?.benefit_views_last_10m} />
          <Row label="Travel views (10m)" value={attributes?.travel_pages_last_10m} />
          {!showData && <p className="text-[11px] text-text-secondary">{emptyHint}</p>}
        </div>
      )}
    </section>
  )
}

export function SignalsPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [signalsOn, setSignalsOn] = useState(true)
  const { user } = useUser()
  const { anonymous, identified, domainUserId, customerId, isIdentified, isLoading, error } =
    useSignalsAttributes({
      enabled: isOpen,
      refetchInterval: isOpen ? POLL_MS : false,
    })

  useEffect(() => {
    setSignalsOn(isSignalsEnabled())
    const onPreference = (event: Event) => {
      const enabled = (event as CustomEvent<{ enabled: boolean }>).detail?.enabled
      setSignalsOn(typeof enabled === 'boolean' ? enabled : isSignalsEnabled())
    }
    window.addEventListener('signalsPreferenceChanged', onPreference)
    return () => window.removeEventListener('signalsPreferenceChanged', onPreference)
  }, [])

  if (!siteConfig.features.signals) return null

  const identityLabel = isIdentified
    ? `Identified${user?.firstName ? ` · ${user.firstName}` : ''}`
    : 'Anonymous'

  return (
    <>
      {isOpen && (
        <div
          className="flex w-[min(24rem,calc(100vw-3rem))] flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-2 ring-secondary/20"
          style={{ position: 'fixed', left: 24, bottom: 88, zIndex: 50, maxHeight: 'calc(100vh - 7.5rem)' }}
        >
          <div className="flex shrink-0 items-center justify-between bg-secondary px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Signals Live</h3>
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-lime" />
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="border-0 bg-transparent p-0.5 text-white/80 transition-colors hover:text-white"
              aria-label="Close Signals panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm">
            {!signalsOn ? (
              <p className="py-6 text-center text-text-secondary">
                Signals is turned off. Enable it from the demo footer to fetch attributes.
              </p>
            ) : isLoading ? (
              <div className="animate-pulse space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-3 w-1/3 rounded-sm bg-border" />
                    <div className="h-4 w-2/3 rounded-sm bg-border/70" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <p className="py-6 text-center text-xs text-status-error">{error}</p>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-md bg-mint px-3 py-2">
                  <span className="text-xs font-medium text-primary">Current identity</span>
                  <span className="text-xs font-semibold text-text">{identityLabel}</span>
                </div>

                <AttributeBlock
                  title="Anonymous"
                  keyLabel="domain_userid"
                  identifier={domainUserId}
                  helper="Calculated from the first-party cookie. Browse before login and these values still update."
                  attributes={anonymous}
                  emptyHint="Open benefits and filter categories — anonymous attributes will appear here."
                />

                <hr className="border-border" />

                <AttributeBlock
                  title="Identified"
                  keyLabel="customer_id"
                  identifier={customerId}
                  helper="Calculated from the customer entity attached after login. Pre-login browsing does not land here."
                  attributes={identified}
                  emptyHint="View benefits while signed in — identified attributes start from those events."
                  locked={!isIdentified}
                />
              </>
            )}

            <p className="pt-2 text-center text-[10px] text-text-secondary/70">
              This panel is visible to demo presenters only
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        style={{ position: 'fixed', left: 24, bottom: 24, zIndex: 50, height: 56 }}
        className="flex items-center gap-2 rounded-full border-0 bg-secondary px-5 text-white shadow-lg transition-transform hover:scale-105 hover:bg-highlight"
        aria-label={isOpen ? 'Close Signals panel' : 'Open Signals panel'}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <>
            <Activity className="h-5 w-5" />
            <span className="text-sm font-medium">Signals</span>
          </>
        )}
      </button>
    </>
  )
}
