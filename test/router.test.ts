import { describe, expect, it } from "vitest"
import { defaultOptions, type WebSearchPlusOptions } from "../src/options.js"
import { FallbackRouter } from "../src/router.js"

const options: WebSearchPlusOptions = {
  ...defaultOptions,
  providers: ["exa", "parallel"],
  strategy: "first",
  authFailureMs: 900_000,
}

const failure = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

describe("FallbackRouter", () => {
  it("falls back after an auth failure and records the selected provider", async () => {
    const history: { readonly providerID?: string; readonly attempts: readonly unknown[] }[] = []
    const router = new FallbackRouter(
      options,
      async () => ({ hasApiKey: false, supportsKeyless: true }),
      async ({ providerID }) => {
        if (providerID === "exa") throw failure(403)
        return [{ url: "https://example.com", title: "Example", content: "Result", time: {} }]
      },
      () => 1_000,
      undefined,
      undefined,
      async (search) => {
        history.push(search)
      },
    )

    const result = await router.search("test", new AbortController().signal)

    expect(result.providerID).toBe("parallel")
    expect(result.attempts).toEqual([
      expect.objectContaining({ providerID: "exa", outcome: "failure", status: 403 }),
      expect.objectContaining({ providerID: "parallel", outcome: "success" }),
    ])
    expect(history).toEqual([
      expect.objectContaining({
        providerID: "parallel",
        attempts: [
          expect.objectContaining({ providerID: "exa", outcome: "failure" }),
          expect.objectContaining({ providerID: "parallel", outcome: "success" }),
        ],
      }),
    ])
  })

  it("skips a provider during its auth-failure cooldown", async () => {
    let now = 1_000
    const calls: string[] = []
    const router = new FallbackRouter(
      options,
      async () => ({ hasApiKey: false, supportsKeyless: true }),
      async ({ providerID }) => {
        calls.push(providerID)
        if (providerID === "exa") throw failure(403)
        return [{ url: "https://example.com", time: {} }]
      },
      () => now,
    )

    await router.search("first", new AbortController().signal)
    now += 1
    await router.search("second", new AbortController().signal)

    expect(calls).toEqual(["exa", "parallel", "parallel"])
  })

  it("uses a provider Retry-After value for rate-limit cooldowns", async () => {
    let now = 1_000
    const calls: string[] = []
    const router = new FallbackRouter(
      options,
      async () => ({ hasApiKey: false, supportsKeyless: true }),
      async ({ providerID }) => {
        calls.push(providerID)
        if (providerID === "exa") {
          throw Object.assign(failure(429), { retryAfterMs: 5_000 })
        }
        return [{ url: "https://example.com", time: {} }]
      },
      () => now,
    )

    await router.search("first", new AbortController().signal)
    now += 4_999
    await router.search("second", new AbortController().signal)
    now += 1
    await router.search("third", new AbortController().signal)

    expect(calls).toEqual(["exa", "parallel", "parallel", "exa", "parallel"])
  })

  it("marks unavailable providers as skipped without calling them", async () => {
    const calls: string[] = []
    const router = new FallbackRouter(
      { ...options, providers: ["tinyfish", "parallel"], strategy: "first" },
      async (providerID) => ({ hasApiKey: false, supportsKeyless: providerID === "parallel" }),
      async ({ providerID }) => {
        calls.push(providerID)
        return [{ url: "https://example.com", time: {} }]
      },
    )

    const result = await router.search("test", new AbortController().signal)

    expect(calls).toEqual(["parallel"])
    expect(result.attempts[0]).toMatchObject({ providerID: "tinyfish", outcome: "skipped" })
  })

  it("uses only the overridden provider", async () => {
    const calls: string[] = []
    const router = new FallbackRouter(
      options,
      async () => ({ hasApiKey: false, supportsKeyless: true }),
      async ({ providerID }) => {
        calls.push(providerID)
        throw failure(503)
      },
    )

    await expect(router.search("test", new AbortController().signal, "exa")).rejects.toThrow("Attempts: exa: HTTP 503")
    expect(calls).toEqual(["exa"])
  })

  it("allows an override outside the configured provider list", async () => {
    const calls: string[] = []
    const router = new FallbackRouter(
      options,
      async () => ({ hasApiKey: false, supportsKeyless: true }),
      async ({ providerID }) => {
        calls.push(providerID)
        return [{ url: "https://example.com", time: {} }]
      },
    )

    const result = await router.search("test", new AbortController().signal, "tavily")

    expect(result.providerID).toBe("tavily")
    expect(calls).toEqual(["tavily"])
  })
})
