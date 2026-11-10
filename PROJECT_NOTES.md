# Project Notes

## AI architecture migration (current)

The chat system is now a model-driven MCP agent. The classifier-first router, phrase-based
fallback responses, regex campaign-creation extractor and the in-memory proposal/conversation
stores have been retired.

### Layers

- `lib/ai/agent.ts` — one model call per step, up to 4 tool steps, full chronological history.
- `lib/ai/task-state.ts` — durable per-conversation task memory: objective, campaign,
  collected parameters, decisions, unresolved requirements, pending proposal.
- `lib/mcp/google-ads-server.ts` — MCP JSON-RPC server (`initialize`, `tools/list`, `tools/call`).
  Read tools query live Google Ads; write tools only prepare proposals.
- `lib/google-ads/catalog.ts` — declarative operation catalog. Adding an edit is a data entry.
- `lib/google-ads/mutate.ts` — single mutate gateway with `validateOnly` pre-flight and
  structured Google Ads error extraction (code, field path, trigger).
- `lib/ai/execution.ts` — deterministic execution: binding, re-validation, drift, idempotency,
  mutate, read-back verification, audit.
- `lib/store/*` — D1-backed durable storage with compare-and-swap claim/approve.
- `lib/ai/identity.ts` — Firebase ID token verification (RS256 via JWKS).
- `lib/ai/account-binding.ts` — server-side account ownership and credential resolution.

### Conversation continuity

The model owns reasoning; the server owns memory. Each turn the agent receives the full
chronological transcript (including prior tool calls and results) plus the persisted
`TaskState` in the system prompt. The model calls `update_task_state` to record what it
learned, sending only the delta. Parameters merge key-by-key, so a follow-up that supplies
only the budget keeps the name and channel captured earlier.

This is what stops the agent re-asking for information it already has, and what makes
"create it" continue an in-progress campaign creation instead of starting over.

### Conversion goals

Three distinct layers, which the agent must not conflate:

1. Account-level conversion actions (`get_conversion_actions`).
2. Campaign-level goal categories (`get_campaign_conversion_goals`).
3. Individual action selection.

`update_campaign_conversion_goals` writes to the `campaignConversionGoals` service using
the real resource name `customers/{cid}/campaignConversionGoals/{campaignId}~{category}~{origin}`.
The `origin` is required because a category can exist under several origins and the API
rejects `UNKNOWN`. Read-back verification matches on both category and origin.

### Supported write operations

`update_campaign_status` (pause/enable), `update_campaign_budget`, `update_campaign_name`,
`update_campaign_dates`, `update_campaign_network_settings`, `update_campaign_tracking`,
`update_campaign_bidding_strategy`, `update_campaign_conversion_goals`, `create_campaign`
(SEARCH and MULTI_CHANNEL app-install).

A campaign-level max CPC cap is **not** supported. `create_campaign` accepts `maxCpc` so the
constraint is recorded and surfaced on the approval card, but it is not applied.

### Not supported yet

Campaign removal, ad group / keyword / ad creation and editing, assets, audiences, shared
negative keyword lists, PMax asset groups, per-campaign conversion action selection (only
goal categories can be toggled). `get_ads_performance` and `get_conversion_metrics` are not
exposed because no GAQL query backs them.

### Environment

- `AI_STORE=memory` forces the in-memory store (tests, local dev without D1).
- `AI_PROPOSAL_EXPIRATION_MINUTES` defaults to 60.
- `AI_ALLOW_ANONYMOUS=1` is development-only and ignored in production.
- D1 binding `DB` is declared in `wrangler.jsonc`; schema in `migrations/0001_ai_agent.sql`.

### Deploying

Wrangler validates the D1 `database_id` at deploy time and rejects a placeholder with
error 10021. The database must be created once before the first deploy:

```bash
npm run db:create     # prints the database_id
# paste it into the d1_databases binding in wrangler.jsonc
npm run db:migrate    # creates the tables remotely
npm run deploy
```

`npm run deploy` runs `scripts/predeploy-check.js` first, which stops with the exact
fix when the binding is missing or still a placeholder.

Without a D1 binding the agent falls back to an in-memory store. Conversations and
proposals then do not survive across requests, and `prepareProposal` fails closed in
production rather than issuing an approval card that could never execute.

### Verification

- `npm test` — 99 tests across 7 files.
- `npx tsc --noEmit` — clean.
- `npx next build` and `npx opennextjs-cloudflare build` — both succeed.
- Worker runtime smoke test: all four AI endpoints return 401 without a token.
- D1 compare-and-swap verified: first claim returns the row, second returns zero rows.

Conversation regression coverage lives in `tests/agent-conversations.test.ts` (the two
reported multi-message scenarios) and `tests/agent-payload.test.ts` (inspects the actual
model request payloads to prove history, tool results and task state are preserved).

### Known environment issue

`next build` fails on the `F:` drive with `EISDIR ... readlink` because that filesystem
returns EISDIR for `readlink` on regular files. The same build succeeds on `C:`. This is
pre-existing and unrelated to the AI migration.

