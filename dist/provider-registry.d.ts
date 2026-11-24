import type { SearchResult } from "./router.js";
export interface PluginNativeProvider {
    readonly id: string;
    readonly name: string;
    readonly integrationID: string;
    readonly execute: (input: {
        readonly query: string;
        readonly apiKey: string;
        readonly signal: AbortSignal;
        readonly maxResults: number;
        readonly brightDataApiName: string;
    }) => Promise<readonly SearchResult[]>;
}
/** Declarative catalog of provider adapters implemented by WebSearch+. */
export declare const pluginNativeProviders: readonly PluginNativeProvider[];
/**
 * Looks up the declarative plugin-native provider definition for a stable provider ID.
 *
 * Returns `undefined` for OpenCode built-ins and configuration-defined custom providers.
 *
 * @param providerID Provider ID to look up.
 * @returns The native provider definition, or `undefined` when it is not plugin-native.
 */
export declare const pluginNativeProvider: (providerID: string) => PluginNativeProvider | undefined;
