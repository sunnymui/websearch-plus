import type { SearchResult } from "../router.js";
/**
 * Builds a Google Search URL, requests it through ZenRows with rendering and premium proxying,
 * and returns the resulting Markdown as one normalized search result.
 *
 * @param input Query, key, cancellation signal, and optional fetch implementation.
 * @returns One Markdown-backed Google search result, or no results for an empty response.
 */
export declare const searchZenRows: (input: {
    readonly query: string;
    readonly apiKey: string;
    readonly signal: AbortSignal;
    readonly fetch?: typeof globalThis.fetch;
}) => Promise<readonly SearchResult[]>;
