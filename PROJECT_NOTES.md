# Project Notes

## AI architecture migration (current)

The chat system is now a model-driven MCP agent. The classifier-first router, phrase-based
fallback responses, regex campaign-creation extractor and the in-memory proposal/conversation
stores have been retired.

### Layers

- `lib/ai/agent.ts` — one model call per step, up to 4 tool steps, full chronological history.
- `lib/mcp/google-ads-server.ts` — MCP JSON-RPC server (`initialize`, `tools/list`, `tools/call`).
  Read tools query live Google Ads; write tools only prepare proposals.
- `lib/google-ads/catalog.ts` — declarative operation catalog. Adding an edit is a data entry.
- `lib/google-ads/mutate.ts` — single mutate gateway with `validateOnly` pre-flight.
- `lib/ai/execution.ts` — deterministic execution: binding, re-validation, drift, idempotency,
  mutate, read-back verification, audit.
- `lib/store/*` — D1-backed durable storage with compare-and-swap claim/approve.
- `lib/ai/identity.ts` — Firebase ID token verification (RS256 via JWKS).
- `lib/ai/account-binding.ts` — server-side account ownership and credential resolution.

### Supported write operations

`update_campaign_status` (pause/enable), `update_campaign_budget`, `update_campaign_name`,
`update_campaign_dates`, `update_campaign_network_settings`, `update_campaign_tracking`,
`update_campaign_bidding_strategy`, `update_campaign_conversion_goals`, `create_campaign`
(SEARCH and MULTI_CHANNEL app-install).

### Not supported yet

Campaign removal, ad group / keyword / ad creation and editing, assets, audiences, shared
negative keyword lists, PMax asset groups. `get_ads_performance` and `get_conversion_metrics`
are not exposed because no GAQL query backs them.

### Environment

- `AI_STORE=memory` forces the in-memory store (tests, local dev without D1).
- `AI_PROPOSAL_EXPIRATION_MINUTES` defaults to 60.
- `AI_ALLOW_ANONYMOUS=1` is development-only and ignored in production.
- D1 binding `DB` is declared in `wrangler.jsonc`; schema in `migrations/0001_ai_agent.sql`.

### Verification

- `npm test` — 83 tests across 5 files.
- `npx tsc --noEmit` — clean.
- `npx next build` and `npx opennextjs-cloudflare build` — both succeed.
- Worker runtime smoke test: all four AI endpoints return 401 without a token.
- D1 compare-and-swap verified: first claim returns the row, second returns zero rows.

### Known environment issue

`next build` fails on the `F:` drive with `EISDIR ... readlink` because that filesystem
returns EISDIR for `readlink` on regular files. The same build succeeds on `C:`. This is
pre-existing and unrelated to the AI migration.

