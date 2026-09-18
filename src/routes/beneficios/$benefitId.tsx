import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { ArrowLeft } from 'lucide-react'

import { formatBenefitOffer, getBenefitById } from '@/lib/config'
import { useAssistant } from '@/contexts/assistant-context'
import { trackBenefitViewed } from '@/lib/snowplow-config'

export const Route = createFileRoute('/beneficios/$benefitId')({
  loader: ({ params }) => {
    const benefit = getBenefitById(params.benefitId)
    if (!benefit) throw notFound()
    return benefit
  },
  component: BenefitDetail,
})

function BenefitDetail() {
  const benefit = Route.useLoaderData()
  const { recordBenefitView, openAssistant, sendMessage } = useAssistant()
  const trackedRef = useRef<string | null>(null)

  useEffect(() => {
    if (trackedRef.current === benefit.id) return
    trackedRef.current = benefit.id
    trackBenefitViewed({
      benefitId: benefit.id,
      merchant: benefit.merchant,
      category: benefit.category,
      discountPct: benefit.discountPct,
    })
    recordBenefitView(benefit.category, benefit.merchant)
  }, [benefit, recordBenefitView])

  return (
    <div className="bg-white">
      <div className="bg-mint py-10">
        <div className="mx-auto max-w-page px-6 lg:px-24">
          <Link to="/beneficios" className="inline-flex items-center gap-1.5 text-small font-medium text-secondary">
            <ArrowLeft className="h-4 w-4" />
            Volver a beneficios
          </Link>
          <p className="mt-6 text-small font-medium text-secondary">{benefit.category}</p>
          <h1 className="mt-1 font-heading text-h1 text-text">{benefit.merchant}</h1>
        </div>
      </div>

      <div className="mx-auto max-w-page px-6 py-10 lg:px-24">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] bg-surface p-8 shadow-sm">
            {benefit.image ? (
              <img src={benefit.image} alt="" className="mb-6 h-48 w-full rounded-[16px] object-cover" />
            ) : null}
            <p className="text-small text-text-secondary">Oferta</p>
            <p className="font-heading text-[48px] font-medium leading-none text-secondary">{formatBenefitOffer(benefit)}</p>
            <p className="mt-2 text-small uppercase tracking-wide text-text-secondary">Exclusivo con tus tarjetas</p>
            <p className="mt-6 text-body text-text">{benefit.description}</p>
            <p className="mt-6 border-t border-border pt-4 text-small text-text-secondary">
              <span className="font-semibold text-text">Condiciones: </span>
              {benefit.terms}
            </p>
          </div>
          <div className="rounded-[24px] bg-sectionGray p-8">
            <h2 className="font-heading text-h3 text-text">¿Tienes dudas?</h2>
            <p className="mt-2 text-small text-text-secondary">
              El Asistente te explica este beneficio y te sugiere otros según lo que estás mirando.
            </p>
            <button
              type="button"
              onClick={() => {
                openAssistant()
                void sendMessage(`Cuéntame más del beneficio de ${benefit.merchant}`)
              }}
              className="mt-6 inline-flex h-14 min-w-56 items-center justify-center rounded-full bg-secondary px-6 text-body text-white hover:bg-highlight"
            >
              Preguntar al Asistente
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
