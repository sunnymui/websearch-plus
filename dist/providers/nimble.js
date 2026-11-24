import { requireJson } from "./http.js";
const endpoint = "https://sdk.nimbleway.com/v2/search";
/**
 * Queries Nimble Search and maps its result records to WebSearch+ results.
 *
 * Full content is preferred; the provider description is used when full content is absent.
 *
 * @param input Query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized Nimble results.
 */
export const searchNimble = async (input) => {
    const fetcher = input.fetch ?? globalThis.fetch;
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
    });
    const body = (await requireJson(response));
    return (body.results ?? [])
        .filter((result) => Boolean(result.url))
        .slice(0, input.maxResults)
        .map((result) => ({
        url: result.url,
        ...(result.title ? { title: result.title } : {}),
        ...(result.content || result.description ? { content: result.content || result.description } : {}),
        time: {},
    }));
};
