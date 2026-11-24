import type { SearchResult } from "../router.js"
import { requireJson } from "./http.js"

const endpoint = "https://api.search.tinyfish.ai"

type TinyFishResult = {
  url?: string
  title?: string
  snippet?: string
}

type TinyFishResponse = {
  results?: TinyFishResult[]
}

/**
 * Queries TinyFish Search and maps its URL, title, and snippet fields to WebSearch+ results.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized TinyFish results.
 */
export const searchTinyFish = async (input: {
  readonly query: string
  readonly apiKey: string
  readonly signal: AbortSignal
  readonly maxResults: number
  readonly fetch?: typeof globalThis.fetch
}): Promise<readonly SearchResult[]> => {
  const fetcher = input.fetch ?? globalThis.fetch
  const url = new URL(endpoint)
  url.searchParams.set("query", input.query)
  const response = await fetcher(url, {
    signal: input.signal,
    headers: {
      Accept: "application/json",
      "X-API-Key": input.apiKey,
    },
  })
  const body = (await requireJson(response)) as TinyFishResponse

  return (body.results ?? [])
    .filter((result): result is TinyFishResult & { url: string } => Boolean(result.url))
    .slice(0, input.maxResults)
    .map((result) => ({
      url: result.url,
      ...(result.title ? { title: result.title } : {}),
      ...(result.snippet ? { content: result.snippet } : {}),
      time: {},
    }))
}
