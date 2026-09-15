'use client'

import { MessageCircle } from 'lucide-react'

import { useAssistant } from '@/contexts/assistant-context'

export function ChatFab() {
  const { isOpen, toggleOpen } = useAssistant()

  if (isOpen) return null

  return (
    <button
      type="button"
      onClick={toggleOpen}
      aria-label="Contáctanos"
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#4a4f54] text-white shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-6 w-6" strokeWidth={1.75} />
    </button>
  )
}
