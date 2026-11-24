import { WebSearch } from "@opencode/plugin"
import type { Context } from "@opencode/plugin/promise/plugin"
import { providerIDs, type ProviderID, type WebSearchPlusOptions } from "./options.js"
import { parseProviderOverride } from "./provider-override.js"
import { FallbackRouter, type ProviderAttempt, type SearchResult } from "./router.js"
import { formatHistory, formatStatus, ProviderStatusStore } from "./status.js"

/**
 * Registers the WebSearch+ provider, diagnostic tools, and completed-call provider metadata.
 *
 * The built-in `websearch` tool remains model-facing; this function makes WebSearch+ its default
 * provider and updates completed metadata to display the backend that returned results.
 *
 * @param input OpenCode services, router, status store, and normalized options.
 * @returns A promise that resolves after all WebSearch+ tools and hooks are registered.
 */
export const registerTools = async (input: {
  readonly context: Context
  readonly options: WebSearchPlusOptions
  readonly router: FallbackRouter
  readonly status: ProviderStatusStore
}) => {
  const customProviderIDs = Object.keys(input.options.customProviders)

  await input.context.websearch.transform((editor) => {
    editor.add({
      id: "websearch-plus",
      name: "WebSearch+",
      execute: async ({ query }, { signal }) => {
        const providerOverride = parseProviderOverride(query, customProviderIDs)
        const outcome = await input.router.search(providerOverride?.query ?? query, signal, providerOverride?.providerID)
        return annotateResults(outcome.providerID, outcome.results, outcome.attempts)
      },
    })
    editor.default.set("websearch-plus")
  })

  await input.context.tool.hook("execute.after", (event) => {
    // Only completed built-in web-search calls have result content to inspect and rewrite for the TUI.
    if (event.tool !== "websearch" || event.status !== "completed") return
    const providerID = providerFromResultContent(event.result.content, customProviderIDs)
    if (!providerID) return

    event.result = {
      ...event.result,
      metadata: { ...event.result.metadata, provider: providerID },
    }
  })

  await input.context.tool.transform((editor) => {
    editor.update("websearch", (tool) => {
      tool.description = `${tool.description}\n\nLeading provider:<id> forces that provider only; preserve it in the query.`
    })
    editor.namespace({ name: "websearch_plus", description: "WebSearch+ diagnostics" })
    editor.add({
      name: "status",
      description: "Show provider status and cooldowns.",
      input: { type: "object", properties: {}, additionalProperties: false },
      options: { namespace: "websearch_plus", codemode: false },
      execute: async () => ({ content: formatStatus(input.status.list(input.options.providers), Date.now()) }),
    })
    editor.add({
      name: "history",
      description: "Show recent providers and fallback attempts.",
      input: { type: "object", properties: {}, additionalProperties: false },
      options: { namespace: "websearch_plus", codemode: false },
      execute: async () => ({ content: formatHistory(input.status.history()) }),
    })
  })
}

/** Adds provider and fallback details to the first returned search result. */
const annotateResults = (
  providerID: ProviderID,
  results: readonly SearchResult[],
  attempts: readonly ProviderAttempt[],
): readonly WebSearch.Result[] =>
  results.map((result, index) => ({
    ...result,
    content: index === 0 ? `${resultHeader(providerID, attempts)}\n\n${result.content ?? ""}` : result.content,
  }))

/** Formats the provider and fallback summary embedded in the first result. */
const resultHeader = (providerID: ProviderID, attempts: readonly ProviderAttempt[]) => {
  const fallbacks = attempts
    .filter((attempt) => attempt.providerID !== providerID)
    .map((attempt) => `${attempt.providerID} (${attempt.status ? `HTTP ${attempt.status}` : attempt.outcome})`)

  return [
    `WebSearch+ provider: ${providerID}`,
    ...(fallbacks.length > 0 ? [`Fallbacks attempted: ${fallbacks.join(", ")}`] : []),
  ].join("\n")
}

/** Reads a validated provider ID from completed tool-result content. */
const providerFromResultContent = (content: unknown, customProviderIDs: readonly string[]): ProviderID | undefined => {
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content
          .filter((entry): entry is { readonly type: "text"; readonly text: string } =>
            typeof entry === "object" && entry !== null && "type" in entry && entry.type === "text" && "text" in entry && typeof entry.text === "string",
          )
          .map((entry) => entry.text)
          .join("\n")
      : ""
  const providerID = /^WebSearch\+ provider: ([a-z-]+)$/m.exec(text)?.[1]
  return providerID && new Set([...providerIDs, ...customProviderIDs]).has(providerID) ? providerID : undefined
}
