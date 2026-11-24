import { describe, expect, it } from "vitest"
import { selectCandidates } from "../src/rotation.js"

const providers = [
  { id: "exa" as const, hasApiKey: true, supportsKeyless: true, coolingDown: false },
  { id: "parallel" as const, hasApiKey: false, supportsKeyless: true, coolingDown: false },
  { id: "brave" as const, hasApiKey: false, supportsKeyless: false, coolingDown: false },
  { id: "firecrawl" as const, hasApiKey: false, supportsKeyless: true, coolingDown: true },
]

describe("selectCandidates", () => {
  it("keeps configured order for first", () => {
    expect(selectCandidates({ providers, strategy: "first", randomProviderPreference: "none", roundRobinOffset: 0, random: () => 0.5 }))
      .toEqual(["exa", "parallel", "brave"])
  })

  it("rotates configured order for rotate", () => {
    expect(selectCandidates({ providers, strategy: "rotate", randomProviderPreference: "none", roundRobinOffset: 1, random: () => 0.5 }))
      .toEqual(["parallel", "brave", "exa"])
  })

  it("prefers connected providers for random has-api-key", () => {
    expect(selectCandidates({ providers, strategy: "random", randomProviderPreference: "has-api-key", roundRobinOffset: 0, random: () => 0.5 }))
      .toEqual(["exa", "parallel", "brave"])
  })

  it("prefers keyless-capable providers for random keyless", () => {
    expect(selectCandidates({ providers, strategy: "random", randomProviderPreference: "keyless", roundRobinOffset: 0, random: () => 0.5 }))
      .toEqual(["parallel", "exa", "brave"])
  })
})
