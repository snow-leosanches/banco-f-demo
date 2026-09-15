'use client'

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { ExternalLink } from 'lucide-react'

import { siteConfig } from '@/lib/config'
import { resetSession } from '@/lib/snowplow-config'
import { buildUrlWithUtm } from '@/lib/utils'
import { isSignalsEnabled, setSignalsEnabled } from '@/lib/consent'
import { PaltaMark } from '@/components/Logo'

export default function DemoFooter() {
  const navigate = useNavigate()
  const [signalsOn, setSignalsOn] = useState(true)
  const [signalsDropdownOpen, setSignalsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSignalsOn(isSignalsEnabled())
  }, [])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setSignalsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUtmReload = () => {
    resetSession()
    const newUrl = buildUrlWithUtm(window.location.href, siteConfig.marketing.utmParameters)
    window.location.href = newUrl
  }

  const handleManageConsent = () => {
    window.dispatchEvent(new CustomEvent('showConsentManager'))
  }

  const handleSignalsToggle = (enabled: boolean) => {
    setSignalsEnabled(enabled)
    setSignalsOn(enabled)
    setSignalsDropdownOpen(false)
  }

  const handleWatchVideo = () => {
    navigate({ to: '/video' })
  }

  const crossDomainLinks = siteConfig.navigation.footerLinks.filter((link) => link.href.includes('snowplow.io'))
  const social = siteConfig.business.social

  return (
    <footer className="bg-footerBg text-white">
      <div className="mx-auto max-w-page px-6 py-16 lg:px-24">
        <div className="mb-10">
          <PaltaMark className="h-10 w-10" />
        </div>
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          {siteConfig.navigation.footerColumns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-4 text-[16px] font-normal uppercase tracking-[2px] text-footerMuted">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-[14px] font-normal text-white hover:text-lime">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {social.linkedin && (
            <SocialDot href={social.linkedin} label="Banco F en LinkedIn">
              in
            </SocialDot>
          )}
          {social.instagram && (
            <SocialDot href={social.instagram} label="Banco F en Instagram">
              ig
            </SocialDot>
          )}
          {social.youtube && (
            <SocialDot href={social.youtube} label="Banco F en YouTube">
              yt
            </SocialDot>
          )}
          {social.facebook && (
            <SocialDot href={social.facebook} label="Banco F en Facebook">
              f
            </SocialDot>
          )}
          {social.x && (
            <SocialDot href={social.x} label="Banco F en X">
              X
            </SocialDot>
          )}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-page space-y-3 px-6 py-6 text-[12px] leading-relaxed text-footerMuted lg:px-24">
          <p>
            Infórmese sobre las entidades autorizadas para emitir Tarjetas de Pago en el país, quienes se encuentran
            inscritas en los Registros de Emisores de Tarjetas que lleva la CMF, en{' '}
            <a href="https://www.cmfchile.cl" className="underline" target="_blank" rel="noopener noreferrer">
              www.cmfchile.cl
            </a>
            .
          </p>
          <p>
            Infórmese sobre la garantía estatal de los depósitos en su banco o en{' '}
            <a href="https://www.cmfchile.cl" className="underline" target="_blank" rel="noopener noreferrer">
              cmfchile.cl
            </a>
            . © {new Date().getFullYear()} Banco F. Todos los derechos reservados.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-page flex-wrap items-center gap-4 px-6 py-4 text-[12px] text-white/50 lg:px-24">
          <div className="flex flex-wrap items-center gap-4">
            {siteConfig.features.utmParameters && (
              <button onClick={handleUtmReload} className="hover:text-white">
                UTM Reload
              </button>
            )}

            {siteConfig.features.consent && (
              <button onClick={handleManageConsent} className="hover:text-white">
                Manage Consent
              </button>
            )}

            {siteConfig.features.signals && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setSignalsDropdownOpen(!signalsDropdownOpen)}
                  className="inline-flex items-center gap-1.5 hover:text-white"
                >
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${signalsOn ? 'bg-lime' : 'bg-gray-400'}`} />
                  Signals {signalsOn ? 'ON' : 'OFF'}
                </button>

                {signalsDropdownOpen && (
                  <div className="absolute bottom-full left-0 z-50 mb-1 w-40 overflow-hidden rounded-md border border-border bg-white shadow-lg">
                    <button
                      onClick={() => handleSignalsToggle(true)}
                      className={`w-full px-3 py-2 text-left text-small hover:bg-gray-50 ${signalsOn ? 'font-bold text-accent' : 'text-gray-700'}`}
                    >
                      Enable Signals
                    </button>
                    <button
                      onClick={() => handleSignalsToggle(false)}
                      className={`w-full px-3 py-2 text-left text-small hover:bg-gray-50 ${!signalsOn ? 'font-bold text-gray-900' : 'text-gray-700'}`}
                    >
                      Disable Signals
                    </button>
                  </div>
                )}
              </div>
            )}

            {siteConfig.features.video && (
              <button onClick={handleWatchVideo} className="hover:text-white">
                Watch Video
              </button>
            )}
          </div>

          <div className="ml-auto flex flex-shrink-0 items-center gap-4">
            {crossDomainLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-white"
              >
                {link.label}
                <ExternalLink className="h-3 w-3 opacity-50" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialDot({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[11px] font-semibold lowercase text-white hover:bg-white/20"
    >
      {children}
    </a>
  )
}
