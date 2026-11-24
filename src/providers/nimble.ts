import type { SearchResult } from "../router.js"
import { requireJson } from "./http.js"

const endpoint = "https://sdk.nimbleway.com/v2/search"

type NimbleResult = {
  url?: string
  title?: string
  description?: string
  content?: string
}

type NimbleResponse = {
  results?: NimbleResult[]
}

/**
 * Queries Nimble Search and maps its result records to WebSearch+ results.
 *
 * Full content is preferred; the provider description is used when full content is absent.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized Nimble results.
 */
export const searchNimble = async (input: {
  readonly query: string
  readonly apiKey: string
  readonly signal: AbortSignal
  readonly maxResults: number
  readonly fetch?: typeof globalThis.fetch
}): Promise<readonly SearchResult[]> => {
  const fetcher = input.fetch ?? globalThis.fetch
  const response = await fetcher(endpoint, {
    method: "POST",
    signal: input.signal,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: JSON.stringify({
      query: input.query,
      search_depth: "standard",
      max_results: input.maxResults,
      output_format: "markdown",
      full_content: false,
    }),
  })
  const body = (await requireJson(response)) as NimbleResponse

  return (body.results ?? [])
    .filter((result): result is NimbleResult & { url: string } => Boolean(result.url))
    .slice(0, input.maxResults)
    .map((result) => ({
      url: result.url,
      ...(result.title ? { title: result.title } : {}),
      ...(result.content || result.description ? { content: result.content || result.description } : {}),
      time: {},
    }))
}
