import type { ProviderAttempt, SearchCompletion } from "./router.js";
import type { ProviderID } from "./options.js";
import type { Schema } from "effect";
export interface StatusStorage {
    readonly get: (key: string) => Promise<Schema.Json | undefined>;
    readonly set: (key: string, value: Schema.Json) => Promise<void>;
}
export interface ProviderStatus {
    readonly providerID: ProviderID;
    readonly lastAttemptAt?: number;
    readonly lastOutcome?: ProviderAttempt["outcome"];
    readonly lastMode?: ProviderAttempt["mode"];
    readonly lastStatus?: number;
    readonly lastLatencyMs?: number;
    readonly cooldownUntil?: number;
}
export interface SearchHistoryEntry extends SearchCompletion {
}
/** Stores safe provider health and bounded provider-only search history in plugin storage. */
export declare class ProviderStatusStore {
    #private;
    private readonly storage;
    private readonly now;
    constructor(storage: StatusStorage, now?: () => number);
    /**
     * Loads persisted status and history for the configured provider set.
     *
     * @param providerIDs Provider IDs whose latest status should be loaded.
     * @returns A promise that resolves after valid persisted records are hydrated.
     */
    load(providerIDs: readonly ProviderID[]): Promise<void>;
    /**
     * Saves the latest safe outcome and cooldown for a provider.
     *
     * @param input Provider attempt and optional cooldown metadata to persist.
     * @returns A promise that resolves after the status record is saved.
     */
    record(input: {
        readonly attempt: ProviderAttempt;
        readonly cooldownUntil?: number;
    }): Promise<void>;
    /**
     * Appends a completed provider-only search record to bounded history.
     *
     * @param search Safe completion metadata for one search.
     * @returns A promise that resolves after bounded history is saved.
     */
    recordSearch(search: SearchCompletion): Promise<void>;
    /**
     * Returns current status records in configured provider order.
     *
     * @param providerIDs Provider IDs to include in the diagnostic output.
     * @returns Status records, including untried placeholders.
     */
    list(providerIDs: readonly ProviderID[]): readonly ProviderStatus[];
    /**
     * Returns recent search history with the newest entry first.
     *
     * @returns A reverse-chronological copy of bounded search history.
     */
    history(): readonly SearchHistoryEntry[];
}
/**
 * Formats safe provider health, authentication mode, status code, and active cooldown for diagnostics.
 *
 * @param statuses Provider status records to display.
 * @param now Current timestamp used to determine active cooldowns.
 * @returns Human-readable provider status output.
 */
export declare const formatStatus: (statuses: readonly ProviderStatus[], now: number) => string;
/**
 * Formats bounded provider-only history without queries, result content, keys, or raw errors.
 *
 * @param history Search completion records to display.
 * @returns Human-readable provider history output.
 */
export declare const formatHistory: (history: readonly SearchHistoryEntry[]) => string;
