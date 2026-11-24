import type { SearchResult } from "../router.js";
/**
 * Queries TinyFish Search and maps its URL, title, and snippet fields to WebSearch+ results.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized TinyFish results.
 */
export declare const searchTinyFish: (input: {
    readonly query: string;
    readonly apiKey: string;
    readonly signal: AbortSignal;
    readonly maxResults: number;
    readonly fetch?: typeof globalThis.fetch;
}) => Promise<readonly SearchResult[]>;
