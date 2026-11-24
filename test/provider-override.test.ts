import { describe, expect, it } from "vitest"
import { parseProviderOverride } from "../src/provider-override.js"

describe("parseProviderOverride", () => {
  it("parses a known provider only when the directive is first", () => {
    expect(parseProviderOverride("provider:exa news today")).toEqual({ providerID: "exa", query: "news today" })
  })

  it("ignores a directive that is not first", () => {
    expect(parseProviderOverride("news today provider:exa")).toBeUndefined()
  })

  it("ignores unknown provider IDs", () => {
    expect(parseProviderOverride("provider:unknown news today")).toBeUndefined()
  })

  it("parses configured custom provider IDs", () => {
    expect(parseProviderOverride("provider:example-search news today", ["example-search"]))
      .toEqual({ providerID: "example-search", query: "news today" })
  })
})
