/**
 * Shared Signals / Console credentials. Used by the retrieval client
 * (`signals-server`) and the registry publisher (`signals-registry`).
 */
export interface SignalsEnv {
  baseUrl: string | null
  apiKey: string | null
  apiKeyId: string | null
  organizationId: string | null
  sandboxToken: string | null
}

export function getSignalsEnv(): SignalsEnv {
  return {
    baseUrl:
      process.env.SIGNALS_API_ENDPOINT ??
      process.env.SNOWPLOW_SIGNALS_ENDPOINT ??
      process.env.VITE_SNOWPLOW_SIGNALS_ENDPOINT ??
      null,
    apiKey:
      process.env.SIGNALS_API_KEY ??
      process.env.SNOWPLOW_SIGNALS_API_KEY ??
      process.env.VITE_SNOWPLOW_SIGNALS_API_KEY ??
      null,
    apiKeyId:
      process.env.SIGNALS_API_KEY_ID ??
      process.env.SNOWPLOW_SIGNALS_API_KEY_ID ??
      process.env.VITE_SNOWPLOW_SIGNALS_API_KEY_ID ??
      null,
    organizationId:
      process.env.SNOWPLOW_CONSOLE_ORG_ID ??
      process.env.SNOWPLOW_SIGNALS_ORG_ID ??
      process.env.VITE_SNOWPLOW_SIGNALS_ORG_ID ??
      null,
    sandboxToken:
      process.env.SNOWPLOW_SIGNALS_SANDBOX_TOKEN ??
      process.env.VITE_SNOWPLOW_SIGNALS_SANDBOX_TOKEN ??
      null,
  }
}

export function signalsEnvDetails(env: SignalsEnv) {
  return {
    hasBaseUrl: !!env.baseUrl && !env.baseUrl.startsWith('['),
    hasApiKey: !!env.apiKey,
    hasApiKeyId: !!env.apiKeyId,
    hasOrgId: !!env.organizationId,
    hasSandboxToken: !!env.sandboxToken,
  }
}
