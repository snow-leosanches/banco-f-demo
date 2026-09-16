import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { faker } from '@faker-js/faker/locale/es'
import { useUser, type LoginDetails } from '@/contexts/user-context'
import { CMR_TIERS, COMUNAS, demoPhone, knownCustomers, type KnownCustomer } from '@/lib/known-customers'
import { resetSnowplowIdentity } from '@/lib/snowplow-config'
import { getManualLoginUserId } from '@/lib/user-id'

type LoginSearch = {
  returnUrl: string
}

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    returnUrl: typeof search.returnUrl === 'string' ? search.returnUrl : '/',
  }),
  component: LoginPage,
})

function LoginPage() {
  const { login, logout } = useUser()
  const router = useRouter()
  const { returnUrl } = Route.useSearch()
  const [manualEmail, setManualEmail] = useState('')
  const [resetSuccess, setResetSuccess] = useState(false)

  const redirectAfterLogin = () => {
    const target = returnUrl.startsWith('/') && returnUrl !== '/login' ? returnUrl : '/'
    void router.navigate({ href: target })
  }

  const identify = (details: LoginDetails) => {
    login(details)
    redirectAfterLogin()
  }

  const resetSnowplowSession = () => {
    resetSnowplowIdentity()
    logout()
    setResetSuccess(true)
    window.setTimeout(() => setResetSuccess(false), 3000)
    void router.navigate({ to: '/' })
  }

  const performManualLogin = () => {
    const email = manualEmail.trim()
    if (!email) return
    const userId = getManualLoginUserId(email)
    identify({
      email,
      userId,
      firstName: email.split('@')[0] || 'Cliente',
      customerId: userId,
      cmrTier: 'CMR Verde',
      comuna: 'Santiago',
    })
  }

  const performAutomaticLogin = () => {
    const email = faker.internet.email()
    const phone = demoPhone()
    const name = faker.person.fullName()
    const userId = crypto.randomUUID()
    identify({
      email,
      userId,
      name,
      firstName: name.split(' ')[0],
      phone,
      customerId: userId,
      cmrTier: faker.helpers.arrayElement(CMR_TIERS),
      comuna: faker.helpers.arrayElement([...COMUNAS]),
    })
  }

  const performKnownCustomerLogin = (customer: KnownCustomer) => {
    identify({
      email: customer.email,
      userId: customer.id,
      name: customer.name,
      firstName: customer.firstName,
      phone: customer.phone,
      customerId: customer.id,
      cmrTier: customer.cmrTier,
      comuna: customer.comuna,
    })
  }

  return (
    <div className="mx-auto w-full max-w-xl px-6 py-10">
      <h1 className="font-heading text-h1 text-text">Inicia sesión en Banco F</h1>
      <p className="mt-2 text-body text-text-secondary">
        Identidad solo para la demo. No se crea una cuenta real: el ingreso asigna el user id de
        Snowplow y adjunta la entidad de cliente a los eventos.
      </p>

      <section className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-h3 text-text">Ingreso automático</h2>
        <p className="mt-1 text-small text-text-secondary">¿Quién eres?</p>
        <button
          type="button"
          onClick={performAutomaticLogin}
          className="mt-4 rounded-full bg-secondary px-4 py-2.5 text-small font-medium text-white hover:bg-highlight"
        >
          ¿Quién, quién, quién?
        </button>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-h3 text-text">Restablecer sesión de Snowplow</h2>
        <p className="mt-1 text-small text-text-secondary">
          Borra las cookies de dominio/sesión y el user id, quita la entidad de cliente, cierra la
          sesión y vuelve al inicio.
        </p>
        <button
          type="button"
          onClick={resetSnowplowSession}
          className="mt-4 rounded-full border-[1.5px] border-hazteBg bg-hazteBg px-4 py-2.5 text-small font-medium text-primary hover:bg-mint"
        >
          Restablecer sesión de Snowplow
        </button>
        {resetSuccess && (
          <p className="mt-2 text-small font-medium text-status-success">Sesión restablecida.</p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-h3 text-text">Ingreso manual</h2>
        <label htmlFor="manual-login-email" className="mt-4 block text-small font-medium text-text">
          Email
        </label>
        <input
          id="manual-login-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="tu@correo.com"
          value={manualEmail}
          onChange={(e) => setManualEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && performManualLogin()}
          className="mt-1 w-full rounded-md border border-border px-4 py-2.5 text-body text-text outline-none focus:border-primary"
        />
        <button
          type="button"
          onClick={performManualLogin}
          className="mt-4 rounded-full bg-secondary px-4 py-2.5 text-small font-medium text-white hover:bg-highlight"
        >
          Ingreso manual
        </button>
      </section>

      <section className="mt-6 rounded-lg border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-h3 text-text">Clientes conocidos</h2>
        <p className="mt-1 text-small text-text-secondary">
          Reutiliza una identidad estable. El asistente ve beneficios y un motivo
          distinto de “por qué ahorro menos” según el cliente.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {knownCustomers.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => performKnownCustomerLogin(customer)}
              className="rounded-full bg-secondary px-4 py-2.5 text-left text-small font-medium text-white hover:bg-highlight"
            >
              {customer.name} · {customer.cmrTier} · {customer.benefitsLabel} · {customer.savingsLabel}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}
