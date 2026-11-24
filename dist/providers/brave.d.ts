import type { SearchResult } from "../router.js";
/**
 * Queries Brave LLM Context and maps grounding records to WebSearch+ results.
 *
 * Multiple snippets for one grounding URL are combined into one result body.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized Brave grounding results.
 */
export declare const searchBrave: (input: {
    readonly query: string;
    readonly apiKey: string;
    readonly signal: AbortSignal;
    readonly maxResults: number;
    readonly fetch?: typeof globalThis.fetch;
}) => Promise<readonly SearchResult[]>;
