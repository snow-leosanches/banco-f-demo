'use client'

import { useEffect, useState } from 'react'
import { Activity, X } from 'lucide-react'

import { getBenefitById, siteConfig } from '@/lib/config'
import { isSignalsEnabled } from '@/lib/consent'
import { travelNudgeTriggers, type InterventionTrigger } from '@/lib/intervention-log'
import {
  estimatedAvgSessionSeconds,
  formatEngagedDuration,
  hasCustomerMemory,
  hasSessionBehavior,
  type CustomerMemoryAttributes,
  type SessionBehaviorAttributes,
} from '@/lib/signals-attributes'
import { SIGNALS_INTERVENTION_NAME } from '@/lib/signals-definitions'
import { useInterventionLog } from '@/hooks/use-intervention-log'
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

function benefitLabels(ids: string[] | undefined): string[] | undefined {
  if (!ids?.length) return undefined
  return ids.map((id) => getBenefitById(id)?.merchant ?? id)
}

function SessionAttributeBlock({
  title,
  keyLabel,
  identifier,
  helper,
  attributes,
  emptyHint,
}: {
  title: string
  keyLabel: string
  identifier: string | null
  helper: string
  attributes: SessionBehaviorAttributes | null
  emptyHint: string
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
    </section>
  )
}

function IdentifiedAttributeBlock({
  identifier,
  attributes,
  locked,
}: {
  identifier: string | null
  attributes: CustomerMemoryAttributes | null
  locked?: boolean
}) {
  const showData = hasCustomerMemory(attributes)
  const avgSeconds = estimatedAvgSessionSeconds(attributes?.page_pings_last_7d, attributes?.sessions_last_7d)

  return (
    <section>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Identified</h4>
        <span className="rounded-full bg-sectionGray px-2 py-0.5 font-mono text-[10px] text-text-secondary">
          customer_id
        </span>
      </div>
      <p className="mb-3 font-mono text-[11px] text-text-secondary">{shortenId(identifier)}</p>
      <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">
        Seven-day ping/session volume after login; benefits and merchants unique lists roll on a 1-hour
        window so repeat demos reset. Stream attributes start at publish — no backfill. Average engaged
        session is (pings × 10s) / sessions; pings start after 20s so short visits undercount.
      </p>

      {locked ? (
        <p className="rounded-md bg-sectionGray px-3 py-2 text-xs text-text-secondary">
          Log in to start calculating attributes on <span className="font-mono">customer_id</span>.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <span className="mb-1.5 block text-text-secondary">Benefits visited (1h)</span>
            <CategoryPills values={benefitLabels(attributes?.benefits_visited_last_1h)} />
          </div>
          <div>
            <span className="mb-1.5 block text-text-secondary">Merchants visited (1h)</span>
            <CategoryPills values={attributes?.merchants_visited_last_1h} />
          </div>
          <Row label="Page pings (7d)" value={attributes?.page_pings_last_7d} />
          <Row label="Sessions (7d)" value={attributes?.sessions_last_7d} />
          <Row label="Est. avg session" value={avgSeconds != null ? formatEngagedDuration(avgSeconds) : undefined} />
          {!showData && (
            <p className="text-[11px] text-text-secondary">
              View benefits while signed in — identified attributes start from those events.
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function formatTriggerTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function triggerSourceLabel(source: InterventionTrigger['source']): string {
  return source === 'signals' ? 'Signals' : 'client fallback'
}

function InterventionBlock({
  domainUserId,
  isIdentified,
  triggers,
}: {
  domainUserId: string | null
  isIdentified: boolean
  triggers: readonly InterventionTrigger[]
}) {
  const events = travelNudgeTriggers(triggers)
  const fromSignals = events.some((event) => event.source === 'signals')
  const fromFallback = events.some((event) => event.source === 'local-fallback')
  const subscribed = !!domainUserId

  let status = 'Not triggered'
  let statusClass = 'bg-sectionGray text-text-secondary'
  if (fromSignals) {
    status = 'Triggered · Signals'
    statusClass = 'bg-mint text-primary'
  } else if (fromFallback) {
    status = 'Triggered · client fallback'
    statusClass = 'bg-hazteBg text-primary'
  } else if (!subscribed) {
    status = 'Not subscribed'
  }

  return (
    <section>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Intervention</h4>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>{status}</span>
      </div>
      <p className="mb-1 font-mono text-[11px] text-text-secondary">{SIGNALS_INTERVENTION_NAME}</p>
      <p className="mb-3 text-[11px] leading-relaxed text-text-secondary">
        <span className="font-mono">travel_pages_last_10m &gt;= 3</span> on{' '}
        <span className="font-mono">domain_userid</span>. The orb still only renders after login.
      </p>

      {!subscribed ? (
        <p className="rounded-md bg-sectionGray px-3 py-2 text-xs text-text-secondary">
          Waiting for the first-party cookie so the plugin can subscribe on domain_userid.
        </p>
      ) : events.length === 0 ? (
        <p className="text-[11px] text-text-secondary">
          Subscribed. View 3 Viajes benefits in 10 minutes to trigger. The orb shows only after login
          {isIdentified ? '' : ' — log in to see it'}.
        </p>
      ) : (
        <ol className="space-y-2">
          {events.map((event, index) => (
            <li key={`${event.source}-${event.receivedAt}-${index}`} className="rounded-md bg-sectionGray px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-text">{triggerSourceLabel(event.source)}</span>
                <span className="font-mono text-[10px] text-text-secondary">{formatTriggerTime(event.receivedAt)}</span>
              </div>
              {event.interventionId && (
                <p className="mt-1 font-mono text-[10px] text-text-secondary">id {shortenId(event.interventionId)}</p>
              )}
              {event.targetId && (
                <p className="mt-0.5 font-mono text-[10px] text-text-secondary">
                  {event.targetKey ?? 'domain_userid'} {shortenId(event.targetId)}
                </p>
              )}
              {typeof event.attributes?.travel_pages_last_10m === 'number' && (
                <p className="mt-0.5 text-[10px] text-text-secondary">
                  travel_pages_last_10m = {event.attributes.travel_pages_last_10m}
                </p>
              )}
            </li>
          ))}
        </ol>
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
  const interventionTriggers = useInterventionLog()

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
            ) : (
              <>
                {isLoading ? (
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

                    <SessionAttributeBlock
                      title="Anonymous"
                      keyLabel="domain_userid"
                      identifier={domainUserId}
                      helper="This-visit intent from the first-party cookie. Browse before login and these values still update."
                      attributes={anonymous}
                      emptyHint="Open benefits and filter categories — anonymous attributes will appear here."
                    />

                    <hr className="border-border" />

                    <IdentifiedAttributeBlock
                      identifier={customerId}
                      attributes={identified}
                      locked={!isIdentified}
                    />
                  </>
                )}

                <hr className="border-border" />

                <InterventionBlock
                  domainUserId={domainUserId}
                  isIdentified={isIdentified}
                  triggers={interventionTriggers}
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
