import { describe, expect, it } from "vitest"
import { searchBrave } from "../src/providers/brave.js"
import { searchBrightData } from "../src/providers/brightdata.js"
import { searchCustomProvider } from "../src/providers/custom.js"
import { searchNimble } from "../src/providers/nimble.js"
import { searchTinyFish } from "../src/providers/tinyfish.js"
import { searchZenRows } from "../src/providers/zenrows.js"
import { ProviderHttpError } from "../src/providers/http.js"

const jsonFetch = (body: unknown, status = 200) =>
  (async () =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    })) as typeof fetch

describe("plugin-native provider adapters", () => {
  it("maps Brave LLM Context grounding into search results", async () => {
    const results = await searchBrave({
      query: "OpenCode",
      apiKey: "test-key",
      signal: new AbortController().signal,
      maxResults: 8,
      fetch: jsonFetch({
        grounding: {
          generic: [
            {
              url: "https://opencode.ai/v2/docs",
              title: "OpenCode docs",
              snippets: ["First chunk", "Second chunk"],
            },
          ],
        },
      }),
    })

    expect(results).toEqual([
      {
        url: "https://opencode.ai/v2/docs",
        title: "OpenCode docs",
        content: "First chunk\n\nSecond chunk",
        time: {},
      },
    ])
  })

  it("maps Nimble content and falls back to descriptions", async () => {
    const results = await searchNimble({
      query: "OpenCode",
      apiKey: "test-key",
      signal: new AbortController().signal,
      maxResults: 8,
      fetch: jsonFetch({
        results: [
          { url: "https://example.com/one", title: "One", content: "Full content", description: "Snippet" },
          { url: "https://example.com/two", title: "Two", content: "", description: "Fallback snippet" },
        ],
      }),
    })

    expect(results).toEqual([
      { url: "https://example.com/one", title: "One", content: "Full content", time: {} },
      { url: "https://example.com/two", title: "Two", content: "Fallback snippet", time: {} },
    ])
  })

  it("surfaces provider status codes without response bodies", async () => {
    await expect(
      searchBrave({
        query: "OpenCode",
        apiKey: "test-key",
        signal: new AbortController().signal,
        maxResults: 8,
        fetch: jsonFetch({ error: "ignored" }, 403),
      }),
    ).rejects.toMatchObject<Partial<ProviderHttpError>>({ status: 403 })
  })

  it("maps TinyFish Search results", async () => {
    const results = await searchTinyFish({
      query: "OpenCode",
      apiKey: "test-key",
      signal: new AbortController().signal,
      maxResults: 8,
      fetch: jsonFetch({
        results: [
          { url: "https://opencode.ai/v2/docs", title: "OpenCode", snippet: "Official docs" },
        ],
      }),
    })

    expect(results).toEqual([
      { url: "https://opencode.ai/v2/docs", title: "OpenCode", content: "Official docs", time: {} },
    ])
  })

  it("submits a Google URL to Bright Data and returns its Markdown", async () => {
    let request: RequestInit | undefined
    const results = await searchBrightData({
      query: "OpenCode V2",
      apiKey: "test-key",
      apiName: "test-api",
      signal: new AbortController().signal,
      fetch: (async (_url, init) => {
        request = init
        return new Response("# Google results\n\nOpenCode", { status: 200 })
      }) as typeof fetch,
    })

    expect(request).toMatchObject({
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-key",
      },
    })
    expect(JSON.parse(request?.body as string)).toEqual({
      zone: "test-api",
      url: "https://www.google.com/search?q=OpenCode+V2",
      format: "raw",
      data_format: "markdown",
    })
    expect(results).toEqual([
      {
        url: "https://www.google.com/search?q=OpenCode+V2",
        title: "Google search: OpenCode V2",
        content: "# Google results\n\nOpenCode",
        time: {},
      },
    ])
  })

  it("submits a rendered Google URL to ZenRows and returns its Markdown", async () => {
    let requestURL: URL | undefined
    const results = await searchZenRows({
      query: "OpenCode V2",
      apiKey: "test-key",
      signal: new AbortController().signal,
      fetch: (async (url) => {
        requestURL = new URL(url.toString())
        return new Response("# Google results\n\nOpenCode", { status: 200 })
      }) as typeof fetch,
    })

    expect(requestURL?.origin).toBe("https://api.zenrows.com")
    expect(requestURL?.pathname).toBe("/v1/")
    expect(Object.fromEntries(requestURL?.searchParams ?? [])).toEqual({
      url: "https://www.google.com/search?q=OpenCode+V2",
      apikey: "test-key",
      js_render: "true",
      premium_proxy: "true",
      response_type: "markdown",
    })
    expect(results).toEqual([
      {
        url: "https://www.google.com/search?q=OpenCode+V2",
        title: "Google search: OpenCode V2",
        content: "# Google results\n\nOpenCode",
        time: {},
      },
    ])
  })

  it("maps a configured JSON search provider", async () => {
    let requestURL: URL | undefined
    const results = await searchCustomProvider({
      config: {
        name: "Example Search",
        endpoint: "https://search.example.com/v1/search",
        method: "GET",
        query: { parameter: "q" },
        auth: { type: "header", name: "X-API-Key" },
        results: { path: "data.items", url: "link", title: "metadata.title", content: "snippet" },
      },
      query: "OpenCode",
      apiKey: "test-key",
      signal: new AbortController().signal,
      maxResults: 8,
      fetch: (async (url, init) => {
        requestURL = new URL(url.toString())
        expect(init?.headers).toMatchObject({ "X-API-Key": "test-key" })
        return new Response(JSON.stringify({
          data: { items: [{ link: "https://opencode.ai", metadata: { title: "OpenCode" }, snippet: "AI coding agent" }] },
        }), { status: 200, headers: { "content-type": "application/json" } })
      }) as typeof fetch,
    })

    expect(requestURL?.searchParams.get("q")).toBe("OpenCode")
    expect(results).toEqual([
      { url: "https://opencode.ai", title: "OpenCode", content: "AI coding agent", time: {} },
    ])
  })
})
