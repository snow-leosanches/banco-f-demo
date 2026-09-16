import { createFileRoute } from '@tanstack/react-router'
import type {} from '@tanstack/react-start'

import { signalsRegistryCatalog } from '@/lib/signals-definitions'
import {
  isSignalsPublishAuthorized,
  publishSignalsRegistry,
  SignalsRegistryError,
} from '@/lib/signals-registry'
import { getSignalsEnv, signalsEnvDetails } from '@/lib/signals-env'

export const Route = createFileRoute('/api/signals/registry')({
  server: {
    handlers: {
      GET: async () => {
        return Response.json({
          objects: signalsRegistryCatalog,
          diagnostic: signalsEnvDetails(getSignalsEnv()),
        })
      },
      POST: async ({ request }) => {
        if (!isSignalsPublishAuthorized(request)) {
          return Response.json(
            {
              error: 'Unauthorized',
              message:
                'Set SIGNALS_PUBLISH_SECRET and send it as Authorization: Bearer <secret>. Required in production so the Vercel URL cannot republish Console objects.',
            },
            { status: 401 },
          )
        }

        try {
          const published = await publishSignalsRegistry()
          const requiredOk = published
            .filter((step) => !step.type.endsWith('_delete'))
            .every((step) => step.ok)
          const ok = published.length > 0 && requiredOk
          return Response.json(
            { ok, published, diagnostic: signalsEnvDetails(getSignalsEnv()) },
            { status: ok ? 200 : 500 },
          )
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          const body = error instanceof SignalsRegistryError ? error.body : undefined
          return Response.json(
            {
              ok: false,
              error: 'Failed to publish Signals registry objects',
              message,
              body,
              diagnostic: signalsEnvDetails(getSignalsEnv()),
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
