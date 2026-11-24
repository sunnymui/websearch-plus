import type { Context } from "@opencode/plugin/promise/plugin";
import type { WebSearchPlusOptions } from "./options.js";
import { FallbackRouter } from "./router.js";
import { ProviderStatusStore } from "./status.js";
/**
 * Creates the fallback router used by the WebSearch+ provider.
 *
 * It resolves credentials, distinguishes custom/native/built-in providers, dispatches the
 * matching adapter, and records safe attempt and completion metadata through the status store.
 *
 * @param input OpenCode services, normalized options, status store, and available built-in IDs.
 * @returns A configured fallback router for WebSearch+ calls.
 */
export declare const createProviderRouter: (input: {
    readonly context: Context;
    readonly options: WebSearchPlusOptions;
    readonly status: ProviderStatusStore;
    readonly builtInProviderIDs: ReadonlySet<string>;
}) => FallbackRouter;
