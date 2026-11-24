import type { Context } from "@opencode/plugin/promise/plugin";
import type { WebSearchPlusOptions } from "./options.js";
/**
 * Returns the stable OpenCode integration ID assigned to a configured custom provider.
 *
 * @param providerID Configured custom provider ID.
 * @returns The integration ID used with OpenCode connections.
 */
export declare const customProviderIntegrationID: (providerID: string) => string;
/**
 * Registers `/connect` API-key entries for plugin-native and configured custom providers.
 *
 * Integration entries contain labels only. Keys remain managed by OpenCode's connection store.
 *
 * @param context OpenCode plugin context that owns integrations.
 * @param options Normalized provider configuration.
 * @returns A promise that resolves when integrations have been registered.
 */
export declare const registerProviderIntegrations: (context: Context, options: WebSearchPlusOptions) => Promise<void>;
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
export declare const apiKeyForIntegration: (context: Context, integrationID: string) => Promise<string | undefined>;
