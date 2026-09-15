'use client'

import { useEffect, useState } from 'react'
import { Link, useRouterState } from '@tanstack/react-router'
import { ChevronDown, Menu, Search, X } from 'lucide-react'

import { siteConfig, type MegaItem } from '@/lib/config'
import { useAssistant } from '@/contexts/assistant-context'
import { useUser } from '@/contexts/user-context'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/Logo'
import { SearchOverlay } from '@/components/SearchOverlay'

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openMega, setOpenMega] = useState<string | null>(null)

  useEffect(() => {
    setMobileOpen(false)
    setOpenMega(null)
  }, [pathname])

  return (
    <header className="sticky top-0 z-40 bg-surface">
      <UtilityBar />

      <div className="border-b border-[#eef1f4]">
        <div className="mx-auto flex h-[72px] max-w-page items-center justify-between px-6 lg:px-24">
          <Logo />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden h-10 items-center gap-2 rounded-full border border-[rgba(27,48,82,0.3)] px-4 text-small font-normal text-secondary lg:inline-flex"
            >
              <Search className="h-4 w-4" />
              Buscar
            </button>
            <Link
              to="/beneficios"
              className="hidden h-10 items-center rounded-full border-[1.5px] border-hazteBg bg-hazteBg px-4 text-small font-medium text-primary lg:inline-flex"
            >
              Hazte cliente
            </Link>
            <div className="hidden lg:block">
              <LoginControl />
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center text-text lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      <nav className="relative hidden border-b border-[#eef1f4] lg:block">
        <div className="mx-auto flex h-[55px] max-w-page items-center justify-center px-6 lg:px-24">
          {siteConfig.navigation.megaMenu.map((item) => (
            <MegaNavItem
              key={item.label}
              item={item}
              pathname={pathname}
              open={openMega === item.label}
              onOpen={() => setOpenMega(item.label)}
              onClose={() => setOpenMega(null)}
            />
          ))}
        </div>
      </nav>

      {mobileOpen && <MobileMenu onClose={() => setMobileOpen(false)} onSearch={() => setSearchOpen(true)} />}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </header>
  )
}

function UtilityBar() {
  return (
    <nav className="hidden h-10 bg-navDark lg:block">
      <div className="mx-auto flex h-full max-w-page items-center justify-between px-6 lg:px-24">
        <div className="flex h-full items-center">
          {siteConfig.navigation.utilityLeft.map((item, i) => (
            <Link
              key={item.label}
              to="/"
              className={cn(
                'flex h-full items-center px-4 text-[13px] font-medium text-white/75',
                i === 0 && 'bg-white/40 text-white',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
        <div className="flex h-full items-center">
          {siteConfig.navigation.utilityRight.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="flex h-full items-center px-3.5 text-[13px] font-medium text-white/75 hover:text-white"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  )
}

function MegaNavItem({
  item,
  pathname,
  open,
  onOpen,
  onClose,
}: {
  item: MegaItem
  pathname: string
  open: boolean
  onOpen: () => void
  onClose: () => void
}) {
  const active = item.href ? pathname.startsWith(item.href) : false

  return (
    <div className="relative h-full" onMouseEnter={onOpen} onMouseLeave={onClose}>
      {item.href ? (
        <Link
          to={item.href}
          className={cn(
            'flex h-full items-center px-4 text-nav text-text-secondary hover:text-primary',
            (open || active) && 'text-primary',
          )}
        >
          {item.label}
        </Link>
      ) : (
        <button
          type="button"
          className={cn(
            'flex h-full items-center px-4 text-nav text-text-secondary hover:text-primary',
            open && 'text-primary',
          )}
        >
          {item.label}
        </button>
      )}

      {open && (
        <div className="absolute left-1/2 top-full z-50 w-[min(720px,90vw)] -translate-x-1/2 rounded-b-lg bg-surface p-8 shadow-md">
          <div className="grid gap-8" style={{ gridTemplateColumns: `repeat(${item.columns.length}, minmax(0, 1fr))` }}>
            {item.columns.map((col) => (
              <div key={col.title}>
                <p className="mb-3 text-small font-semibold text-text">{col.title}</p>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.href} className="text-small text-text-secondary hover:text-secondary">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function LoginControl() {
  const { user, customer, isLoading, logout } = useUser()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isLoading) {
    return <span className="inline-block h-10 w-24" />
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          to="/cuenta"
          className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-small font-medium text-white hover:bg-highlight"
        >
          {customer?.firstName || user.name || user.email}
        </Link>
        <button
          type="button"
          onClick={logout}
          className="text-small font-medium text-text-secondary hover:text-primary"
        >
          Cerrar sesión
        </button>
      </div>
    )
  }

  return (
    <Link
      to="/login"
      search={{ returnUrl: pathname }}
      className="inline-flex h-10 items-center rounded-full bg-secondary px-4 text-small font-medium text-white hover:bg-highlight"
    >
      Iniciar sesión
    </Link>
  )
}

function MobileMenu({ onClose, onSearch }: { onClose: () => void; onSearch: () => void }) {
  const { toggleOpen } = useAssistant()
  const { user, customer, isLoading, logout } = useUser()
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-border bg-surface lg:hidden">
      {!isLoading && user && (
        <div className="flex items-center gap-3 border-b border-border px-6 py-4">
          <span className="text-small text-text-secondary">
            Hola, {customer?.firstName || user.name || user.email}
            {customer?.cmrTier ? ` · ${customer.cmrTier}` : ''}
          </span>
        </div>
      )}
      <div className="flex gap-3 px-6 py-4">
        <Link
          to="/beneficios"
          onClick={onClose}
          className="flex-1 rounded-full border-[1.5px] border-hazteBg bg-hazteBg py-2.5 text-center text-small font-medium text-primary"
        >
          Hazte cliente
        </Link>
        {!isLoading && user ? (
          <Link
            to="/cuenta"
            onClick={onClose}
            className="flex-1 rounded-full bg-secondary py-2.5 text-center text-small font-medium text-white"
          >
            Mi Cuenta
          </Link>
        ) : (
          <Link
            to="/login"
            search={{ returnUrl: pathname }}
            onClick={onClose}
            className="flex-1 rounded-full bg-secondary py-2.5 text-center text-small font-medium text-white"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          onClose()
          onSearch()
        }}
        className="flex w-full items-center gap-2 px-6 py-3 text-small text-secondary"
      >
        <Search className="h-4 w-4" /> Buscar
      </button>
      {siteConfig.navigation.megaMenu.map((item) => (
        <div key={item.label} className="border-t border-border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-6 py-3 text-left text-small font-semibold text-text"
            onClick={() => setExpanded((v) => (v === item.label ? null : item.label))}
          >
            {item.label}
            <ChevronDown className={cn('h-4 w-4 transition-transform', expanded === item.label && 'rotate-180')} />
          </button>
          {expanded === item.label && (
            <div className="space-y-4 px-6 pb-4">
              {item.columns.map((col) => (
                <div key={col.title}>
                  <p className="mb-1 text-[12px] font-semibold uppercase tracking-wide text-text-secondary">{col.title}</p>
                  {col.links.map((link) => (
                    <Link
                      key={link.label}
                      to={link.href}
                      onClick={onClose}
                      className="block py-1 text-small text-text"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {!isLoading && user && (
        <button
          type="button"
          onClick={() => {
            logout()
            onClose()
          }}
          className="w-full border-t border-border px-6 py-4 text-left text-small font-medium text-primary"
        >
          Cerrar sesión
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onClose()
          toggleOpen()
        }}
        className="w-full border-t border-border px-6 py-4 text-left text-small font-medium text-secondary"
      >
        Hablar con el Asistente
      </button>
    </div>
  )
}
