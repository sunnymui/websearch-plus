import type { Context } from "@opencode/plugin/promise/plugin"
import { customProviderIntegrationID, apiKeyForIntegration } from "./integrations.js"
import type { WebSearchPlusOptions } from "./options.js"
import { pluginNativeProvider } from "./provider-registry.js"
import { FallbackRouter, type SearchResult } from "./router.js"
import { ProviderStatusStore } from "./status.js"
import { searchCustomProvider } from "./providers/custom.js"

const keylessBuiltInProviders = new Set(["exa", "tavily", "parallel", "firecrawl"])

/**
 * Creates the fallback router used by the WebSearch+ provider.
 *
 * It resolves credentials, distinguishes custom/native/built-in providers, dispatches the
 * matching adapter, and records safe attempt and completion metadata through the status store.
 *
 * @param input OpenCode services, normalized options, status store, and available built-in IDs.
 * @returns A configured fallback router for WebSearch+ calls.
 */
export const createProviderRouter = (input: {
  readonly context: Context
  readonly options: WebSearchPlusOptions
  readonly status: ProviderStatusStore
  readonly builtInProviderIDs: ReadonlySet<string>
}) => {
  return new FallbackRouter(
    input.options,
    async (providerID) => {
      const customProvider = input.options.customProviders[providerID]
      // Configured providers use their own generated `/connect` integration.
      if (customProvider) {
        return {
          hasApiKey: Boolean(await apiKeyForIntegration(input.context, customProviderIntegrationID(providerID))),
          supportsKeyless: false,
        }
      }
      const nativeProvider = pluginNativeProvider(providerID)
      // Plugin-native adapters are keyed and do not have an OpenCode keyless path.
      if (nativeProvider) {
        return { hasApiKey: Boolean(await apiKeyForIntegration(input.context, nativeProvider.integrationID)), supportsKeyless: false }
      }
      const connection = await input.context.integration.connection.active(providerID)
      return {
        hasApiKey: connection !== undefined,
        supportsKeyless: keylessBuiltInProviders.has(providerID) && input.builtInProviderIDs.has(providerID),
      }
    },
    async ({ providerID, query, signal }) => {
      const customProvider = input.options.customProviders[providerID]
      if (customProvider) {
        const key = await apiKeyForIntegration(input.context, customProviderIntegrationID(providerID))
        if (!key) throw new Error(`${customProvider.name} API key is required`)
        return searchCustomProvider({ config: customProvider, query, apiKey: key, signal, maxResults: input.options.maxResults })
      }
      const nativeProvider = pluginNativeProvider(providerID)
      if (nativeProvider) {
        const key = await apiKeyForIntegration(input.context, nativeProvider.integrationID)
        if (!key) throw new Error(`${nativeProvider.name} API key is required`)
        return nativeProvider.execute({
          query,
          apiKey: key,
          signal,
          maxResults: input.options.maxResults,
          brightDataApiName: input.options.scraperConfig.brightdata.apiName,
        })
      }

      const response = await input.context.websearch.query({ query, providerID })
      return response.data.results as readonly SearchResult[]
    },
    Date.now,
    Math.random,
    (attempt) => input.status.record(attempt),
    (search) => input.status.recordSearch(search),
  )
}
