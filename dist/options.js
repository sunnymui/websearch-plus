import { pluginNativeProviders } from "./provider-registry.js";
export const providerIDs = [
    "exa",
    "tavily",
    "parallel",
    "firecrawl",
    ...pluginNativeProviders.map((provider) => provider.id),
];
export const defaultOptions = {
    providers: ["exa", "tavily", "parallel", "firecrawl"],
    strategy: "random",
    randomProviderPreference: "has-api-key",
    perProviderTimeoutMs: 10_000,
    totalTimeoutMs: 30_000,
    retryStatuses: [401, 403, 408, 429, 500, 502, 503, 504],
    retryOnEmptyResults: true,
    authFailureMs: 15 * 60_000,
    rateLimitDefaultMs: 60_000,
    transientFailureMs: 30_000,
    maxResults: 8,
    scraperConfig: {
        brightdata: {
            apiName: "serp_api1",
        },
    },
    customProviders: {},
};
const strategies = new Set(["first", "rotate", "random"]);
const strategyAliases = new Map([
    ["priority", "first"],
    ["round-robin", "rotate"],
]);
const preferences = new Set(["has-api-key", "keyless", "none"]);
const providerSet = new Set(providerIDs);
const providerIDPattern = /^[a-z][a-z0-9-]*$/;
/** Checks whether a value is a non-array object suitable for configuration traversal. */
const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
/** Returns a positive integer or the supplied default. */
const positiveInteger = (value, fallback) => typeof value === "number" && Number.isInteger(value) && value > 0 ? value : fallback;
/** Returns a trimmed non-empty string when the value is valid. */
const nonEmptyString = (value) => typeof value === "string" && value.trim() ? value.trim() : undefined;
/** Validates that a configuration endpoint uses HTTPS. */
const httpsURL = (value) => {
    const url = nonEmptyString(value);
    if (!url)
        return undefined;
    try {
        return new URL(url).protocol === "https:" ? url : undefined;
    }
    catch {
        return undefined;
    }
};
/** Validates and normalizes declarative custom JSON search-provider definitions. */
const parseCustomProviders = (value) => {
    if (!isRecord(value))
        return {};
    return Object.fromEntries(Object.entries(value).flatMap(([id, definition]) => {
        // Reject collisions and incomplete definitions so configuration cannot replace built-ins.
        if (!providerIDPattern.test(id) || providerSet.has(id) || !isRecord(definition))
            return [];
        const name = nonEmptyString(definition.name);
        const endpoint = httpsURL(definition.endpoint);
        const method = definition.method === "GET" || definition.method === "POST" ? definition.method : undefined;
        const query = isRecord(definition.query) ? nonEmptyString(definition.query.parameter) : undefined;
        const results = isRecord(definition.results) ? definition.results : undefined;
        const path = results && nonEmptyString(results.path);
        const url = results && nonEmptyString(results.url);
        const title = results && nonEmptyString(results.title);
        const content = results && nonEmptyString(results.content);
        const auth = isRecord(definition.auth) ? definition.auth : undefined;
        const parsedAuth = auth?.type === "bearer"
            ? { type: "bearer" }
            : auth?.type === "header" && nonEmptyString(auth.name)
                ? { type: "header", name: nonEmptyString(auth.name) }
                : undefined;
        // A custom provider is usable only when request, authentication, and result mapping are complete.
        return name && endpoint && method && query && path && url && parsedAuth
            ? [[id, { name, endpoint, method, query: { parameter: query }, auth: parsedAuth, results: { path, url, ...(title ? { title } : {}), ...(content ? { content } : {}) } }]]
            : [];
    }));
};
/**
 * Parses untyped plugin configuration into validated routing options.
 *
 * Invalid values fall back to documented defaults. Custom providers are retained only when
 * their IDs, HTTPS endpoints, authentication, query mapping, and result mapping are complete.
 *
 * @param value Raw plugin options supplied by OpenCode.
 * @returns Validated, normalized WebSearch+ options.
 */
export const parseOptions = (value) => {
    const input = isRecord(value) ? value : {};
    const customProviders = parseCustomProviders(input.customProviders);
    const configuredProviders = Array.isArray(input.providers)
        ? input.providers.filter((provider) => typeof provider === "string" && (providerSet.has(provider) || provider in customProviders))
        : defaultOptions.providers;
    const cooldowns = isRecord(input.cooldowns) ? input.cooldowns : {};
    const scraperConfig = isRecord(input.scraperConfig) ? input.scraperConfig : {};
    const brightDataConfig = isRecord(scraperConfig.brightdata) ? scraperConfig.brightdata : {};
    const retryStatuses = Array.isArray(input.retryStatuses)
        ? input.retryStatuses.filter((status) => Number.isInteger(status) && status >= 100 && status <= 599)
        : defaultOptions.retryStatuses;
    return {
        providers: configuredProviders.length > 0 ? [...new Set(configuredProviders)] : defaultOptions.providers,
        strategy: typeof input.strategy === "string"
            ? (strategies.has(input.strategy)
                ? input.strategy
                : strategyAliases.get(input.strategy) ?? defaultOptions.strategy)
            : defaultOptions.strategy,
        randomProviderPreference: typeof input.randomProviderPreference === "string" &&
            preferences.has(input.randomProviderPreference)
            ? input.randomProviderPreference
            : defaultOptions.randomProviderPreference,
        perProviderTimeoutMs: positiveInteger(input.perProviderTimeoutMs, defaultOptions.perProviderTimeoutMs),
        totalTimeoutMs: positiveInteger(input.totalTimeoutMs, defaultOptions.totalTimeoutMs),
        retryStatuses: retryStatuses.length > 0 ? retryStatuses : defaultOptions.retryStatuses,
        retryOnEmptyResults: typeof input.retryOnEmptyResults === "boolean" ? input.retryOnEmptyResults : defaultOptions.retryOnEmptyResults,
        authFailureMs: positiveInteger(cooldowns.authFailureMs, defaultOptions.authFailureMs),
        rateLimitDefaultMs: positiveInteger(cooldowns.rateLimitDefaultMs, defaultOptions.rateLimitDefaultMs),
        transientFailureMs: positiveInteger(cooldowns.transientFailureMs, defaultOptions.transientFailureMs),
        maxResults: positiveInteger(input.maxResults, defaultOptions.maxResults),
        scraperConfig: {
            brightdata: {
                apiName: typeof brightDataConfig.apiName === "string" && brightDataConfig.apiName.trim()
                    ? brightDataConfig.apiName.trim()
                    : defaultOptions.scraperConfig.brightdata.apiName,
            },
        },
        customProviders,
    };
};
