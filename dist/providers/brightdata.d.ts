import type { SearchResult } from "../router.js";
/**
 * Builds a Google Search URL, submits it to the configured Bright Data zone, and returns the
 * resulting Markdown as one normalized search result.
 *
 * @param input Query, key, Bright Data API name, cancellation signal, and optional fetch implementation.
 * @returns One Markdown-backed Google search result, or no results for an empty response.
 */
export declare const searchBrightData: (input: {
    readonly query: string;
    readonly apiKey: string;
    readonly apiName: string;
    readonly signal: AbortSignal;
    readonly fetch?: typeof globalThis.fetch;
}) => Promise<readonly SearchResult[]>;
