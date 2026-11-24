import type { SearchResult } from "../router.js"
import { googleSearchURL } from "../utils/google.js"
import { requireText } from "./http.js"

const endpoint = "https://api.brightdata.com/request"

/**
 * Builds a Google Search URL, submits it to the configured Bright Data zone, and returns the
 * resulting Markdown as one normalized search result.
 *
 * @param input Query, key, Bright Data API name, cancellation signal, and optional fetch implementation.
 * @returns One Markdown-backed Google search result, or no results for an empty response.
 */
export const searchBrightData = async (input: {
  readonly query: string
  readonly apiKey: string
  readonly apiName: string
  readonly signal: AbortSignal
  readonly fetch?: typeof globalThis.fetch
}): Promise<readonly SearchResult[]> => {
  const url = googleSearchURL(input.query)
  const fetcher = input.fetch ?? globalThis.fetch
  const response = await fetcher(endpoint, {
    method: "POST",
    signal: input.signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({ zone: input.apiName, url, format: "raw", data_format: "markdown" }),
  })
  const content = await requireText(response)

  return content.trim()
    ? [{ url, title: `Google search: ${input.query}`, content, time: {} }]
    : []
}
