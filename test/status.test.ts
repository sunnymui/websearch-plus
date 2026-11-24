import { describe, expect, it } from "vitest"
import { formatHistory, formatStatus, ProviderStatusStore } from "../src/status.js"

describe("ProviderStatusStore", () => {
  it("persists safe provider outcomes without query or credential data", async () => {
    const values = new Map<string, unknown>()
    const store = new ProviderStatusStore({
      get: async (key) => values.get(key) as never,
      set: async (key, value) => {
        values.set(key, value)
      },
    }, () => 1_000)

    await store.record({
      attempt: {
        providerID: "exa",
        mode: "authenticated",
        outcome: "success",
        latencyMs: 123,
      },
    })

    expect(values.get("provider-status/exa")).toEqual({
      providerID: "exa",
      lastAttemptAt: 1_000,
      lastOutcome: "success",
      lastMode: "authenticated",
      lastLatencyMs: 123,
      cooldownUntil: undefined,
    })
    expect(formatStatus(store.list(["exa", "firecrawl"]), 1_000)).toContain("exa: success (authenticated)")
    expect(formatStatus(store.list(["exa", "firecrawl"]), 1_000)).toContain("firecrawl: untried (unknown)")
  })

  it("retains a bounded query-free search history", async () => {
    const values = new Map<string, unknown>()
    const store = new ProviderStatusStore({
      get: async (key) => values.get(key) as never,
      set: async (key, value) => {
        values.set(key, value)
      },
    })

    await store.recordSearch({
      completedAt: 1_000,
      providerID: "tavily",
      attempts: [
        { providerID: "firecrawl", mode: "anonymous", outcome: "failure", status: 403, latencyMs: 20 },
        { providerID: "tavily", mode: "authenticated", outcome: "success", latencyMs: 30 },
      ],
    })

    expect(values.get("search-history")).toEqual([
      {
        completedAt: 1_000,
        providerID: "tavily",
        attempts: [
          { providerID: "firecrawl", mode: "anonymous", outcome: "failure", status: 403, latencyMs: 20 },
          { providerID: "tavily", mode: "authenticated", outcome: "success", latencyMs: 30 },
        ],
      },
    ])
    expect(formatHistory(store.history())).toContain("tavily")
    expect(formatHistory(store.history())).toContain("firecrawl: failure (anonymous) HTTP 403 20ms")
    expect(formatHistory([])).toContain("No searches recorded yet")
  })
})
