import { searchBrave } from "./providers/brave.js";
import { searchBrightData } from "./providers/brightdata.js";
import { searchNimble } from "./providers/nimble.js";
import { searchTinyFish } from "./providers/tinyfish.js";
import { searchZenRows } from "./providers/zenrows.js";
/** Declarative catalog of provider adapters implemented by WebSearch+. */
export const pluginNativeProviders = [
    {
        id: "brave",
        name: "Brave LLM Context",
        integrationID: "websearch-plus-brave",
        execute: ({ query, apiKey, signal, maxResults }) => searchBrave({ query, apiKey, signal, maxResults }),
    },
    {
        id: "nimble",
        name: "Nimble Search",
        integrationID: "websearch-plus-nimble",
        execute: ({ query, apiKey, signal, maxResults }) => searchNimble({ query, apiKey, signal, maxResults }),
    },
    {
        id: "tinyfish",
        name: "TinyFish Search",
        integrationID: "websearch-plus-tinyfish",
        execute: ({ query, apiKey, signal, maxResults }) => searchTinyFish({ query, apiKey, signal, maxResults }),
    },
    {
        id: "brightdata",
        name: "Bright Data",
        integrationID: "websearch-plus-brightdata",
        execute: ({ query, apiKey, signal, brightDataApiName }) => searchBrightData({ query, apiKey, apiName: brightDataApiName, signal }),
    },
    {
        id: "zenrows",
        name: "ZenRows",
        integrationID: "websearch-plus-zenrows",
        execute: ({ query, apiKey, signal }) => searchZenRows({ query, apiKey, signal }),
    },
];
/**
 * Looks up the declarative plugin-native provider definition for a stable provider ID.
 *
 * Returns `undefined` for OpenCode built-ins and configuration-defined custom providers.
 *
 * @param providerID Provider ID to look up.
 * @returns The native provider definition, or `undefined` when it is not plugin-native.
 */
export const pluginNativeProvider = (providerID) => pluginNativeProviders.find((provider) => provider.id === providerID);
