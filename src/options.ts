import { pluginNativeProviders } from "./provider-registry.js"

export const providerIDs = [
  "exa",
  "tavily",
  "parallel",
  "firecrawl",
  ...pluginNativeProviders.map((provider) => provider.id),
]

export type ProviderID = string & {}
export type Strategy = "first" | "rotate" | "random"
export type RandomProviderPreference = "has-api-key" | "keyless" | "none"

export interface ScraperConfig {
  readonly brightdata: {
    readonly apiName: string
  }
}

export interface CustomProviderConfig {
  readonly name: string
  readonly endpoint: string
  readonly method: "GET" | "POST"
  readonly query: {
    readonly parameter: string
  }
  readonly auth:
    | { readonly type: "bearer" }
    | { readonly type: "header"; readonly name: string }
  readonly results: {
    readonly path: string
    readonly url: string
    readonly title?: string
    readonly content?: string
  }
}

export interface WebSearchPlusOptions {
  readonly providers: readonly ProviderID[]
  readonly strategy: Strategy
  readonly randomProviderPreference: RandomProviderPreference
  readonly perProviderTimeoutMs: number
  readonly totalTimeoutMs: number
  readonly retryStatuses: readonly number[]
  readonly retryOnEmptyResults: boolean
  readonly authFailureMs: number
  readonly rateLimitDefaultMs: number
  readonly transientFailureMs: number
  readonly maxResults: number
  readonly scraperConfig: ScraperConfig
  readonly customProviders: Readonly<Record<string, CustomProviderConfig>>
}

export const defaultOptions: WebSearchPlusOptions = {
  providers: ["exa", "tavily", "parallel", "firecrawl"],
  strategy: "random",
  randomProviderPreference: "has-api-key",
  perProviderTimeoutMs: 10_000,
  totalTimeoutMs: 30_000,
  retryStatuses: [401, 403, 408, 429, 500, 502, 503, 504],
  retryOnEmptyResults: true,
  authFailureMs: 15 * 60_000,
  rateLimitDefaultMs: 60_000,
  transientFailureMs: 30_000,
  maxResults: 8,
  scraperConfig: {
    brightdata: {
      apiName: "serp_api1",
    },
  },
  customProviders: {},
}

const strategies = new Set<Strategy>(["first", "rotate", "random"])
const strategyAliases = new Map<string, Strategy>([
  ["priority", "first"],
  ["round-robin", "rotate"],
])
const preferences = new Set<RandomProviderPreference>(["has-api-key", "keyless", "none"])
const providerSet = new Set<string>(providerIDs)
const providerIDPattern = /^[a-z][a-z0-9-]*$/

/** Checks whether a value is a non-array object suitable for configuration traversal. */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Returns a positive integer or the supplied default. */
const positiveInteger = (value: unknown, fallback: number) =>
  typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback

/** Returns a trimmed non-empty string when the value is valid. */
const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim() ? value.trim() : undefined

/** Validates that a configuration endpoint uses HTTPS. */
const httpsURL = (value: unknown): string | undefined => {
  const url = nonEmptyString(value)
  if (!url) return undefined
  try {
    return new URL(url).protocol === "https:" ? url : undefined
  } catch {
    return undefined
  }
}

/** Validates and normalizes declarative custom JSON search-provider definitions. */
const parseCustomProviders = (value: unknown): Readonly<Record<string, CustomProviderConfig>> => {
  if (!isRecord(value)) return {}

  return Object.fromEntries(
    Object.entries(value).flatMap(([id, definition]) => {
      // Reject collisions and incomplete definitions so configuration cannot replace built-ins.
      if (!providerIDPattern.test(id) || providerSet.has(id) || !isRecord(definition)) return []
      const name = nonEmptyString(definition.name)
      const endpoint = httpsURL(definition.endpoint)
      const method = definition.method === "GET" || definition.method === "POST" ? definition.method : undefined
      const query = isRecord(definition.query) ? nonEmptyString(definition.query.parameter) : undefined
      const results = isRecord(definition.results) ? definition.results : undefined
      const path = results && nonEmptyString(results.path)
      const url = results && nonEmptyString(results.url)
      const title = results && nonEmptyString(results.title)
      const content = results && nonEmptyString(results.content)
      const auth = isRecord(definition.auth) ? definition.auth : undefined
      const parsedAuth = auth?.type === "bearer"
        ? { type: "bearer" as const }
        : auth?.type === "header" && nonEmptyString(auth.name)
          ? { type: "header" as const, name: nonEmptyString(auth.name)! }
          : undefined

      // A custom provider is usable only when request, authentication, and result mapping are complete.
      return name && endpoint && method && query && path && url && parsedAuth
        ? [[id, { name, endpoint, method, query: { parameter: query }, auth: parsedAuth, results: { path, url, ...(title ? { title } : {}), ...(content ? { content } : {}) } }]]
        : []
    }),
  )
}

/**
 * Parses untyped plugin configuration into validated routing options.
 *
 * Invalid values fall back to documented defaults. Custom providers are retained only when
 * their IDs, HTTPS endpoints, authentication, query mapping, and result mapping are complete.
 *
 * @param value Raw plugin options supplied by OpenCode.
 * @returns Validated, normalized WebSearch+ options.
 */
export const parseOptions = (value: unknown): WebSearchPlusOptions => {
  const input = isRecord(value) ? value : {}
  const customProviders = parseCustomProviders(input.customProviders)
  const configuredProviders = Array.isArray(input.providers)
    ? input.providers.filter((provider): provider is ProviderID =>
        typeof provider === "string" && (providerSet.has(provider) || provider in customProviders),
      )
    : defaultOptions.providers
  const cooldowns = isRecord(input.cooldowns) ? input.cooldowns : {}
  const scraperConfig = isRecord(input.scraperConfig) ? input.scraperConfig : {}
  const brightDataConfig = isRecord(scraperConfig.brightdata) ? scraperConfig.brightdata : {}
  const retryStatuses = Array.isArray(input.retryStatuses)
    ? input.retryStatuses.filter((status): status is number => Number.isInteger(status) && status >= 100 && status <= 599)
    : defaultOptions.retryStatuses

  return {
    providers: configuredProviders.length > 0 ? [...new Set(configuredProviders)] : defaultOptions.providers,
    strategy: typeof input.strategy === "string"
      ? (strategies.has(input.strategy as Strategy)
          ? input.strategy as Strategy
          : strategyAliases.get(input.strategy) ?? defaultOptions.strategy)
      : defaultOptions.strategy,
    randomProviderPreference:
      typeof input.randomProviderPreference === "string" &&
      preferences.has(input.randomProviderPreference as RandomProviderPreference)
        ? (input.randomProviderPreference as RandomProviderPreference)
        : defaultOptions.randomProviderPreference,
    perProviderTimeoutMs: positiveInteger(input.perProviderTimeoutMs, defaultOptions.perProviderTimeoutMs),
    totalTimeoutMs: positiveInteger(input.totalTimeoutMs, defaultOptions.totalTimeoutMs),
    retryStatuses: retryStatuses.length > 0 ? retryStatuses : defaultOptions.retryStatuses,
    retryOnEmptyResults:
      typeof input.retryOnEmptyResults === "boolean" ? input.retryOnEmptyResults : defaultOptions.retryOnEmptyResults,
    authFailureMs: positiveInteger(cooldowns.authFailureMs, defaultOptions.authFailureMs),
    rateLimitDefaultMs: positiveInteger(cooldowns.rateLimitDefaultMs, defaultOptions.rateLimitDefaultMs),
    transientFailureMs: positiveInteger(cooldowns.transientFailureMs, defaultOptions.transientFailureMs),
    maxResults: positiveInteger(input.maxResults, defaultOptions.maxResults),
    scraperConfig: {
      brightdata: {
        apiName: typeof brightDataConfig.apiName === "string" && brightDataConfig.apiName.trim()
          ? brightDataConfig.apiName.trim()
          : defaultOptions.scraperConfig.brightdata.apiName,
      },
    },
    customProviders,
  }
}
