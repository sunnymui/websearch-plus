import { requireJson } from "./http.js";
/** Resolves a dot-delimited property path from a JSON object without evaluating expressions. */
const getPath = (value, path) => path.split(".").reduce((current, segment) => typeof current === "object" && current !== null && !Array.isArray(current) && segment in current
    ? current[segment]
    : undefined, value);
/** Resolves a string-valued JSON path, omitting absent or non-string fields. */
const stringAtPath = (value, path) => {
    const result = path ? getPath(value, path) : undefined;
    return typeof result === "string" ? result : undefined;
};
/**
 * Calls a declaratively configured JSON search API and maps its response into normalized results.
 *
 * GET providers receive the query as a URL parameter; POST providers receive a JSON body. API
 * keys are sent as a bearer token or configured header and never stored with result metadata.
 *
 * @param input Provider definition, query, key, cancellation signal, result limit, and optional fetch implementation.
 * @returns Normalized results mapped from the provider's JSON response.
 */
export const searchCustomProvider = async (input) => {
    const requestURL = new URL(input.config.endpoint);
    const headers = {
        Accept: "application/json",
        ...(input.config.auth.type === "bearer"
            ? { Authorization: `Bearer ${input.apiKey}` }
            : { [input.config.auth.name]: input.apiKey }),
    };
    const request = { method: input.config.method, signal: input.signal, headers };
    if (input.config.method === "GET") {
        // GET APIs receive the query in the configured URL parameter.
        requestURL.searchParams.set(input.config.query.parameter, input.query);
    }
    else {
        // POST APIs use the same configured parameter name in a minimal JSON body.
        headers["Content-Type"] = "application/json";
        request.body = JSON.stringify({ [input.config.query.parameter]: input.query });
    }
    const fetcher = input.fetch ?? globalThis.fetch;
    const response = await fetcher(requestURL, request);
    const body = await requireJson(response);
    const results = getPath(body, input.config.results.path);
    // A valid response must expose an array at the declared result path.
    if (!Array.isArray(results))
        return [];
    return results
        .map((result) => {
        const url = stringAtPath(result, input.config.results.url);
        // URLs are required by the WebSearch result contract; ignore incomplete entries.
        if (!url)
            return undefined;
        const title = stringAtPath(result, input.config.results.title);
        const content = stringAtPath(result, input.config.results.content);
        return { url, ...(title ? { title } : {}), ...(content ? { content } : {}), time: {} };
    })
        .filter((result) => result !== undefined)
        .slice(0, input.maxResults);
};
