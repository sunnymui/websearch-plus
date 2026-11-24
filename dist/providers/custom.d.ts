import type { CustomProviderConfig } from "../options.js";
import type { SearchResult } from "../router.js";
/**
 * Calls a declaratively configured JSON search API and maps its response into normalized results.
 *
 * GET providers receive the query as a URL parameter; POST providers receive a JSON body. API
 * keys are sent as a bearer token or configured header and never stored with result metadata.
 *
 * @param input Provider definition, query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized results mapped from the provider's JSON response.
 */
export declare const searchCustomProvider: (input: {
    readonly config: CustomProviderConfig;
    readonly query: string;
    readonly apiKey: string;
    readonly signal: AbortSignal;
    readonly maxResults: number;
    readonly fetch?: typeof globalThis.fetch;
}) => Promise<readonly SearchResult[]>;
