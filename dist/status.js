const prefix = "provider-status/";
const historyKey = "search-history";
const historyLimit = 20;
/** Validates a persisted status record for a specific provider. */
const isProviderStatus = (value, providerID) => typeof value === "object" &&
    value !== null &&
    value.providerID === providerID;
/** Validates the non-sensitive shape of a persisted provider attempt. */
const isProviderAttempt = (value) => typeof value === "object" &&
    value !== null &&
    "providerID" in value &&
    "mode" in value &&
    "outcome" in value;
/** Validates a persisted search-history entry before loading it. */
const isSearchHistoryEntry = (value) => typeof value === "object" &&
    value !== null &&
    "completedAt" in value &&
    typeof value.completedAt === "number" &&
    "attempts" in value &&
    Array.isArray(value.attempts) &&
    value.attempts.every(isProviderAttempt);
/** Stores safe provider health and bounded provider-only search history in plugin storage. */
export class ProviderStatusStore {
    storage;
    now;
    #statuses = new Map();
    #history = [];
    constructor(storage, now = Date.now) {
        this.storage = storage;
        this.now = now;
    }
    /**
     * Loads persisted status and history for the configured provider set.
     *
     * @param providerIDs Provider IDs whose latest status should be loaded.
     * @returns A promise that resolves after valid persisted records are hydrated.
     */
    async load(providerIDs) {
        await Promise.all(providerIDs.map(async (providerID) => {
            const value = await this.storage.get(`${prefix}${providerID}`);
            if (isProviderStatus(value, providerID))
                this.#statuses.set(providerID, value);
        }));
        const history = await this.storage.get(historyKey);
        if (Array.isArray(history))
            this.#history = history.filter(isSearchHistoryEntry).slice(-historyLimit);
    }
    /**
     * Saves the latest safe outcome and cooldown for a provider.
     *
     * @param input Provider attempt and optional cooldown metadata to persist.
     * @returns A promise that resolves after the status record is saved.
     */
    async record(input) {
        const previous = this.#statuses.get(input.attempt.providerID);
        const status = {
            providerID: input.attempt.providerID,
            lastAttemptAt: this.now(),
            lastOutcome: input.attempt.outcome,
            lastMode: input.attempt.mode,
            ...(input.attempt.status === undefined ? {} : { lastStatus: input.attempt.status }),
            ...(input.attempt.latencyMs === undefined ? {} : { lastLatencyMs: input.attempt.latencyMs }),
            ...(input.cooldownUntil === undefined ? { cooldownUntil: previous?.cooldownUntil } : { cooldownUntil: input.cooldownUntil }),
        };
        this.#statuses.set(status.providerID, status);
        await this.storage.set(`${prefix}${status.providerID}`, status);
    }
    /**
     * Appends a completed provider-only search record to bounded history.
     *
     * @param search Safe completion metadata for one search.
     * @returns A promise that resolves after bounded history is saved.
     */
    async recordSearch(search) {
        this.#history = [...this.#history, search].slice(-historyLimit);
        await this.storage.set(historyKey, this.#history);
    }
    /**
     * Returns current status records in configured provider order.
     *
     * @param providerIDs Provider IDs to include in the diagnostic output.
     * @returns Status records, including untried placeholders.
     */
    list(providerIDs) {
        return providerIDs.map((providerID) => this.#statuses.get(providerID) ?? { providerID });
    }
    /**
     * Returns recent search history with the newest entry first.
     *
     * @returns A reverse-chronological copy of bounded search history.
     */
    history() {
        return [...this.#history].reverse();
    }
}
/**
 * Formats safe provider health, authentication mode, status code, and active cooldown for diagnostics.
 *
 * @param statuses Provider status records to display.
 * @param now Current timestamp used to determine active cooldowns.
 * @returns Human-readable provider status output.
 */
export const formatStatus = (statuses, now) => {
    const rows = statuses.map((status) => {
        const outcome = status.lastOutcome ?? "untried";
        const mode = status.lastMode ?? "unknown";
        const statusCode = status.lastStatus === undefined ? "" : ` HTTP ${status.lastStatus}`;
        const cooldown = status.cooldownUntil && status.cooldownUntil > now ? ` cooling until ${new Date(status.cooldownUntil).toISOString()}` : "";
        return `${status.providerID}: ${outcome} (${mode})${statusCode}${cooldown}`;
    });
    return `WebSearch+ provider status\n\n${rows.join("\n")}`;
};
/**
 * Formats bounded provider-only history without queries, result content, keys, or raw errors.
 *
 * @param history Search completion records to display.
 * @returns Human-readable provider history output.
 */
export const formatHistory = (history) => {
    if (history.length === 0)
        return "WebSearch+ search history\n\nNo searches recorded yet.";
    const rows = history.map((search) => {
        const selected = search.providerID ?? "no provider succeeded";
        const attempts = search.attempts
            .map((attempt) => {
            const status = attempt.status === undefined ? "" : ` HTTP ${attempt.status}`;
            const latency = attempt.latencyMs === undefined ? "" : ` ${attempt.latencyMs}ms`;
            return `${attempt.providerID}: ${attempt.outcome} (${attempt.mode})${status}${latency}`;
        })
            .join(", ");
        return `${new Date(search.completedAt).toISOString()}: ${selected}\n  Attempts: ${attempts || "none"}`;
    });
    return `WebSearch+ search history\n\n${rows.join("\n")}`;
};
