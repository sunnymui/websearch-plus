# WebSearch+ implementation plan

## Goal

Build an OpenCode V2 plugin that becomes the sole default provider behind OpenCode's built-in `websearch` tool, with a configurable and observable fallback policy.

WebSearch+ must:

- Keep OpenCode's normal model-facing `websearch` capability.
- Route every normal `websearch` invocation through WebSearch+ first.
- Try multiple providers in a configured order or rotation.
- Use a stored OpenCode credential when one exists.
- Attempt anonymous calls only when the provider supports anonymous access.
- Exclude providers by removing them from configuration.
- Continue after configured failures such as `403`, `429`, timeouts, and `5xx`.
- Tell the model and user which provider produced the result.

## Compatibility baseline

OpenCode's built-in `websearch` is the base reference. WebSearch+ replaces its default provider selection, not the tool interface or the search-result contract.

For built-in providers, WebSearch+ must preserve:

- OpenCode's provider adapters and their request formats.
- OpenCode's credential resolution and anonymous-request behavior.
- The built-in `WebSearch.Result` contract.
- OpenCode permission checks, cancellation signals, and normal tool output handling.

WebSearch+ must not reimplement HTTP clients for Exa, Tavily, Parallel, or Firecrawl. It calls their built-in adapters through `ctx.websearch.query({ query, providerID })` and adds only provider ordering, fallback, cooldowns, and status reporting.

Brave and Nimble are the only plugin-native adapters. They must normalize into the same `WebSearch.Result` contract and follow the same cancellation, output, and status rules as the built-in providers.

## Non-goals

- Forking OpenCode or replacing its UI.
- Reimplementing built-in provider adapters.
- Reading OpenCode's SQLite database directly, logging keys, returning keys to a model, or writing keys into configuration.
- Bypassing network controls, provider terms, quotas, or authentication.
- Guaranteeing anonymous access to any provider.

## Plugin identity

| Item | Value |
| --- | --- |
| Display name | WebSearch+ |
| Plugin ID | `websearch-plus` |
| Provider ID | `websearch-plus` |
| Plugin path | `~/.config/opencode/plugins/websearch-plus/` |

The plugin will use the V2 API:

```ts
import { Plugin } from "@opencode/plugin"

export default Plugin.define({
  id: "websearch-plus",
  async setup(ctx) {
    // Register the WebSearch+ provider and diagnostics tool.
  },
})
```

## Provider policy

### Built-in adapters

WebSearch+ will call OpenCode's built-in adapters directly:

```text
exa, tavily, parallel, tinyfish, firecrawl
```

The plugin calls a named provider with:

```ts
ctx.websearch.query({ query, providerID })
```

This lets OpenCode apply a connected provider credential without exposing the key to the plugin. Without a connection, the built-in adapter makes its normal anonymous request when that adapter/provider accepts one.

### Plugin-native adapters

| Provider | ID | Authentication | Default behavior without a key |
| --- | --- | --- |
| Brave LLM Context | `brave` | `X-Subscription-Token` from the `websearch-plus-brave` integration | Skip; Brave documents a key as required |
| Nimble Search | `nimble` | Bearer token from the `websearch-plus-nimble` integration | Skip; Nimble documents a key as required |
| TinyFish Search | `tinyfish` | `X-API-Key` from the `websearch-plus-tinyfish` integration | Skip; TinyFish Search requires a key |

Brave endpoint:

```text
POST https://api.search.brave.com/res/v1/llm/context
```

Brave defaults:

```text
count: 10
maximum_number_of_urls: 8
maximum_number_of_tokens: 4096
maximum_number_of_tokens_per_url: 1024
context_threshold_mode: balanced
enable_source_metadata: true
```

Map `grounding.generic` results to OpenCode results using each URL, title, and joined snippets.

Nimble endpoint:

```text
POST https://sdk.nimbleway.com/v2/search
```

Nimble defaults:

```text
search_depth: standard
max_results: 8
output_format: markdown
full_content: false
```

Map each Nimble result's `url`, `title`, and `content` or `description` to an OpenCode result.

TinyFish endpoint:

```text
GET https://api.search.tinyfish.ai?query=<query>
X-API-Key: <key>
```

TinyFish is a plugin-native provider. It is not part of the installed OpenCode beta's built-in provider registry and it is not keyless. Map its `results[].url`, `results[].title`, and `results[].snippet` fields to an OpenCode result.

## Configuration

The plugin owns the selected web-search provider by calling:

```ts
editor.default.set("websearch-plus")
```

Remove the built-in top-level setting below when enabling the plugin:

```jsonc
// Remove this to avoid conflicting selection policy.
"websearch": { "provider": "random" }
```

Do **not** set `websearch` to `false`. That disables the model-facing tool entirely. The desired path is:

```text
Model calls `websearch`
→ OpenCode selects `websearch-plus` as the only default provider
→ WebSearch+ applies its rotation and fallback policy
→ one built-in or plugin-native provider returns normalized results
```

The built-in provider adapters remain implementation dependencies only. Models do not select Exa, Tavily, Parallel, or Firecrawl directly. Brave, Nimble, and TinyFish are plugin-native adapters.

Global configuration example:

```jsonc
{
  "plugins": [
    {
      "package": "~/.config/opencode/plugins/websearch-plus",
      "options": {
        "providers": [
          "exa",
          "tavily",
          "parallel",
          "firecrawl"
        ],
        "strategy": "random",
        "randomProviderPreference": "has-api-key",
        "perProviderTimeoutMs": 10000,
        "totalTimeoutMs": 30000,
        "maxResults": 8,
        "maxContentTokens": 4000,
        "retryStatuses": [401, 403, 408, 429, 500, 502, 503, 504],
        "retryOnEmptyResults": true,
        "skipWithoutCredential": ["brave", "nimble"],
        "cooldowns": {
          "authFailureMs": 900000,
          "rateLimitDefaultMs": 60000,
          "transientFailureMs": 30000
        }
      }
    }
  ]
}
```

The `providers` array is the allow-list. Remove a provider from the array to exclude it. Firecrawl is allowed by default but can be removed when its endpoint is blocked. Brave, Nimble, and TinyFish are opt-in: add them after connecting their keys.

```jsonc
"providers": [
  "exa",
  "tavily",
  "parallel",
  "tinyfish",
  "firecrawl",
  "brave",
  "nimble"
]
```

## Documentation and support surface

OpenCode V2 does not prescribe a README format or automatic plugin help command. WebSearch+ should use normal repository documentation plus OpenCode-native diagnostics.

### Repository files

```text
README.md                 Installation, configuration, examples, and troubleshooting
PLAN.md                   Design and implementation plan
CHANGELOG.md              User-visible changes by version
src/index.ts              Plugin entrypoint
src/options.ts            Option schema and defaults
src/providers/            Built-in routing, Brave, and Nimble adapters
src/status.ts             Safe operational-status model
test/                     Unit and integration tests
```

### README requirements

The README should cover:

1. What WebSearch+ changes and what it leaves to built-in OpenCode websearch.
2. Installation and global `plugins` configuration.
3. Every option, default, and valid provider ID.
4. Credential setup through `/connect` for built-in providers, Brave, and Nimble.
5. The authenticated → anonymous → skip selection rule.
6. Rotation, fallback, timeout, cooldown, and provider-exclusion behavior.
7. Privacy rules: no keys, queries, result content, or raw error bodies are persisted by the plugin.
8. The status tool and a troubleshooting table.
9. Supported OpenCode V2 versions and known network limitations.

### Help and diagnostics

Register `websearch_plus_status` as the canonical diagnostic interface. It is deterministic and returns current provider policy, credential state, cooldowns, and the last safe operational outcome.

The status output must also report whether `websearch-plus` is the active default. If another top-level configuration or plugin overrides it, status must show a clear misconfiguration warning.

Do not add a model-facing help command as the primary support mechanism. A slash command only prompts a model and may summarize status incorrectly. A future CLI-plugin UI command can be added if users need an interactive provider-settings screen, but it is out of scope for the first release.

## Authentication selection

`randomProviderPreference` applies only when `strategy` is `"random"`:

| Value | Candidate-pool behavior |
| --- | --- |
| `"has-api-key"` | Try providers with an active OpenCode credential first, then anonymous-capable providers. |
| `"keyless"` | Try anonymous-capable providers first, then providers that require or have configured credentials. |
| `"none"` | Use one provider pool; credentials do not affect ordering. |

WebSearch+ shuffles within each resulting pool. `first` and `rotate` use the configured `providers` list directly and ignore `randomProviderPreference`.

`randomProviderPreference` changes ordering only. If the selected provider has a connected API key, WebSearch+ uses that key. `"keyless"` does not suppress an available credential or force an authenticated provider to make an anonymous request.

For every provider, WebSearch+ follows the same policy:

```text
Active OpenCode credential exists
→ use it for the request

No credential, but anonymous access is supported
→ make an anonymous request

No credential and a key is required
→ skip the provider and record "key required"
```

Built-in adapters manage their own connected credentials when called through `ctx.websearch.query`. Brave and Nimble are plugin-native adapters, so they resolve their active namespaced OpenCode key only while constructing the outbound request header.

## Rotation and fallback

Support three strategies:

| Strategy | Behavior |
| --- | --- |
| `first` | Start with the first configured provider every time. |
| `rotate` | Rotate the first provider on each request. |
| `random` | Shuffle providers for each request. |

For one query, try each provider at most once. Stop at the first non-empty usable result set.

| Outcome | Action |
| --- | --- |
| Success | Return results. |
| Empty result set | Try the next provider when configured. |
| `401` / `403` | Try the next provider; apply auth-failure cooldown. |
| `429` | Honor `Retry-After` when present; otherwise use default cooldown. |
| Timeout / network error / `5xx` | Try the next provider; apply transient cooldown. |
| All providers fail | Return one concise summary with attempted providers and failure classes. |

Brave and Nimble are skipped without credentials because their documentation requires API keys. Built-in providers are attempted through their normal OpenCode adapter behavior; anonymous success is opportunistic, not guaranteed.

## Approved defaults

| Setting | Default |
| --- | --- |
| `strategy` | `"random"` |
| `randomProviderPreference` | `"has-api-key"` |
| Auth-failure cooldown | 15 minutes |
| Brave and Nimble | Opt-in after their keys are connected |
| Result budget | 8 results and about 4K tokens total |

## Credentials

Built-in providers retain OpenCode's normal `/connect` credential path. WebSearch+ calls those providers through `ctx.websearch.query`, so the plugin never receives their keys.

WebSearch+ registers namespaced key integrations through `IntegrationEditor.method.update`, which the V2 core source creates when the integration ID is absent:

```text
websearch-plus-brave
websearch-plus-nimble
websearch-plus-tinyfish
```

The plugin resolves these values in memory only while constructing the outbound HTTP request. It must never access SQLite directly, log keys, return them to a model, persist them in plugin storage, or write them into plugin configuration.

The status model is:

```text
allowed → connected or anonymous → healthy, blocked, cooling down, or untried
```

## Observability

### Search output

Include a short header in returned content:

```text
WebSearch+ provider: Brave LLM Context (authenticated)
Fallbacks attempted: Firecrawl (HTTP 403)
```

Do not rely only on OpenCode tool metadata because models do not always receive or repeat it.

After the web-search call completes, WebSearch+ updates the built-in tool metadata to the selected underlying provider. This lets the completed TUI call show `Web Search via Tavily` instead of `Web Search via Websearch-plus`. During execution, the TUI can still show `Websearch-plus` because OpenCode selects that provider before fallback routing starts.

### Status tool

Register `websearch_plus_status`. It reports no secrets and no query text:

```text
Provider   Allowed   Credential      Last result
Exa        yes       connected       success
Tavily     yes       not connected   untried
Parallel   yes       not connected   success (anonymous)
Firecrawl  yes       not connected   blocked: HTTP 403
Brave      yes       connected       success
Nimble     yes       not connected   skipped: key required
```

Persist only operational metadata in plugin storage: provider, time, auth mode, status class, cooldown, and latency. Do not persist keys, queries, result content, or raw error bodies.

## Implementation phases

### Phase 1: foundation

1. Create the V2 plugin entrypoint and option validation.
2. Register `websearch-plus` and set it as the default provider.
3. Implement candidate ordering, total timeout, per-provider timeout, error classification, and cooldown storage.
4. Add result headers and `websearch_plus_status`.

### Phase 2: built-in provider fallback

1. Add direct calls to Exa, Tavily, Parallel, and Firecrawl through `ctx.websearch.query`.
2. Verify credential use remains inside OpenCode's integration layer.
3. Compare a direct built-in provider result with WebSearch+ using that same provider and confirm the normalized result contract is unchanged.
4. Test first, rotate, and random strategies.

### Phase 3: Brave, Nimble, and TinyFish

1. Implement their HTTP clients with cancellation signals.
2. Register and resolve their namespaced `/connect` key integrations only when selected.
3. Normalize Brave LLM Context, Nimble Search, and TinyFish Search responses.
4. Add unit tests for response mapping and missing-key skip behavior.

### Phase 4: verification and rollout

1. Test a successful request for every connected provider.
2. Test fallback after a controlled timeout, `403`, `429`, `5xx`, and empty result set.
3. Confirm Firecrawl is never called after it is removed from `providers`.
4. Confirm no credential or query content appears in status, plugin storage, or logs.
5. Enable globally, restart the service, and verify with `opencode run` and the TUI.

## Rollback

1. Remove the WebSearch+ entry from `plugins`.
2. Restore a fixed built-in provider, for example:

   ```jsonc
   "websearch": { "provider": "exa" }
   ```

3. Restart the service:

   ```sh
   opencode service restart
   ```

## References

- <https://opencode.ai/v2/docs/build/plugins>
- <https://opencode.ai/v2/docs/websearch>
- <https://api-dashboard.search.brave.com/documentation/services/llm-context>
- <https://docs.nimbleway.com/api-reference/search/search>
