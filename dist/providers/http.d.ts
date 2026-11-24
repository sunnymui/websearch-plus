/** Represents a provider HTTP failure using safe retry metadata instead of the response body. */
export declare class ProviderHttpError extends Error {
    readonly status?: number | undefined;
    readonly retryAfterMs?: number | undefined;
    constructor(message: string, status?: number | undefined, retryAfterMs?: number | undefined);
}
/**
 * Parses a Retry-After delay or HTTP date header into milliseconds from now.
 *
 * @param value Retry-After response header value.
 * @returns Delay in milliseconds, or `undefined` when the value is absent or invalid.
 */
export declare const retryAfterMs: (value: string | null) => number | undefined;
/**
 * Returns JSON from a successful provider response.
 *
 * Failed responses become a status-only error so routing can retry without retaining raw bodies.
 *
 * @param response Provider HTTP response.
 * @returns Decoded JSON body for a successful response.
 */
export declare const requireJson: (response: Response) => Promise<unknown>;
/**
 * Returns text from a successful provider response.
 *
 * Failed responses become a status-only error so routing can retry without retaining raw bodies.
 *
 * @param response Provider HTTP response.
 * @returns Text body for a successful response.
 */
export declare const requireText: (response: Response) => Promise<string>;
