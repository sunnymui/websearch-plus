import type { ProviderID, WebSearchPlusOptions } from "./options.js";
export interface SearchResult {
    readonly url: string;
    readonly title?: string;
    readonly content?: string;
    readonly time: {
        readonly published?: number;
    };
}
export interface SearchFailure {
    readonly message: string;
    readonly status?: number;
    readonly retryAfterMs?: number;
}
export interface ProviderAttempt {
    readonly providerID: ProviderID;
    readonly mode: "authenticated" | "anonymous" | "skipped";
    readonly outcome: "success" | "empty" | "failure" | "skipped";
    readonly status?: number;
    readonly latencyMs?: number;
}
export type AttemptObserver = (input: {
    readonly attempt: ProviderAttempt;
    readonly cooldownUntil?: number;
}) => Promise<void>;
export type SearchObserver = (search: SearchCompletion) => Promise<void>;
export interface SearchExecution {
    readonly providerID: ProviderID;
    readonly results: readonly SearchResult[];
    readonly attempts: readonly ProviderAttempt[];
}
export interface SearchCompletion {
    readonly completedAt: number;
    readonly providerID?: ProviderID;
    readonly attempts: readonly ProviderAttempt[];
}
export type ProviderExecutor = (input: {
    readonly providerID: ProviderID;
    readonly query: string;
    readonly signal: AbortSignal;
}) => Promise<readonly SearchResult[]>;
export type ProviderInspector = (providerID: ProviderID) => Promise<{
    readonly hasApiKey: boolean;
    readonly supportsKeyless: boolean;
}>;
/** Coordinates provider selection, execution, fallback, timeouts, and cooldowns for one plugin instance. */
export declare class FallbackRouter {
    #private;
    private readonly options;
    private readonly inspect;
    private readonly execute;
    private readonly now;
    private readonly random;
    private readonly observeAttempt?;
    private readonly observeSearch?;
    constructor(options: WebSearchPlusOptions, inspect: ProviderInspector, execute: ProviderExecutor, now?: () => number, random?: () => number, observeAttempt?: AttemptObserver | undefined, observeSearch?: SearchObserver | undefined);
    /**
     * Searches providers in policy order, applying timeouts, fallback, and cooldowns.
     *
     * @param query Search terms passed to each provider.
     * @param signal Signal that cancels the overall web-search call.
     * @param providerOverride Optional provider that bypasses strategy and fallback selection.
     * @returns The selected provider, normalized results, and safe attempt history.
     */
    search(query: string, signal: AbortSignal, providerOverride?: ProviderID): Promise<SearchExecution>;
}
