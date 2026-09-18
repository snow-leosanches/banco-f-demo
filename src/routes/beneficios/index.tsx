import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

import { benefits, formatBenefitOffer, type BenefitCategory } from '@/lib/config'
import { useAssistant } from '@/contexts/assistant-context'
import { useUser } from '@/contexts/user-context'
import { trackBenefitCategoryFiltered } from '@/lib/snowplow-config'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/beneficios/')({ component: Beneficios })

const CATEGORIES: BenefitCategory[] = ['Restaurantes', 'Viajes', 'Combustible', 'Retail']

const CATEGORY_GRADIENT: Record<BenefitCategory, string> = {
  Restaurantes: 'from-[#7a3a1e] to-[#c46a2a]',
  Viajes: 'from-[#154734] to-[#3B9326]',
  Combustible: 'from-[#1a1a1a] to-[#585D61]',
  Retail: 'from-[#347B23] to-[#7ac943]',
}

function Beneficios() {
  const [activeCategory, setActiveCategory] = useState<BenefitCategory | 'Todos'>('Todos')
  const { recordBenefitView } = useAssistant()
  const { customer } = useUser()

  const filtered = activeCategory === 'Todos' ? benefits : benefits.filter((b) => b.category === activeCategory)

  const selectCategory = (category: BenefitCategory | 'Todos') => {
    setActiveCategory(category)
    if (category !== 'Todos') {
      trackBenefitCategoryFiltered(category)
      recordBenefitView(category)
    }
  }

  return (
    <div className="bg-white">
      <div className="bg-mint py-12">
        <div className="mx-auto max-w-page px-6 lg:px-24">
          <p className="text-small font-medium text-secondary">Beneficios y Fpuntos</p>
          <h1 className="mt-2 font-heading text-h1 text-text">¡Aprovecha beneficios todos los días!</h1>
          <p className="mt-2 max-w-2xl text-body text-text-secondary">
            Descuentos exclusivos con tus tarjetas{customer ? `, ${customer.firstName}` : ''}. Filtra por categoría y
            entra a cada beneficio para ver las condiciones.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-page px-6 py-10 lg:px-24">
        <div className="flex flex-wrap gap-2">
          {(['Todos', ...CATEGORIES] as const).map((category) => (
            <button
              key={category}
              onClick={() => selectCategory(category)}
              className={cn(
                'h-10 rounded-full border px-4 text-small font-medium transition-colors',
                activeCategory === category
                  ? 'border-secondary bg-secondary text-white'
                  : 'border-border bg-surface text-text hover:bg-mint',
              )}
            >
              {category === 'Todos' ? `Todos (${benefits.length})` : category}
            </button>
          ))}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((benefit) => (
            <Link
              key={benefit.id}
              to="/beneficios/$benefitId"
              params={{ benefitId: benefit.id }}
              className="overflow-hidden rounded-[24px] bg-surface shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-40 overflow-hidden">
                {benefit.image ? (
                  <img src={benefit.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className={cn('h-full w-full bg-gradient-to-br', CATEGORY_GRADIENT[benefit.category])} />
                )}
                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/75 via-black/25 to-transparent p-5 text-white">
                  <p className="text-small text-white/80">{benefit.category}</p>
                  <p className="font-heading text-[28px] font-medium leading-none">{formatBenefitOffer(benefit)}</p>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-heading text-h3 text-text">{benefit.merchant}</h3>
                <p className="mt-2 text-small text-text-secondary">{benefit.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
