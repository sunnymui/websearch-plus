/**
 * Builds an encoded Google Search URL from a query and supported optional parameters.
 *
 * The helper intentionally omits deprecated parameters such as `num`; callers can use it for
 * scraper providers that require a concrete Google target URL.
 *
 * @param query Search terms for Google's `q` parameter.
 * @param parameters Optional supported Google Search parameters.
 * @returns An encoded Google Search URL.
 */
export const googleSearchURL = (query, parameters = {}) => {
    const url = new URL("https://www.google.com/search");
    url.searchParams.set("q", query);
    for (const [name, value] of Object.entries(parameters)) {
        if (value !== undefined)
            url.searchParams.set(name, String(value));
    }
    return url.toString();
};
