# Project Notes

## AI architecture (current)

The chat system is a single model-driven agent. There is no intent classifier, no keyword
routing, no phrase lists and no special-case handlers: the selected OpenRouter model decides
whether to answer, ask, investigate, recommend or prepare a change, using native tool calling.
The backend executes tools and returns structured results.

### Layers

| Layer | File | Responsibility |
|---|---|---|
| Orchestration | `lib/ai/agent.ts` | One model call per step; parallel independent reads; bounded steps/tools/deadline; duplicate-call suppression; context budget; tool-free closing summary. |
| Prompt | `lib/ai/prompts.ts` | Behaviour and Google Ads facts. No scripting; the persisted state is injected. |
| Conversation state | `lib/ai/agent-state.ts` | Multiple tasks per conversation, parameters, decisions, open questions, constraints, findings, resource registry, action log. Migrates the old single-task format. |
| Capabilities | `lib/ai/tools.ts` | Read tools, write operations (proposal-only) and `update_task`. |
| Query gateway | `lib/google-ads/gaql.ts` | GAQL runner: version fallback, timeouts, structured errors, request stats, 60s read cache, date ranges. |
| Reporting | `lib/google-ads/reporting.ts` | Business-level reads: campaigns, performance, campaign details, conversion setup, ad groups, keywords, search terms, diagnostics. |
| Operations | `lib/google-ads/operations/*` | Validated writes: prepare → Google `validateOnly` → proposal → drift check → mutate → read-back verify. |
| Mutate gateway | `lib/google-ads/mutate.ts` | Single write path with structured Google Ads error extraction. |
| Proposals | `lib/ai/proposals.ts` | Durable, revisioned, task-scoped superseding, destructive acknowledgement, expiry. |
| Execution | `lib/ai/execution.ts` | Deterministic: binding, re-validation, idempotency, CAS claim, drift, plan, verify, audit, outcome recorded into the conversation. |
| MCP | `lib/mcp/google-ads-server.ts` | JSON-RPC adapter over the same registry (no duplicated tool logic). |
| Storage | `lib/store/*` | D1 (durable) or in-memory (tests/dev), same compare-and-swap semantics. |

### Conversation continuity

Each turn sends the full chronological transcript (including prior tool calls and results) plus
a compact rendering of the persisted state. The model calls `update_task` to record what it
learned, sending only the delta; parameters merge key by key, so a correction changes one value
and keeps the rest. Proposals, resources and execution outcomes are recorded by the backend
without extra model calls, so the next turn knows what really happened.

### Google Ads facts encoded in the operations

- Money is always in the account currency; a different user-stated currency is rejected with an
  explanation instead of being silently applied.
- v26 campaign schedules use `start_date_time` / `end_date_time` (`YYYY-MM-DD HH:MM:SS`).
- Bidding: `MANUAL_CPC` → `manualCpc`; Maximize clicks → `targetSpend` (optional
  `cpcBidCeilingMicros`); Maximize conversions / Target CPA → `maximizeConversions`
  (optional `targetCpaMicros`); Maximize conversion value / Target ROAS →
  `maximizeConversionValue` (optional `targetRoas`). Smart bidding has no CPC cap; Manual CPC
  bids live on ad groups and keywords.
- App campaigns: `MULTI_CHANNEL` + `APP_CAMPAIGN`, bidding driven by
  `app_campaign_setting.bidding_strategy_goal_type` with `targetCpa` or `maximizeConversions`;
  specific actions use `selective_optimization.conversion_actions`.
- Conversion goals have three layers: account conversion actions; campaign goal categories
  (`campaign_conversion_goal`, category + origin, `biddable`); and specific actions for one
  campaign — a `CustomConversionGoal` applied through `ConversionGoalCampaignConfig` for
  non-App campaigns, selective optimization for App campaigns.
- Shared budgets and portfolio strategies affect other campaigns and are surfaced as warnings.

### Supported changes

Campaign: status, daily budget, name, schedule, networks, tracking, bidding strategy.
Creation: Search campaign (optionally with ad group, keywords and a responsive search ad) and
App campaign (with app goal and optional selective optimization), created atomically.
Conversion goals: toggle categories, optimise for specific actions, revert to account goals.
Structure: ad group status/bid/name, keyword status/bid, add keywords, add negative keywords
(campaign or ad group), create ad group.

Not supported: campaign removal, ad creation/editing outside campaign creation, assets,
audiences, shared negative lists, PMax asset groups, portfolio strategy editing.

### Safety

The model cannot mutate. A write tool validates against live data and Google Ads
(`validateOnly`), then stores a proposal bound to user, conversation, account, task and target.
Approval is tied to the exact revision and payload hash; destructive changes also require an
explicit acknowledgement. Execution re-validates, checks drift, claims the proposal with a
compare-and-swap, applies the plan, reads back and verifies, and records
`succeeded` / `executed_unverified` / `failed` in the audit log and the conversation.

### Efficiency

- No Google Ads call unless the model asks for data; nothing is pre-fetched per turn.
- Independent reads in one step run concurrently; identical calls in a turn are served from the
  turn cache; reads are cached for 60s and invalidated by any mutation.
- Limits: 6 model calls, 14 tool calls, 6 proposals, 52s deadline per turn.
- The context budget counts system prompt, tool schemas, full history and the output reserve
  against the model's real context window (from OpenRouter, with a conservative fallback).
  History is never truncated or summarised; when it no longer fits the user is asked to start a
  new chat.

### Environment

- `AI_STORE=memory` forces the in-memory store (tests, local dev without D1).
- `AI_PROPOSAL_EXPIRATION_MINUTES` defaults to 60.
- D1 binding `DB` in `wrangler.jsonc`; schema in `migrations/0001_ai_agent.sql`,
  `0002_task_state.sql`, `0003_proposal_meta.sql` (also applied automatically at runtime).

### Tests

`npm test` runs the deterministic suite (fake Google Ads backend + scripted model):
reporting, every operation end-to-end, agent loop limits, multi-turn scenarios, execution
safety, MCP protocol, state model and storage.

`npm run test:eval` runs the live-model evaluation (real OpenRouter model, fake account) and is
skipped unless `OPENROUTER_API_KEY` and `MODEL_CHATGPT`/`MODEL_DEEPSEEK` are set.
### Deploying

Wrangler validates the D1 `database_id` at deploy time. Create the database once, paste the id
into `wrangler.jsonc`, then `npm run db:migrate` and deploy.
