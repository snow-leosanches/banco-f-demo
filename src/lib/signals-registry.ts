/**
 * Signals registry client. The Node SDK only reads attributes; publishing
 * attribute keys / groups / services / interventions / event logs goes through
 * the Console-authenticated REST API that the Python SDK used to wrap.
 */
import { getSignalsEnv, signalsEnvDetails } from './signals-env'
import {
  benefitsAssistantContext,
  customerIdAttributesGroup,
  customerIdKey,
  domainUseridAttributesGroup,
  RETIRED_ATTRIBUTE_GROUPS,
  RETIRED_INTERVENTIONS,
  RETIRED_SERVICES,
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
  if (![200, 201, 202, 204].includes(response.status)) {
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

function isIgnorableMissing(error: SignalsRegistryError): boolean {
  return error.status === 404 || error.body.toLowerCase().includes('not found')
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

/** PUT a published object by unpublishing first, then republishing. */
async function createOrReplacePublished(
  collection: string,
  payload: unknown,
  putPath: string,
  unpublishPayload: JsonObject,
  publishPayload: JsonObject,
): Promise<JsonObject> {
  const result = await createOrUpdate(collection, payload, putPath)
  if (!result.skipped) return result

  await registryRequest('POST', 'engines/unpublish', unpublishPayload).catch((error) => {
    if (error instanceof SignalsRegistryError && (isIgnorableMissing(error) || error.status === 400)) return {}
    throw error
  })
  const updated = await registryRequest('PUT', `registry/${putPath}`, payload)
  await registryRequest('POST', 'engines/publish', publishPayload).catch((error) => {
    if (error instanceof SignalsRegistryError && isAlreadyPublishedError(error)) return {}
    throw error
  })
  return updated
}

async function publishAttributeGroup(group: typeof customerIdAttributesGroup | typeof domainUseridAttributesGroup): Promise<void> {
  await createOrUpdate(
    'attribute_groups',
    group,
    `attribute_groups/${group.name}/versions/${group.version}`,
  )
  await registryRequest('POST', 'engines/publish', {
    attribute_groups: [{ name: group.name, version: group.version }],
  }).catch((error) => {
    if (error instanceof SignalsRegistryError && isAlreadyPublishedError(error)) return {}
    throw error
  })
}

async function unpublishAndDeleteService(name: string): Promise<void> {
  await registryRequest('POST', 'engines/unpublish', {
    services: [{ name }],
  }).catch((error) => {
    if (
      error instanceof SignalsRegistryError &&
      (isIgnorableMissing(error) || error.status === 400 || error.status === 409)
    ) {
      return {}
    }
    throw error
  })

  await registryRequest('DELETE', `registry/services/${name}`).catch((error) => {
    if (error instanceof SignalsRegistryError && (isIgnorableMissing(error) || error.status === 405)) {
      return {}
    }
    throw error
  })
}

async function unpublishAndDelete(
  kind: 'attribute_groups' | 'interventions',
  name: string,
  version: number,
): Promise<void> {
  await registryRequest('POST', 'engines/unpublish', {
    [kind]: [{ name, version }],
  }).catch((error) => {
    if (
      error instanceof SignalsRegistryError &&
      (isIgnorableMissing(error) || error.status === 400 || error.status === 409)
    ) {
      return {}
    }
    throw error
  })

  const paths = [`${kind}/${name}/versions/${version}`, `${kind}/${name}`]
  let lastError: unknown
  for (const path of paths) {
    try {
      await registryRequest('DELETE', `registry/${path}`)
      return
    } catch (error) {
      lastError = error
      if (error instanceof SignalsRegistryError && (isIgnorableMissing(error) || error.status === 405)) {
        continue
      }
      throw error
    }
  }
  if (lastError instanceof SignalsRegistryError && isIgnorableMissing(lastError)) return
  if (lastError) throw lastError
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
      name: customerIdAttributesGroup.name,
      run: () => publishAttributeGroup(customerIdAttributesGroup),
    },
    {
      type: 'attribute_group',
      name: domainUseridAttributesGroup.name,
      run: () => publishAttributeGroup(domainUseridAttributesGroup),
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
      type: 'intervention',
      name: travelIntentNudge.name,
      run: () =>
        createOrReplacePublished(
          'interventions',
          travelIntentNudge,
          `interventions/${travelIntentNudge.name}/versions/${travelIntentNudge.version}`,
          { interventions: [{ name: travelIntentNudge.name, version: travelIntentNudge.version }] },
          { interventions: [{ name: travelIntentNudge.name, version: travelIntentNudge.version }] },
        ).then(() => undefined),
    },
    {
      type: 'attribute_group_delete',
      name: `${customerIdAttributesGroup.name}:1`,
      run: () =>
        registryRequest('POST', 'engines/unpublish', {
          attribute_groups: [{ name: customerIdAttributesGroup.name, version: 1 }],
        })
          .catch((error) => {
            if (
              error instanceof SignalsRegistryError &&
              (isIgnorableMissing(error) || error.status === 400)
            ) {
              return {}
            }
            throw error
          })
          .then(() => undefined),
    },
    {
      type: 'attribute_group_delete',
      name: `${customerIdAttributesGroup.name}:2`,
      run: () =>
        registryRequest('POST', 'engines/unpublish', {
          attribute_groups: [{ name: customerIdAttributesGroup.name, version: 2 }],
        })
          .catch((error) => {
            if (
              error instanceof SignalsRegistryError &&
              (isIgnorableMissing(error) || error.status === 400)
            ) {
              return {}
            }
            throw error
          })
          .then(() => undefined),
    },
    ...RETIRED_SERVICES.map((service) => ({
      type: 'service_delete',
      name: service.name,
      run: () => unpublishAndDeleteService(service.name),
    })),
    ...RETIRED_ATTRIBUTE_GROUPS.map((group) => ({
      type: 'attribute_group_delete',
      name: group.name,
      run: () => unpublishAndDelete('attribute_groups', group.name, group.version),
    })),
    ...RETIRED_INTERVENTIONS.map((intervention) => ({
      type: 'intervention_delete',
      name: intervention.name,
      run: () => unpublishAndDelete('interventions', intervention.name, intervention.version),
    })),
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
      // Old-name cleanup is best-effort: new objects can still be used if Console
      // delete needs a manual unpublish after dependents are retargeted.
      if (!job.type.endsWith('_delete')) break
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
