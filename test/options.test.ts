import { describe, expect, it } from "vitest"
import { parseOptions } from "../src/options.js"

describe("parseOptions", () => {
  it("uses the default Bright Data API name", () => {
    expect(parseOptions({}).scraperConfig.brightdata.apiName).toBe("serp_api1")
  })

  it("accepts a configured Bright Data API name", () => {
    expect(parseOptions({ scraperConfig: { brightdata: { apiName: "custom-api" } } }).scraperConfig.brightdata.apiName)
      .toBe("custom-api")
  })

  it("accepts the previous strategy names as aliases", () => {
    expect(parseOptions({ strategy: "priority" }).strategy).toBe("first")
    expect(parseOptions({ strategy: "round-robin" }).strategy).toBe("rotate")
  })

  it("accepts JSON custom providers", () => {
    const options = parseOptions({
      providers: ["example-search"],
      customProviders: {
        "example-search": {
          name: "Example Search",
          endpoint: "https://search.example.com/v1/search",
          method: "GET",
          query: { parameter: "q" },
          auth: { type: "bearer" },
          results: { path: "data.items", url: "link", title: "title", content: "snippet" },
        },
      },
    })

    expect(options.providers).toEqual(["example-search"])
    expect(options.customProviders["example-search"]).toMatchObject({ name: "Example Search", method: "GET" })
  })
})
