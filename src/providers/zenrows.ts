import type { SearchResult } from "../router.js"
import { googleSearchURL } from "../utils/google.js"
import { requireText } from "./http.js"

const endpoint = "https://api.zenrows.com/v1/"

/**
 * Builds a Google Search URL, requests it through ZenRows with rendering and premium proxying,
 * and returns the resulting Markdown as one normalized search result.
 *
 * @param input Query, key, cancellation signal, and optional fetch implementation.
 * @returns One Markdown-backed Google search result, or no results for an empty response.
 */
export const searchZenRows = async (input: {
  readonly query: string
  readonly apiKey: string
  readonly signal: AbortSignal
  readonly fetch?: typeof globalThis.fetch
}): Promise<readonly SearchResult[]> => {
  const url = googleSearchURL(input.query)
  const requestURL = new URL(endpoint)
  requestURL.searchParams.set("url", url)
  requestURL.searchParams.set("apikey", input.apiKey)
  requestURL.searchParams.set("js_render", "true")
  requestURL.searchParams.set("premium_proxy", "true")
  requestURL.searchParams.set("response_type", "markdown")

  const fetcher = input.fetch ?? globalThis.fetch
  const response = await fetcher(requestURL, { signal: input.signal })
  const content = await requireText(response)

  return content.trim()
    ? [{ url, title: `Google search: ${input.query}`, content, time: {} }]
    : []
}
