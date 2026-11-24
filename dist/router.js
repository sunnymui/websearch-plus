import { selectCandidates } from "./rotation.js";
/** Coordinates provider selection, execution, fallback, timeouts, and cooldowns for one plugin instance. */
export class FallbackRouter {
    options;
    inspect;
    execute;
    now;
    random;
    observeAttempt;
    observeSearch;
    #roundRobinOffset = 0;
    #cooldowns = new Map();
    constructor(options, inspect, execute, now = Date.now, random = Math.random, observeAttempt, observeSearch) {
        this.options = options;
        this.inspect = inspect;
        this.execute = execute;
        this.now = now;
        this.random = random;
        this.observeAttempt = observeAttempt;
        this.observeSearch = observeSearch;
    }
    /**
     * Searches providers in policy order, applying timeouts, fallback, and cooldowns.
     *
     * @param query Search terms passed to each provider.
     * @param signal Signal that cancels the overall web-search call.
     * @param providerOverride Optional provider that bypasses strategy and fallback selection.
     * @returns The selected provider, normalized results, and safe attempt history.
     */
    async search(query, signal, providerOverride) {
        const started = this.now();
        const providerIDs = providerOverride
            ? [...new Set([...this.options.providers, providerOverride])]
            : this.options.providers;
        const availability = await Promise.all(providerIDs.map(async (providerID) => {
            const provider = await this.inspect(providerID);
            return { id: providerID, ...provider, coolingDown: (this.#cooldowns.get(providerID) ?? 0) > started };
        }));
        const candidates = providerOverride
            ? availability.find((provider) => provider.id === providerOverride && !provider.coolingDown)
                ? [providerOverride]
                : []
            : selectCandidates({
                providers: availability,
                strategy: this.options.strategy,
                randomProviderPreference: this.options.randomProviderPreference,
                roundRobinOffset: this.#roundRobinOffset,
                random: this.random,
            });
        const byID = new Map(availability.map((provider) => [provider.id, provider]));
        const attempts = [];
        // Manual overrides do not consume a rotate position because they bypass strategy selection.
        if (!providerOverride && this.options.strategy === "rotate")
            this.#roundRobinOffset += 1;
        for (const providerID of candidates) {
            // The overall budget applies across all fallback attempts, not per provider.
            if (this.now() - started >= this.options.totalTimeoutMs)
                break;
            const provider = byID.get(providerID);
            if (!provider)
                continue;
            if (!provider.hasApiKey && !provider.supportsKeyless) {
                // Preserve the skipped attempt for diagnostics without making an unauthenticated call.
                const attempt = { providerID, mode: "skipped", outcome: "skipped" };
                attempts.push(attempt);
                await this.#observe(attempt);
                continue;
            }
            const controller = new AbortController();
            let rejectTimeout = () => undefined;
            const timeoutPromise = new Promise((_, reject) => {
                rejectTimeout = reject;
            });
            const timeout = setTimeout(() => {
                controller.abort();
                rejectTimeout(Object.assign(new Error(`WebSearch+ provider timed out after ${this.options.perProviderTimeoutMs}ms`), { status: 408 }));
            }, this.options.perProviderTimeoutMs);
            const abort = () => controller.abort();
            signal.addEventListener("abort", abort, { once: true });
            const attemptStarted = this.now();
            try {
                const results = await Promise.race([
                    this.execute({ providerID, query, signal: controller.signal }),
                    timeoutPromise,
                ]);
                const latencyMs = this.now() - attemptStarted;
                if (results.length > 0) {
                    const attempt = { providerID, mode: provider.hasApiKey ? "authenticated" : "anonymous", outcome: "success", latencyMs };
                    attempts.push(attempt);
                    await this.#observe(attempt);
                    await this.#observeSearch({ completedAt: this.now(), providerID, attempts });
                    return { providerID, results: results.slice(0, this.options.maxResults), attempts };
                }
                const attempt = { providerID, mode: provider.hasApiKey ? "authenticated" : "anonymous", outcome: "empty", latencyMs };
                attempts.push(attempt);
                await this.#observe(attempt);
                // Empty results are a terminal outcome only when the caller disables empty-result fallback.
                if (!this.options.retryOnEmptyResults)
                    break;
            }
            catch (error) {
                const failure = toFailure(error);
                const attempt = {
                    providerID,
                    mode: provider.hasApiKey ? "authenticated" : "anonymous",
                    outcome: "failure",
                    status: failure.status,
                    latencyMs: this.now() - attemptStarted,
                };
                attempts.push(attempt);
                // Non-retryable HTTP statuses end the search instead of masking a provider error with fallback.
                if (failure.status !== undefined && !this.options.retryStatuses.includes(failure.status)) {
                    await this.#observeSearch({ completedAt: this.now(), attempts });
                    throw error;
                }
                const cooldownUntil = this.#setCooldown(providerID, failure);
                await this.#observe(attempt, cooldownUntil);
            }
            finally {
                clearTimeout(timeout);
                signal.removeEventListener("abort", abort);
            }
        }
        const summary = attempts.map((attempt) => `${attempt.providerID}: ${attempt.status ? `HTTP ${attempt.status}` : attempt.outcome}`).join(", ");
        await this.#observeSearch({ completedAt: this.now(), attempts });
        throw new Error(`WebSearch+ could not return results. Attempts: ${summary || "none"}`);
    }
    /** Records the cooldown implied by a failed provider response. */
    #setCooldown(providerID, failure) {
        const duration = failure.status === 429
            ? (failure.retryAfterMs ?? this.options.rateLimitDefaultMs)
            : failure.status === 401 || failure.status === 403
                ? this.options.authFailureMs
                : this.options.transientFailureMs;
        const cooldownUntil = this.now() + duration;
        this.#cooldowns.set(providerID, cooldownUntil);
        return cooldownUntil;
    }
    /** Persists a provider attempt when an observer is configured. */
    async #observe(attempt, cooldownUntil) {
        await this.observeAttempt?.({ attempt, cooldownUntil });
    }
    /** Persists a completed search when an observer is configured. */
    async #observeSearch(search) {
        await this.observeSearch?.(search);
    }
}
/** Converts an unknown provider error into safe routing metadata. */
const toFailure = (error) => {
    if (error instanceof Error) {
        const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
        const retryAfterMs = "retryAfterMs" in error && typeof error.retryAfterMs === "number" ? error.retryAfterMs : undefined;
        return { message: error.message, status, retryAfterMs };
    }
    return { message: String(error) };
};
