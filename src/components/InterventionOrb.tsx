'use client'

import { X } from 'lucide-react'

import { useAssistant } from '@/contexts/assistant-context'
import { useUser } from '@/contexts/user-context'
import { useLanguage } from '@/contexts/language-context'
import { customerHasCmrCard, getBenefitById } from '@/lib/config'

export function InterventionOrb() {
  const { orbVisible, dismissOrb, openAssistant } = useAssistant()
  const { customer } = useUser()
  const { language } = useLanguage()
  const turbus = getBenefitById('turbus')
  const hasCmr = customerHasCmrCard(customer)

  if (!orbVisible || !customer || !turbus) return null

  return (
    <div className="fixed bottom-24 right-6 z-40 w-80 rounded-[24px] bg-surface p-4 shadow-md">
      <button
        onClick={dismissOrb}
        aria-label={language === 'en' ? 'Close suggestion' : 'Cerrar sugerencia'}
        className="absolute right-3 top-3 text-text-secondary hover:text-text"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-small font-semibold text-text">
        {language === 'en' ? "We noticed you're browsing travel" : 'Notamos que estás mirando viajes'}
      </p>
      <p className="mt-1 text-small text-text-secondary">
        {language === 'en'
          ? hasCmr
            ? `You have ${turbus.discountPct}% off at ${turbus.merchant} with your CMR card.`
            : `You don't have a CMR card yet. Apply for one and get ${turbus.discountPct}% off at ${turbus.merchant}.`
          : hasCmr
            ? `Tienes ${turbus.discountPct}% de descuento en ${turbus.merchant} con tu tarjeta CMR.`
            : `Aún no tienes tarjeta CMR. Solicítala y aprovecha ${turbus.discountPct}% de descuento en ${turbus.merchant}.`}
      </p>
      <button
        onClick={() => {
          dismissOrb()
          openAssistant()
        }}
        className="mt-3 inline-flex h-10 items-center rounded-full bg-secondary px-4 text-small font-medium text-white hover:bg-highlight"
      >
        {language === 'en' ? (hasCmr ? 'View benefit' : 'Apply for CMR') : hasCmr ? 'Ver beneficio' : 'Solicita tu CMR'}
      </button>
    </div>
  )
}
