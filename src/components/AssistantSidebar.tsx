'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Send, Sparkles, X } from 'lucide-react'

import { useAssistant, type ChatMessage } from '@/contexts/assistant-context'
import { isSignalsEnabled } from '@/lib/consent'
import { INTENT_LABELS, type JevTriage } from '@/lib/jev-decision'
import { PaltaMark } from '@/components/Logo'
import { cn } from '@/lib/utils'

const SUGGESTED_PROMPTS = [
  '¿Qué beneficios tengo este mes?',
  '¿Qué beneficios visité recién?',
  '¿Qué beneficio me conviene ver ahora?',
  '¿Qué comercios me convienen ahora?',
]

export function AssistantSidebar() {
  const { isOpen, closeAssistant, messages, isSending, sendMessage, answerEngine, setAnswerEngine } = useAssistant()
  const [input, setInput] = useState('')
  const [signalsOn, setSignalsOn] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setSignalsOn(isSignalsEnabled())
    const handler = (e: Event) => setSignalsOn((e as CustomEvent<{ enabled: boolean }>).detail.enabled)
    window.addEventListener('signalsPreferenceChanged', handler)
    return () => window.removeEventListener('signalsPreferenceChanged', handler)
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  if (!isOpen) return null

  const submit = (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || isSending) return
    void sendMessage(trimmed)
    setInput('')
  }

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-3">
          <PaltaMark className="h-8 w-8" />
          <div>
            <h2 className="font-heading text-h4 text-text">Asistente Banco F</h2>
            <span
              className={cn(
                'mt-1 inline-flex items-center gap-1.5 text-small font-medium',
                signalsOn ? 'text-secondary' : 'text-text-secondary',
              )}
            >
              <span className={cn('h-1.5 w-1.5 rounded-full', signalsOn ? 'bg-lime' : 'bg-gray-400')} />
              Signals {signalsOn ? 'activado' : 'desactivado'}
            </span>
            {answerEngine === 'jev' && (
              <span className="mt-0.5 block text-[11px] font-medium text-text-secondary">Jev clasifica, Claude responde</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-full bg-sectionGray p-0.5 text-[11px] font-medium" role="group" aria-label="Motor de respuesta">
            <button
              type="button"
              onClick={() => setAnswerEngine('claude')}
              aria-pressed={answerEngine === 'claude'}
              className={cn(
                'rounded-full px-2.5 py-1',
                answerEngine === 'claude' ? 'bg-secondary text-white' : 'text-text-secondary',
              )}
            >
              Claude
            </button>
            <button
              type="button"
              onClick={() => setAnswerEngine('jev')}
              aria-pressed={answerEngine === 'jev'}
              className={cn(
                'rounded-full px-2.5 py-1',
                answerEngine === 'jev' ? 'bg-secondary text-white' : 'text-text-secondary',
              )}
            >
              Jev
            </button>
          </div>
          <button onClick={closeAssistant} aria-label="Cerrar asistente" className="text-text-secondary hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="rounded-[16px] bg-mint p-4">
            <p className="text-small text-text-secondary">
              Pregúntame por tus beneficios, lo que miraste recién, qué te conviene ver ahora o en qué comercios.
            </p>
            <div className="mt-3 flex flex-col items-start gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => submit(prompt)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-secondary px-4 py-2 text-left text-small font-medium text-secondary hover:bg-white"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble key={i} message={m} />
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          submit(input)
        }}
        className="flex items-center gap-2 border-t border-border px-4 py-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe tu pregunta..."
          className="flex-1 rounded-full border border-border bg-sectionGray px-4 py-2 text-small text-text outline-none focus:border-secondary"
        />
        <button
          type="submit"
          disabled={isSending}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-white transition-colors hover:bg-highlight disabled:opacity-50"
          aria-label="Enviar"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const [showContext, setShowContext] = useState(false)
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[85%] rounded-[16px] px-4 py-3 text-body', isUser ? 'bg-secondary text-white' : 'bg-mint text-text')}>
        <p className="whitespace-pre-wrap">{message.content || (isUser ? '' : '…')}</p>

        {!isUser && message.jev && <JevChip decision={message.jev} />}

        {!isUser && message.contextBlock && (
          <button
            onClick={() => setShowContext((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-small font-medium text-secondary"
          >
            {showContext ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            Ver contexto inyectado
            {message.contextSource === 'local-fallback' && ' (fallback local)'}
          </button>
        )}

        {!isUser && showContext && message.contextBlock && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-white p-3 text-[11px] leading-relaxed text-text-secondary">
            {message.contextBlock}
          </pre>
        )}
      </div>
    </div>
  )
}

function JevChip({ decision }: { decision: JevTriage }) {
  const [open, setOpen] = useState(false)
  const pct = decision.intentProbability == null ? null : Math.round(decision.intentProbability * 100)
  const entries = decision.probabilities
    ? (Object.entries(decision.probabilities) as Array<[keyof typeof INTENT_LABELS, number]>).sort((a, b) => b[1] - a[1])
    : []

  return (
    <div className="mt-2 border-t border-secondary/15 pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-small font-medium text-secondary"
      >
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        Jev · {decision.label}
        {pct != null ? ` · ${pct}%` : ''}
        {decision.routed ? '' : ' · revisión'}
      </button>
      {open && (
        <div className="mt-2 space-y-2 text-[11px] leading-relaxed text-text-secondary">
          <p>Datos del cliente: {Math.round(decision.needsPersonalData * 100)}%.</p>
          <p>
            Sensibilidad: {decision.sensitivityLabel} ({decision.sensitivity.toFixed(2)}).
          </p>
          <p>
            {decision.routed
              ? 'Umbral superado: el modelo de texto solo ve las herramientas de esta clase.'
              : 'Bajo el umbral: el modelo de texto conserva todas las herramientas.'}
          </p>
          {entries.map(([key, probability]) => (
            <div key={key}>
              <div className="flex justify-between gap-3">
                <span>{INTENT_LABELS[key]}</span>
                <span>{Math.round(probability * 100)}%</span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-white">
                <div className="h-full bg-secondary" style={{ width: `${Math.round(probability * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
