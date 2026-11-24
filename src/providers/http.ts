/** Represents a provider HTTP failure using safe retry metadata instead of the response body. */
export class ProviderHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfterMs?: number,
  ) {
    super(message)
  }
}

/**
 * Parses a Retry-After delay or HTTP date header into milliseconds from now.
 *
 * @param value Retry-After response header value.
 * @returns Delay in milliseconds, or `undefined` when the value is absent or invalid.
 */
export const retryAfterMs = (value: string | null): number | undefined => {
  if (!value) return undefined
  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000

  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? Math.max(0, timestamp - Date.now()) : undefined
}

/**
 * Returns JSON from a successful provider response.
 *
 * Failed responses become a status-only error so routing can retry without retaining raw bodies.
 *
 * @param response Provider HTTP response.
 * @returns Decoded JSON body for a successful response.
 */
export const requireJson = async (response: Response) => {
  if (!response.ok) {
    throw new ProviderHttpError(
      `Search provider request failed with HTTP ${response.status}`,
      response.status,
      retryAfterMs(response.headers.get("retry-after")),
    )
  }
  return response.json() as Promise<unknown>
}

/**
 * Returns text from a successful provider response.
 *
 * Failed responses become a status-only error so routing can retry without retaining raw bodies.
 *
 * @param response Provider HTTP response.
 * @returns Text body for a successful response.
 */
export const requireText = async (response: Response) => {
  if (!response.ok) {
    throw new ProviderHttpError(
      `Search provider request failed with HTTP ${response.status}`,
      response.status,
      retryAfterMs(response.headers.get("retry-after")),
    )
  }
  return response.text()
}
