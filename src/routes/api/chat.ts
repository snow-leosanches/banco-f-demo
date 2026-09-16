import { createFileRoute } from '@tanstack/react-router'
// Side-effect import: pulls in @tanstack/start-client-core's module
// augmentation that adds the `server` option to createFileRoute. Without an
// import from '@tanstack/react-start' somewhere in this file's compilation
// unit, TypeScript never loads that augmentation and `server` type-errors.
import type {} from '@tanstack/react-start'
import { streamText, isStepCount } from 'ai'

import { type Customer } from '@/lib/config'
import { getBenefitsSignalsContext } from '@/lib/signals-server'
import { assembleContext, buildSystemPrompt, type ClientBehaviorSnapshot } from '@/lib/agent-prompt'
import { agentTools, customerToolsContext } from '@/lib/tools'
import { GUEST_USER_ID } from '@/lib/user-id'

// Sentinel wrapping the context metadata sent as the first stream chunk, so
// the client can show "Ver contexto inyectado" — the demo's money-shot
// artifact — before the model's answer starts rendering.
const CTX_START = '__CTX__'
const CTX_END = '__ENDCTX__'

const GUEST_CUSTOMER: Customer = {
  customerId: GUEST_USER_ID,
  firstName: 'Cliente',
  cmrTier: null,
  comuna: 'Santiago',
}

interface ChatRequestBody {
  message: string
  domainSessionId: string | null
  domainUserId: string | null
  signalsEnabled: boolean
  clientBehavior: ClientBehaviorSnapshot
  customer: Customer | null
}

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody

        const customer = body.customer ?? GUEST_CUSTOMER

        const signals = body.signalsEnabled && customer.customerId !== GUEST_CUSTOMER.customerId
          ? await getBenefitsSignalsContext({
              customerId: customer.customerId,
              domainUserId: body.domainUserId ?? null,
              domainSessionId: body.domainSessionId,
            })
          : { groupAttributes: null, agenticNarrative: null, available: false }

        const context = body.signalsEnabled
          ? assembleContext({ customer, signals, clientBehavior: body.clientBehavior })
          : ({ contextBlock: null, contextSource: 'none' } as const)

        const systemPrompt = buildSystemPrompt(context)

        const result = streamText({
          model: 'anthropic/claude-haiku-4.5',
          system: systemPrompt,
          prompt: body.message,
          tools: agentTools,
          toolsContext: customerToolsContext(customer.customerId),
          stopWhen: isStepCount(8),
          onError: ({ error }) => {
            console.error('[api/chat] streamText error', error)
          },
        })

        const ctxHeader = `${CTX_START}${JSON.stringify({
          contextSource: context.contextSource,
          contextBlock: context.contextBlock,
        })}${CTX_END}`

        const encoder = new TextEncoder()
        // If the client disconnects mid-stream (chat closed, new message sent
        // before this one finishes, page navigation, dev-server HMR reload),
        // enqueueing into a controller whose consumer is gone throws. Track
        // it so we stop touching the controller instead of letting that
        // become an unhandled "aborted"/ECONNRESET error at the HTTP layer.
        let clientGone = false
        const safeEnqueue = (controller: ReadableStreamDefaultController<Uint8Array>, text: string) => {
          if (clientGone) return
          try {
            controller.enqueue(encoder.encode(text))
          } catch {
            clientGone = true
          }
        }

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            safeEnqueue(controller, ctxHeader)
            let sawAnyText = false
            try {
              for await (const delta of result.textStream) {
                if (clientGone || request.signal.aborted) break
                sawAnyText = true
                safeEnqueue(controller, delta)
              }
            } catch (error) {
              console.error('[api/chat] streamText failed', error)
            } finally {
              if (!sawAnyText) {
                safeEnqueue(
                  controller,
                  'No pude generar una respuesta en este momento (revisa la configuración del modelo). Intenta nuevamente en unos segundos.',
                )
              }
              if (!clientGone) {
                try {
                  controller.close()
                } catch {
                  // client already gone — nothing left to close
                }
              }
            }
          },
          cancel() {
            // Browser aborted the fetch (navigated away, sent another
            // message, closed the sidebar). Stop touching the controller.
            clientGone = true
          },
        })

        return new Response(stream, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        })
      },
    },
  },
})
