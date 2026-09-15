'use client'

import { X } from 'lucide-react'

import { useAssistant } from '@/contexts/assistant-context'
import { getBenefitById } from '@/lib/config'

export function InterventionOrb() {
  const { orbVisible, dismissOrb, openAssistant } = useAssistant()
  const turbus = getBenefitById('turbus')

  if (!orbVisible || !turbus) return null

  return (
    <div className="fixed bottom-24 right-6 z-40 w-80 rounded-[24px] bg-surface p-4 shadow-md">
      <button
        onClick={dismissOrb}
        aria-label="Cerrar sugerencia"
        className="absolute right-3 top-3 text-text-secondary hover:text-text"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-small font-semibold text-text">Notamos que estás mirando viajes</p>
      <p className="mt-1 text-small text-text-secondary">
        Tienes {turbus.discountPct}% de descuento en {turbus.merchant} con tu tarjeta CMR.
      </p>
      <button
        onClick={() => {
          dismissOrb()
          openAssistant()
        }}
        className="mt-3 inline-flex h-10 items-center rounded-full bg-secondary px-4 text-small font-medium text-white hover:bg-highlight"
      >
        Ver beneficio
      </button>
    </div>
  )
}
