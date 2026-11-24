export declare const providerIDs: string[];
export type ProviderID = string & {};
export type Strategy = "first" | "rotate" | "random";
export type RandomProviderPreference = "has-api-key" | "keyless" | "none";
export interface ScraperConfig {
    readonly brightdata: {
        readonly apiName: string;
    };
}
export interface CustomProviderConfig {
    readonly name: string;
    readonly endpoint: string;
    readonly method: "GET" | "POST";
    readonly query: {
        readonly parameter: string;
    };
    readonly auth: {
        readonly type: "bearer";
    } | {
        readonly type: "header";
        readonly name: string;
    };
    readonly results: {
        readonly path: string;
        readonly url: string;
        readonly title?: string;
        readonly content?: string;
    };
}
export interface WebSearchPlusOptions {
    readonly providers: readonly ProviderID[];
    readonly strategy: Strategy;
    readonly randomProviderPreference: RandomProviderPreference;
    readonly perProviderTimeoutMs: number;
    readonly totalTimeoutMs: number;
    readonly retryStatuses: readonly number[];
    readonly retryOnEmptyResults: boolean;
    readonly authFailureMs: number;
    readonly rateLimitDefaultMs: number;
    readonly transientFailureMs: number;
    readonly maxResults: number;
    readonly scraperConfig: ScraperConfig;
    readonly customProviders: Readonly<Record<string, CustomProviderConfig>>;
}
export declare const defaultOptions: WebSearchPlusOptions;
/**
 * Parses untyped plugin configuration into validated routing options.
 *
 * Invalid values fall back to documented defaults. Custom providers are retained only when
 * their IDs, HTTPS endpoints, authentication, query mapping, and result mapping are complete.
 *
 * @param value Raw plugin options supplied by OpenCode.
 * @returns Validated, normalized WebSearch+ options.
 */
export declare const parseOptions: (value: unknown) => WebSearchPlusOptions;
