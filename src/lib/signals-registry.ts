/**
 * Signals registry client. The Node SDK only reads attributes; publishing
 * attribute keys / groups / services / interventions / event logs goes through
 * the Console-authenticated REST API that the Python SDK used to wrap.
 */
import { getSignalsEnv, signalsEnvDetails } from './signals-env'
import {
  benefitsAgentContextService,
  benefitsAnonymousBehavior,
  benefitsAssistantContext,
  benefitsSessionBehavior,
  customerIdKey,
  travelIntentNudge,
} from './signals-definitions'

export class SignalsRegistryError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly endpoint: string,
    readonly body: string,
  ) {
    super(message)
    this.name = 'SignalsRegistryError'
  }
}

type JsonObject = Record<string, unknown>

let cachedToken: string | null = null

function consoleTokenUrl(organizationId: string): string {
  const host =
    process.env.BDP_NEXT == null
      ? 'https://console.snowplowanalytics.com'
      : 'https://next.console.snowplowanalytics.com'
  return `${host}/api/msc/v1/organizations/${organizationId}/credentials/v3/token`
}

function isJwtExpired(token: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString()) as {
      exp?: number
    }
    return typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now() + 30_000
  } catch {
    return true
  }
}

async function getAccessToken(): Promise<{ token: string; baseUrl: string }> {
  const env = getSignalsEnv()
  const details = signalsEnvDetails(env)

  if (!env.baseUrl || env.baseUrl.startsWith('[')) {
    throw new SignalsRegistryError('Missing SIGNALS_API_ENDPOINT', 500, 'auth', JSON.stringify(details))
  }

  if (env.sandboxToken) {
    return { token: env.sandboxToken, baseUrl: env.baseUrl.replace(/\/$/, '') }
  }

  if (!env.apiKey || !env.apiKeyId || !env.organizationId) {
    throw new SignalsRegistryError(
      'Missing SIGNALS_API_KEY / SIGNALS_API_KEY_ID / SNOWPLOW_CONSOLE_ORG_ID',
      500,
      'auth',
      JSON.stringify(details),
    )
  }

  if (cachedToken && !isJwtExpired(cachedToken)) {
    return { token: cachedToken, baseUrl: env.baseUrl.replace(/\/$/, '') }
  }

  const response = await fetch(consoleTokenUrl(env.organizationId), {
    headers: {
      'X-API-Key-Id': env.apiKeyId,
      'X-API-Key': env.apiKey,
      'X-Signals-Sdk-Name': 'signals-node-registry banco-falabella-demo',
    },
  })

  if (!response.ok) {
    throw new SignalsRegistryError(
      `Failed to fetch Console token (${response.status})`,
      response.status,
      'console/token',
      await response.text(),
    )
  }

  const json = (await response.json()) as { accessToken?: string }
  if (!json.accessToken) {
    throw new SignalsRegistryError('Console token response missing accessToken', 500, 'console/token', '')
  }

  cachedToken = json.accessToken
  return { token: cachedToken, baseUrl: env.baseUrl.replace(/\/$/, '') }
}

async function registryRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  data?: unknown,
): Promise<JsonObject> {
  const { token, baseUrl } = await getAccessToken()
  const response = await fetch(`${baseUrl}/api/v1/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
      'X-Signals-Sdk-Name': 'signals-node-registry banco-falabella-demo',
    },
    body: data ? JSON.stringify(data) : undefined,
  })

  const text = await response.text()
  if (![200, 201, 202].includes(response.status)) {
    throw new SignalsRegistryError(
      `Signals registry ${method} ${endpoint} failed (${response.status})`,
      response.status,
      endpoint,
      text,
    )
  }

  if (!text) return {}
  try {
    return JSON.parse(text) as JsonObject
  } catch {
    throw new SignalsRegistryError(
      `Signals registry ${method} ${endpoint} returned non-JSON`,
      response.status,
      endpoint,
      text,
    )
  }
}

function isAlreadyPublishedError(error: SignalsRegistryError): boolean {
  const body = error.body.toLowerCase()
  return (
    body.includes('cannot update published') ||
    body.includes('already exists') ||
    body.includes('already published') ||
    body.includes('nothing to publish')
  )
}

async function createOrUpdate(collection: string, payload: unknown, putPath: string): Promise<JsonObject> {
  try {
    return await registryRequest('POST', `registry/${collection}/`, payload)
  } catch (error) {
    if (!(error instanceof SignalsRegistryError) || (error.status !== 400 && error.status !== 409)) {
      throw error
    }
    try {
      return await registryRequest('PUT', `registry/${putPath}`, payload)
    } catch (putError) {
      if (
        putError instanceof SignalsRegistryError &&
        (putError.status === 409 || isAlreadyPublishedError(putError))
      ) {
        return { skipped: true, reason: 'already_published' }
      }
      throw putError
    }
  }
}

export interface PublishStepResult {
  type: string
  name: string
  ok: boolean
  error?: string
}

export async function publishSignalsRegistry(): Promise<PublishStepResult[]> {
  const jobs: Array<{ type: string; name: string; run: () => Promise<void> }> = [
    {
      type: 'attribute_key',
      name: customerIdKey.name,
      run: () => createOrUpdate('attribute_keys', customerIdKey, `attribute_keys/${customerIdKey.name}`).then(() => undefined),
    },
    {
      type: 'attribute_group',
      name: benefitsSessionBehavior.name,
      run: () =>
        createOrUpdate(
          'attribute_groups',
          benefitsSessionBehavior,
          `attribute_groups/${benefitsSessionBehavior.name}/versions/${benefitsSessionBehavior.version}`,
        ).then(() => undefined),
    },
    {
      type: 'attribute_group',
      name: benefitsAnonymousBehavior.name,
      run: () =>
        createOrUpdate(
          'attribute_groups',
          benefitsAnonymousBehavior,
          `attribute_groups/${benefitsAnonymousBehavior.name}/versions/${benefitsAnonymousBehavior.version}`,
        ).then(() => undefined),
    },
    {
      type: 'event_log',
      name: benefitsAssistantContext.name,
      run: async () => {
        await createOrUpdate(
          'event_logs',
          benefitsAssistantContext,
          `event_logs/${benefitsAssistantContext.name}`,
        )
        await registryRequest('POST', 'engines/publish', {
          event_logs: [{ name: benefitsAssistantContext.name }],
        }).catch((error) => {
          if (error instanceof SignalsRegistryError && isAlreadyPublishedError(error)) return {}
          throw error
        })
      },
    },
    {
      type: 'service',
      name: benefitsAgentContextService.name,
      run: () =>
        createOrUpdate(
          'services',
          benefitsAgentContextService,
          `services/${benefitsAgentContextService.name}`,
        ).then(() => undefined),
    },
    {
      type: 'intervention',
      name: travelIntentNudge.name,
      run: () =>
        createOrUpdate(
          'interventions',
          travelIntentNudge,
          `interventions/${travelIntentNudge.name}/versions/${travelIntentNudge.version}`,
        ).then(() => undefined),
    },
  ]

  const results: PublishStepResult[] = []
  for (const job of jobs) {
    try {
      await job.run()
      results.push({ type: job.type, name: job.name, ok: true })
    } catch (error) {
      const message =
        error instanceof SignalsRegistryError
          ? `${error.message}: ${error.body.slice(0, 500)}`
          : error instanceof Error
            ? error.message
            : String(error)
      results.push({ type: job.type, name: job.name, ok: false, error: message })
      break
    }
  }
  return results
}

export function isSignalsPublishAuthorized(request: Request): boolean {
  const secret = process.env.SIGNALS_PUBLISH_SECRET
  if (secret) {
    const header = request.headers.get('authorization') ?? request.headers.get('x-signals-publish-secret') ?? ''
    const token = header.replace(/^Bearer\s+/i, '').trim()
    return token === secret
  }
  return process.env.NODE_ENV !== 'production'
}
