import type { Context } from "@opencode/plugin/promise/plugin"
import type { WebSearchPlusOptions } from "./options.js"
import { pluginNativeProviders } from "./provider-registry.js"

/**
 * Returns the stable OpenCode integration ID assigned to a configured custom provider.
 *
 * @param providerID Configured custom provider ID.
 * @returns The integration ID used with OpenCode connections.
 */
export const customProviderIntegrationID = (providerID: string) => `websearch-plus-custom-${providerID}`

/**
 * Registers `/connect` API-key entries for plugin-native and configured custom providers.
 *
 * Integration entries contain labels only. Keys remain managed by OpenCode's connection store.
 *
 * @param context OpenCode plugin context that owns integrations.
 * @param options Normalized provider configuration.
 * @returns A promise that resolves when integrations have been registered.
 */
export const registerProviderIntegrations = async (context: Context, options: WebSearchPlusOptions) => {
  await context.integration.transform((editor) => {
    for (const provider of pluginNativeProviders) {
      editor.update(provider.integrationID, (integration) => {
        integration.name = provider.name
      })
      editor.method.update({
        integrationID: provider.integrationID,
        method: { type: "key", label: `${provider.name} API key` },
      })
    }

    for (const [providerID, provider] of Object.entries(options.customProviders)) {
      const integrationID = customProviderIntegrationID(providerID)
      editor.update(integrationID, (integration) => {
        integration.name = provider.name
      })
      editor.method.update({
        integrationID,
        method: { type: "key", label: `${provider.name} API key` },
      })
    }
  })
}

/**
 * Resolves an active OpenCode key connection for one integration.
 *
 * The key is returned only for an in-memory outbound provider request and is never persisted,
 * logged, or returned through diagnostics.
 *
 * @param context OpenCode plugin context that owns integrations.
 * @param integrationID Integration whose active key connection should be resolved.
 * @returns The active API key, or `undefined` when no key connection exists.
 */
export const apiKeyForIntegration = async (context: Context, integrationID: string) => {
  const connection = await context.integration.connection.active(integrationID)
  if (!connection) return undefined
  const credential = await context.integration.connection.resolve(connection)
  return credential?.type === "key" ? credential.key : undefined
}
