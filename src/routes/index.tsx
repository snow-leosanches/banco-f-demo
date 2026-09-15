import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { getBenefitsByCategory } from '@/lib/config'
import { useAssistant } from '@/contexts/assistant-context'
import { useUser } from '@/contexts/user-context'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/')({ component: Home })

const HERO_SLIDES = [
  {
    id: 'fpuntos',
    kicker: 'CMR Puntos es Fpuntos',
    title: 'CMR Puntos es Fpuntos',
    subtitle: 'Disfruta cientos de canjes ultra rebajados',
    cta: 'Más información',
    href: '/beneficios',
    tone: 'dark' as const,
  },
  {
    id: 'fiestas',
    kicker: 'Fiestas Patrias',
    title: '¡Aprovecha canjes de Fiestas Patrias!',
    subtitle: 'En Falabella.com, Tottus y Sodimac desde 4.000 Fpuntos',
    cta: 'Canjea aquí',
    href: '/beneficios',
    tone: 'dark' as const,
  },
  {
    id: 'viajes',
    kicker: 'Viajes',
    title: 'Prepárate para viajar: destinos seleccionados',
    subtitle: 'Canjea destinos con tus Fpuntos y tu tarjeta CMR',
    cta: 'Ver beneficios',
    href: '/beneficios',
    tone: 'forest' as const,
  },
]

function Home() {
  const [slide, setSlide] = useState(0)
  const [rut, setRut] = useState('')
  const { openAssistant, sendMessage } = useAssistant()
  const { customer } = useUser()
  const current = HERO_SLIDES[slide]
  const restaurantMax = Math.max(...getBenefitsByCategory('Restaurantes').map((b) => b.discountPct))
  const travelMax = Math.max(...getBenefitsByCategory('Viajes').map((b) => b.discountPct))
  const allMax = Math.max(...getBenefitsByCategory('Retail').map((b) => b.discountPct), restaurantMax, travelMax)

  const simulate = () => {
    openAssistant()
    void sendMessage(
      rut.trim()
        ? `Quiero simular un crédito de consumo. Mi RUT es ${rut.trim()}.`
        : 'Quiero simular un crédito de consumo.',
    )
  }

  return (
    <div>
      <section className="px-6 py-8 lg:px-24">
        <div className="relative mx-auto max-w-page overflow-hidden rounded-[24px]">
          <div
            className={cn(
              'relative flex min-h-[420px] flex-col justify-center px-8 py-16 md:min-h-[460px] md:px-16',
              current.tone === 'forest'
                ? 'bg-gradient-to-r from-[#154734] via-[#007A33] to-[#3B9326]'
                : 'bg-gradient-to-r from-[#1a1c18] via-[#2a2416] to-[#3d2a12]',
            )}
          >
            <FpuntosBurst />
            <div className="relative z-10 max-w-xl text-white">
              <h1 className="font-heading text-[40px] font-medium leading-[56px] tracking-[-0.8px]">{current.title}</h1>
              <p className="mt-3 text-[20px] font-normal leading-8 text-white/90">{current.subtitle}</p>
              <Link
                to={current.href}
                className="mt-8 inline-flex h-14 min-w-64 items-center justify-center rounded-full bg-secondary px-6 text-body text-white hover:bg-highlight"
              >
                {current.cta}
              </Link>
            </div>
            <button
              type="button"
              aria-label="Anterior"
              onClick={() => setSlide((s) => (s === 0 ? HERO_SLIDES.length - 1 : s - 1))}
              className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-text shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Siguiente"
              onClick={() => setSlide((s) => (s === HERO_SLIDES.length - 1 ? 0 : s + 1))}
              className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-text shadow-sm"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex justify-center gap-2">
            {HERO_SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Ir al banner ${i + 1}`}
                onClick={() => setSlide(i)}
                className={cn('h-1.5 rounded-full transition-all', i === slide ? 'w-8 bg-lime' : 'w-1.5 bg-[#d9decc]')}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-mint py-10">
        <div className="mx-auto flex max-w-page flex-col items-center justify-between gap-8 px-6 lg:flex-row lg:px-24">
          <h2 className="max-w-xl text-center font-heading text-h2 text-text lg:text-left">
            El Crédito de Consumo que necesitas ¡a un par de clics!
          </h2>
          <div className="flex w-full max-w-[328px] flex-col gap-3">
            <input
              value={rut}
              onChange={(e) => setRut(e.target.value)}
              placeholder="Ingresa tu RUT"
              className="h-[54px] rounded-sm border border-border bg-white px-4 text-body text-text outline-none placeholder:text-text-secondary focus:border-secondary"
            />
            <button
              type="button"
              onClick={simulate}
              className="flex h-14 w-full items-center justify-center rounded-full bg-secondary text-body text-white hover:bg-highlight"
            >
              Quiero simular
            </button>
          </div>
        </div>
      </section>

      <section id="gennial" className="bg-sectionGray py-16">
        <div className="mx-auto max-w-page px-6 lg:px-24">
          <h2 className="mb-8 font-heading text-h2 text-text">Atrévete a ser Gennial</h2>
          <div className="grid gap-8 md:grid-cols-2">
            <OpeningCard
              title="¡Abre hoy tu CMR!"
              subtitle="Y disfruta descuentos exclusivos"
              cta="Pídela aquí"
              href="/beneficios"
              card={<CmrCard />}
            />
            <OpeningCard
              title="Abre tu Cuenta Corriente"
              subtitle="Costo $0 en mantención. ¡Sin condiciones, para siempre!"
              cta="Solicítala aquí"
              href="/cuenta"
              card={<DebitCard />}
            />
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto max-w-page px-6 lg:px-24">
          <h2 className="font-heading text-h2 text-text">¡Aprovecha beneficios todos los días!</h2>
          <p className="mt-1 text-body text-text-secondary">Conoce los descuentos del mes</p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <PromoCard
              title="Beneficios del mes"
              eyebrow="Exclusivo con tus tarjetas"
              cadence="Todos los días"
              pct={allMax}
              href="/beneficios"
              gradient="from-[#1b3d14] via-[#347B23] to-[#5aa33a]"
            />
            <PromoCard
              title="Dcto en Restaurante"
              eyebrow="Exclusivo con tus tarjetas"
              cadence="Todos los días"
              pct={restaurantMax}
              href="/beneficios"
              gradient="from-[#3d1d12] via-[#7a3a1e] to-[#c46a2a]"
            />
            <PromoCard
              title="Beneficios Elite del mes"
              eyebrow="Exclusivos con tu CMR Elite"
              cadence="Todos los días"
              pct={travelMax}
              href="/beneficios"
              gradient="from-[#1a1a1a] via-[#3a3220] to-[#B08D3E]"
            />
          </div>
          <div className="mt-8 flex justify-center">
            <Link
              to="/beneficios"
              className="inline-flex h-14 min-w-64 items-center justify-center rounded-full bg-secondary px-8 text-body text-white hover:bg-highlight"
            >
              Quiero conocer todos
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white pb-8">
        <div className="mx-auto max-w-page px-6 lg:px-24">
          <h2 className="mb-6 font-heading text-h2 text-text">Mantente al día</h2>
          <div className="grid gap-6 md:grid-cols-2">
            <Link
              to="/cuenta"
              className="flex min-h-[140px] items-end rounded-[24px] bg-[#e8f3e3] p-8 text-h3 font-medium text-text shadow-sm"
            >
              Paga tus créditos
            </Link>
            <Link
              to="/cuenta"
              className="flex min-h-[140px] items-end rounded-[24px] bg-[#eef2f6] p-8 text-h3 font-medium text-text shadow-sm"
            >
              Paga tu Tarjeta CMR
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="mx-auto grid max-w-page gap-6 px-6 md:grid-cols-2 lg:px-24">
          <article className="rounded-[24px] bg-gradient-to-br from-[#154734] to-[#3B9326] p-8 text-white shadow-sm">
            <h2 className="font-heading text-h2 text-white">¡Un Elite complementa su viaje!</h2>
            <p className="mt-3 text-body text-white/90">
              Aprovecha este beneficio exclusivo
              {customer ? ` por ser cliente ${customer.cmrTier}` : ' con tu tarjeta CMR'} en destinos y pasajes
              seleccionados.
            </p>
            <Link
              to="/beneficios"
              className="mt-6 inline-flex text-small font-medium text-white underline underline-offset-4"
            >
              Más información
            </Link>
          </article>
          <article className="rounded-[24px] bg-sectionGray p-8 shadow-sm">
            <h2 className="font-heading text-h2 text-text">¡Empieza a ahorrar por objetivos!</h2>
            <ul className="mt-4 space-y-2 text-small text-text">
              <li>Costo $0 en mantención</li>
              <li>Tu plata se reajustará anualmente a la UF.</li>
              <li>Separa tus ahorros y ponle nombre a cada objetivo desde la App.</li>
              <li>Ábrela 100% digital desde tu App Banco F.</li>
            </ul>
            <Link to="/cuenta" className="mt-6 inline-flex text-small font-medium text-secondary">
              Conoce más
            </Link>
          </article>
        </div>
      </section>
    </div>
  )
}

function OpeningCard({
  title,
  subtitle,
  cta,
  href,
  card,
}: {
  title: string
  subtitle: string
  cta: string
  href: string
  card: React.ReactNode
}) {
  return (
    <div className="grid items-center gap-3 rounded-[24px] bg-white px-6 py-9 shadow-sm md:grid-cols-[auto_1fr] md:px-8">
      {card}
      <div>
        <h3 className="font-heading text-h3 text-text">{title}</h3>
        <p className="mt-1 text-body text-text-secondary">{subtitle}</p>
        <Link
          to={href}
          className="mt-5 inline-flex h-14 min-w-64 items-center justify-center rounded-full bg-secondary px-6 text-body text-white hover:bg-highlight"
        >
          {cta}
        </Link>
      </div>
    </div>
  )
}

function CmrCard() {
  return (
    <div className="relative h-[108px] w-[72px] shrink-0 rounded-[8px] bg-gradient-to-br from-[#4caf2f] to-[#2e7a1c] p-2 text-white shadow-sm">
      <span className="text-[9px] font-bold tracking-wide">CMR</span>
      <span className="absolute bottom-2 left-2 h-3 w-4 rounded-[2px] bg-[#eb001b]/90" />
      <span className="absolute bottom-2 left-4 h-3 w-4 rounded-[2px] bg-[#f79e1b]/90" />
    </div>
  )
}

function DebitCard() {
  return (
    <div className="relative h-[108px] w-[72px] shrink-0 rounded-[8px] bg-gradient-to-br from-[#6b7280] to-[#374151] p-2 text-white shadow-sm">
      <span className="text-[8px] font-semibold leading-tight">Banco F</span>
      <span className="absolute bottom-2 left-2 h-3 w-4 rounded-[2px] bg-[#eb001b]/90" />
      <span className="absolute bottom-2 left-4 h-3 w-4 rounded-[2px] bg-[#f79e1b]/90" />
    </div>
  )
}

function PromoCard({
  title,
  eyebrow,
  cadence,
  pct,
  href,
  gradient,
}: {
  title: string
  eyebrow: string
  cadence: string
  pct: number
  href: string
  gradient: string
}) {
  return (
    <Link to={href} className={cn('relative block h-[456px] overflow-hidden rounded-md bg-gradient-to-br p-6 text-white', gradient)}>
      <p className="text-small font-medium text-white/80">{eyebrow}</p>
      <h3 className="mt-2 font-heading text-[28px] font-medium leading-tight">{title}</h3>
      <p className="mt-3 text-small text-white/80">{cadence}</p>
      <div className="absolute bottom-8 left-6">
        <p className="text-small">Hasta</p>
        <p className="font-heading text-[40px] font-medium leading-none">{pct}% dcto</p>
        <p className="mt-2 text-small uppercase tracking-wide">Sin Tope</p>
      </div>
    </Link>
  )
}

function FpuntosBurst() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 md:block" aria-hidden>
      <div className="absolute right-16 top-16 h-28 w-28 rounded-full bg-[#e23d28]" />
      <div className="absolute right-48 top-28 h-16 w-16 rounded-full bg-[#2ea7e0]" />
      <div className="absolute right-24 bottom-20 h-20 w-20 rounded-full bg-[#f2c94c]" />
      <div className="absolute right-56 bottom-24 h-14 w-14 rounded-full bg-[#7ac943]" />
      <div className="absolute right-10 top-1/2 flex h-36 w-36 -translate-y-1/2 items-center justify-center rounded-full bg-white/95">
        <span className="font-heading text-2xl font-semibold text-text">
          F<span className="text-secondary">puntos</span>
        </span>
      </div>
    </div>
  )
}
