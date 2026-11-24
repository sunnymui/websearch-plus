import type { Context } from "@opencode/plugin/promise/plugin";
import { type WebSearchPlusOptions } from "./options.js";
import { FallbackRouter } from "./router.js";
import { ProviderStatusStore } from "./status.js";
/**
 * Registers the WebSearch+ provider, diagnostic tools, and completed-call provider metadata.
 *
 * The built-in `websearch` tool remains model-facing; this function makes WebSearch+ its default
 * provider and updates completed metadata to display the backend that returned results.
 *
 * @param input OpenCode services, router, status store, and normalized options.
 * @returns A promise that resolves after all WebSearch+ tools and hooks are registered.
 */
export declare const registerTools: (input: {
    readonly context: Context;
    readonly options: WebSearchPlusOptions;
    readonly router: FallbackRouter;
    readonly status: ProviderStatusStore;
}) => Promise<void>;
