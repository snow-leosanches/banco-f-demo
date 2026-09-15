'use client'

import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'

import { benefits } from '@/lib/config'

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return benefits.slice(0, 6)
    return benefits.filter(
      (b) =>
        b.merchant.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q),
    )
  }, [query])

  return (
    <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}>
      <div
        className="mx-auto mt-24 w-full max-w-xl rounded-lg bg-surface p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 rounded-md border border-border px-4 py-3">
          <Search className="h-4 w-4 text-secondary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="¿Qué estás buscando?"
            className="flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-secondary"
          />
          <button type="button" onClick={onClose} aria-label="Cerrar búsqueda" className="text-text-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 text-small font-medium text-text-secondary">Lo más buscado</p>
        <ul className="mt-2 divide-y divide-border">
          {results.map((b) => (
            <li key={b.id}>
              <Link
                to="/beneficios/$benefitId"
                params={{ benefitId: b.id }}
                onClick={onClose}
                className="flex items-center justify-between py-3 text-small hover:text-secondary"
              >
                <span>
                  <span className="font-medium text-text">{b.merchant}</span>
                  <span className="ml-2 text-text-secondary">{b.category}</span>
                </span>
                <span className="font-semibold text-secondary">{b.discountPct}% dcto.</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
