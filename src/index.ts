import { Plugin } from "@opencode/plugin"
import { registerProviderIntegrations } from "./integrations.js"
import { parseOptions } from "./options.js"
import { createProviderRouter } from "./provider-router.js"
import { ProviderStatusStore } from "./status.js"
import { registerTools } from "./tools.js"

export default Plugin.define({
  id: "websearch-plus",
  /**
   * Initializes the provider router, integrations, persisted status, and tools.
   *
   * @param context OpenCode's plugin context for this runtime.
   * @returns A promise that resolves after plugin setup completes.
   */
  async setup(context) {
    // Normalize plugin configuration before any provider or tool is registered.
    const options = parseOptions(context.options)

    // Hydrate safe provider health and history records for diagnostics and routing.
    const status = new ProviderStatusStore(context.storage)
    await status.load(options.providers)

    // Register `/connect` entries for native and configuration-defined keyed providers.
    await registerProviderIntegrations(context, options)

    // Capture the built-in providers available in this OpenCode runtime for keyless routing.
    const builtInProviderIDs = new Set((await context.websearch.providers()).data.map((provider) => provider.id))

    // Compose availability checks, adapter dispatch, fallback, cooldowns, and status recording.
    const router = createProviderRouter({ context, options, status, builtInProviderIDs })

    // Replace the default web-search provider and expose the diagnostic tools.
    await registerTools({ context, options, router, status })
  },
})
