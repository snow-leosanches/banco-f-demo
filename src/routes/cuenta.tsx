import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect } from 'react'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

import { useUser } from '@/contexts/user-context'
import { useLanguage } from '@/contexts/language-context'
import { trackProductPageViewed } from '@/lib/snowplow-config'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/cuenta')({ component: Cuenta })

const MOVEMENTS = [
  { id: 1, label: { es: 'Tottus San Miguel', en: 'Tottus San Miguel' }, amount: -18990, date: '09 sep' },
  { id: 2, label: { es: 'Abono sueldo', en: 'Salary deposit' }, amount: 780000, date: '05 sep' },
  { id: 3, label: { es: 'Shell Gran Avenida', en: 'Shell Gran Avenida' }, amount: -22000, date: '03 sep' },
  { id: 4, label: { es: 'Transferencia recibida', en: 'Received transfer' }, amount: 45000, date: '01 sep' },
]

const MONTH_ABBR_EN: Record<string, string> = { sep: 'Sep', ago: 'Aug', jul: 'Jul', jun: 'Jun' }

function formatMovementDate(date: string, language: 'es' | 'en'): string {
  if (language === 'es') return date
  const [day, month] = date.split(' ')
  return `${day} ${MONTH_ABBR_EN[month] ?? month}`
}

function Cuenta() {
  const { user, customer, isLoading } = useUser()
  const { language } = useLanguage()

  useEffect(() => {
    if (user) trackProductPageViewed('cuenta_corriente')
  }, [user])

  if (isLoading) {
    return (
      <div className="bg-white">
        <div className="bg-sectionGray py-12">
          <div className="mx-auto max-w-page px-6 lg:px-24">
            <div className="h-8 w-48 animate-pulse rounded-md bg-border" />
            <div className="mt-4 h-40 animate-pulse rounded-[24px] bg-border" />
          </div>
        </div>
      </div>
    )
  }

  if (!user || !customer) {
    return (
      <div className="bg-white">
        <div className="bg-sectionGray py-12">
          <div className="mx-auto max-w-page px-6 text-center lg:px-24">
            <p className="text-small font-medium text-secondary">{language === 'en' ? 'Accounts' : 'Cuentas'}</p>
            <h1 className="mt-2 font-heading text-h1 text-text">
              {language === 'en' ? 'Log in to see your account' : 'Inicia sesión para ver tu cuenta'}
            </h1>
            <p className="mt-2 text-body text-text-secondary">
              {language === 'en'
                ? 'Demo login assigns your Snowplow identity and shows your account balance and activity.'
                : 'El ingreso de demo asigna tu identidad de Snowplow y muestra el saldo y movimientos de la cuenta.'}
            </p>
            <Link
              to="/login"
              search={{ returnUrl: '/cuenta' }}
              className="mt-6 inline-flex h-14 items-center rounded-full bg-secondary px-6 text-body text-white hover:bg-highlight"
            >
              {language === 'en' ? 'Log in' : 'Iniciar sesión'}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white">
      <div className="bg-sectionGray py-12">
        <div className="mx-auto max-w-page px-6 lg:px-24">
          <p className="text-small font-medium text-secondary">{language === 'en' ? 'Accounts' : 'Cuentas'}</p>
          <h1 className="mt-2 font-heading text-h1 text-text">
            {language === 'en' ? 'Hi' : 'Hola'}, {customer.firstName}
          </h1>
          <p className="mt-2 text-body text-text-secondary">
            {language === 'en'
              ? 'Your Banco F Checking Account. $0 maintenance fee, no conditions, forever.'
              : 'Tu Cuenta Corriente Banco F. Costo $0 en mantención, sin condiciones, para siempre.'}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-page px-6 py-10 lg:px-24">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] bg-surface p-8 shadow-sm">
            <span className="text-small font-medium text-text-secondary">
              {language === 'en' ? 'Checking Account' : 'Cuenta Corriente'}
              {customer.cmrTier ? ` · ${customer.cmrTier}` : ''}
            </span>
            <p className="mt-2 font-heading text-h1 text-text">$1.240.500</p>
            <p className="mt-1 text-small text-text-secondary">
              {language === 'en' ? 'Available today' : 'Disponible hoy'} · {customer.comuna}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/beneficios"
                className="inline-flex h-14 items-center rounded-full bg-secondary px-6 text-body text-white hover:bg-highlight"
              >
                {language === 'en' ? 'View my benefits' : 'Ver mis beneficios'}
              </Link>
              <button
                type="button"
                className="inline-flex h-14 items-center rounded-full border-[1.5px] border-hazteBg bg-hazteBg px-6 text-body font-medium text-primary"
              >
                {language === 'en' ? 'Transfer' : 'Transferir'}
              </button>
            </div>
          </div>

          <div className="rounded-[24px] bg-mint p-8">
            <h2 className="font-heading text-h3 text-text">
              {language === 'en' ? 'Start saving toward your goals!' : '¡Empieza a ahorrar por objetivos!'}
            </h2>
            <ul className="mt-4 space-y-2 text-small text-text">
              {language === 'en' ? (
                <>
                  <li>$0 maintenance fee</li>
                  <li>Your money is adjusted annually to the UF.</li>
                  <li>Split your savings and name each goal from the App.</li>
                </>
              ) : (
                <>
                  <li>Costo $0 en mantención</li>
                  <li>Tu plata se reajustará anualmente a la UF.</li>
                  <li>Separa tus ahorros y ponle nombre a cada objetivo desde la App.</li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-6 rounded-[24px] bg-surface p-6 shadow-sm">
          <h2 className="mb-4 font-heading text-h4 text-text">
            {language === 'en' ? 'Recent activity' : 'Movimientos recientes'}
          </h2>
          <div className="divide-y divide-border">
            {MOVEMENTS.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-full',
                      m.amount < 0 ? 'bg-status-error/10 text-status-error' : 'bg-iconTint text-secondary',
                    )}
                  >
                    {m.amount < 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownLeft className="h-4 w-4" />}
                  </span>
                  <div>
                    <p className="text-small font-medium text-text">{m.label[language]}</p>
                    <p className="text-small text-text-secondary">{formatMovementDate(m.date, language)}</p>
                  </div>
                </div>
                <span className={cn('text-small font-semibold', m.amount < 0 ? 'text-text' : 'text-secondary')}>
                  {m.amount < 0 ? '-' : '+'}${Math.abs(m.amount).toLocaleString('es-CL')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
