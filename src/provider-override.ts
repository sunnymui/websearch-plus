import { providerIDs, type ProviderID } from "./options.js"

export interface ProviderOverride {
  readonly providerID: ProviderID
  readonly query: string
}

/**
 * Parses a leading `provider:<id>` directive from a search query.
 *
 * The directive is recognized only as the first term, is removed from the provider-bound query,
 * and accepts built-in IDs plus the configured custom provider IDs.
 *
 * @param query Search query that may begin with a provider directive.
 * @param customProviderIDs Configured custom provider IDs accepted by the directive.
 * @returns The selected provider and stripped query, or `undefined` when no valid directive exists.
 */
export const parseProviderOverride = (query: string, customProviderIDs: readonly string[] = []): ProviderOverride | undefined => {
  const match = /^\s*provider:([a-z-]+)(?:\s+|$)/i.exec(query)
  // Only a leading directive is routing syntax; later occurrences remain part of the search terms.
  if (!match) return undefined

  const providerID = match[1]!.toLowerCase()
  // Ignore misspelled or unavailable IDs rather than treating arbitrary query text as a directive.
  if (!new Set([...providerIDs, ...customProviderIDs]).has(providerID)) return undefined

  return {
    providerID: providerID as ProviderID,
    query: query.slice(match[0].length).trim(),
  }
}
