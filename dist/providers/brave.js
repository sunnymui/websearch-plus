import { requireJson } from "./http.js";
const endpoint = "https://api.search.brave.com/res/v1/llm/context";
/**
 * Queries Brave LLM Context and maps grounding records to WebSearch+ results.
 *
 * Multiple snippets for one grounding URL are combined into one result body.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized Brave grounding results.
 */
export const searchBrave = async (input) => {
    const fetcher = input.fetch ?? globalThis.fetch;
    const response = await fetcher(endpoint, {
        method: "POST",
        signal: input.signal,
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            "X-Subscription-Token": input.apiKey,
        },
        body: JSON.stringify({
            q: input.query,
            count: input.maxResults,
            maximum_number_of_urls: input.maxResults,
            maximum_number_of_tokens: 4096,
            maximum_number_of_tokens_per_url: 1024,
            context_threshold_mode: "balanced",
            enable_source_metadata: true,
        }),
    });
    const body = (await requireJson(response));
    return (body.grounding?.generic ?? [])
        .filter((result) => Boolean(result.url))
        .slice(0, input.maxResults)
        .map((result) => ({
        url: result.url,
        ...(result.title ? { title: result.title } : {}),
        ...(result.snippets?.length ? { content: result.snippets.join("\n\n") } : {}),
        time: {},
    }));
};
