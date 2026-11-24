import type { SearchResult } from "../router.js";
/**
 * Queries Nimble Search and maps its result records to WebSearch+ results.
 *
 * Full content is preferred; the provider description is used when full content is absent.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized Nimble results.
 */
export declare const searchNimble: (input: {
    readonly query: string;
    readonly apiKey: string;
    readonly signal: AbortSignal;
    readonly maxResults: number;
    readonly fetch?: typeof globalThis.fetch;
}) => Promise<readonly SearchResult[]>;
