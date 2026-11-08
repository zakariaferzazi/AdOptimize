# Adoptimize AI Google Ads Chat Audit

No `PROJECT_NOTES.md` file exists in the repository, so there was no project-notes entry to read or update.

## A. Request flow

1. **Chat UI state and request construction**
   - [`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:342) `handleSendMessage` creates a user `ChatMessage`, appends it to the current in-memory session, persists the sessions to browser `localStorage`, and posts to `/api/ai/chat`.
   - The request includes `message`, the complete current session messages as `conversationHistory`, the selected model, account/campaign data, access token, `recentActionProposals` extracted from existing messages, and `activeCampaign` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:389)).

2. **Chat endpoint input and context**
   - [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:190) `POST` parses the request, selects the requested model, validates that a message exists, and builds a `ToolContext`.
   - The context contains account, campaigns, keywords, search terms, audit logs, anomalies, insights, recommendations, rules, and the access token ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:210)).
   - The endpoint optionally refreshes campaign, keyword, and search-term data through [`queryLiveCampaigns`](./lib/google-ads-api.ts:437) when an access token and customer ID are present ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:245)).
   - For an already executed campaign-creation proposal missing from the synchronized campaign list, it constructs a fallback campaign object from the proposal payload ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:276)). This is conversation context, not proof that Google Ads currently contains the campaign.

3. **LLM context construction**
   - [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:303) builds a system prompt describing Google Ads behavior, safety rules, live-data status, and response formatting.
   - It appends up to the last 24 entries from `conversationHistory` ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:362)).
   - After deterministic evidence tools run, it appends the current user message plus serialized evidence as one additional user message ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:617)).

4. **Intent resolution and evidence/tool execution**
   - The route performs deterministic parsing for budget/status/create requests and resolves campaign references with [`resolveCampaignReference`](./lib/google-ads-tools.ts:35).
   - It constructs `evidenceTools` locally for the current request ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:493)).
   - Each selected tool is executed by [`executeGoogleAdsTool`](./lib/google-ads-tools.ts:500), and its result is recorded in `executedToolCalls` and `evidence` ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:543)).
   - Mutating requests are handled before OpenRouter. A returned `actionProposal` is registered with [`registerChatProposal`](./lib/chat-proposal-store.ts:10), and the route returns a card payload without changing Google Ads ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:567)).

5. **OpenRouter response**
   - Read-only requests call [`sendOpenRouterChat`](./lib/openrouter-service.ts:75) from [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:624).
   - The chat route does not pass `GOOGLE_ADS_TOOL_DEFINITIONS` to `sendOpenRouterChat`; tools are precomputed by the route instead.
   - If OpenRouter fails or returns no reply, the route uses `synthesizeDeterministicGoogleAdsResponse` ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:637)).

6. **Response and card rendering**
   - The route returns `reply`, tool-call evidence, optional `actionProposal`, recommendations, analysis details, table data, and active-campaign context ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:705)).
   - The UI converts that response to an assistant `ChatMessage` and persists it in `localStorage` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:420)).
   - The active chat view renders the approval card inline in [`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:1090). A reusable alternative exists in [`components/chat/action-proposal-card.tsx`](./components/chat/action-proposal-card.tsx:16).

7. **Approval and execution**
   - The approval button calls `handleApproveProposal` only from the card click handler ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:1217)).
   - It posts the proposal, including its approval token, to `/api/ai/chat/execute` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:600)).
   - [`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:11) validates the request and consumes the proposal authorization through [`consumeChatProposalAuthorization`](./lib/chat-proposal-store.ts:32).
   - The execution route requires a token, account access token, and a ten-digit customer ID ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:23) and [`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:87)).
   - It dispatches `CREATE_CAMPAIGN`, `UPDATE_BUDGET`, `PAUSE_CAMPAIGN`, `ENABLE_CAMPAIGN`, and `REALLOCATE_BUDGET` in its switch ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:151)).
   - Budget/status operations are verified with a fresh [`queryLiveCampaigns`](./lib/google-ads-api.ts:437) result before success is returned ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:95)).
   - Campaign creation calls [`createGoogleAdsCampaign`](./lib/google-ads-api.ts:1652), then verifies the created campaign by live query ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:151)).
   - On success, the UI changes the card status to `EXECUTED`; on failure, it changes the card to `FAILED` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:636)).

## B. Operations table

The tool definitions are declared in [`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:122). “Exposed to the LLM” means a tool definition exists. The chat route currently does not pass that definition array to OpenRouter, so these are not actually supplied as OpenRouter function tools by this endpoint.

| name | exists in the Google Ads integration? | exposed to the LLM as a tool? | has an execution handler? | reachable from the chat backend? |
|---|---|---|---|---|
| get_account_overview | Yes, from supplied account/campaign snapshot | Defined, not passed by chat route | Yes, local tool case | Yes |
| get_account_performance | Yes, from supplied campaign data | Defined, not passed by chat route | Yes | Yes |
| get_campaigns | Yes, live data can come from `queryLiveCampaigns` | Defined, not passed by chat route | Yes | Yes |
| get_campaign_performance | Yes, from supplied campaign data | Defined, not passed by chat route | Yes | Yes |
| get_search_terms | Yes, live data can come from `queryLiveCampaigns` | Defined, not passed by chat route | Yes | Yes |
| get_keywords | Yes, live data can come from `queryLiveCampaigns` | Defined, not passed by chat route | Yes | Yes |
| get_ads_performance | Partial/local data only; no dedicated Ads API mutation/query function in this path | Defined, not passed by chat route | Yes | Yes |
| get_conversion_metrics | Yes, derived from supplied data | Defined, not passed by chat route | Yes | Yes |
| get_performance_changes | Yes, derived from supplied data | Defined, not passed by chat route | Yes | Yes |
| get_change_history | Yes, from supplied `auditLogs` | Defined, not passed by chat route | Yes | Yes |
| analyze_account | Local analysis over supplied data | Defined, not passed by chat route | Yes | Yes |
| analyze_campaign | Local analysis over supplied data | Defined, not passed by chat route | Yes | Yes |
| find_wasted_spend | Local analysis over supplied data | Defined, not passed by chat route | Yes | Yes |
| identify_underperforming_campaigns | Local analysis over supplied data | Defined, not passed by chat route | Yes | Yes |
| identify_search_term_opportunities | Local analysis over supplied data | Defined, not passed by chat route | Yes | Yes |
| diagnose_performance_changes | Local diagnostic response | Defined, not passed by chat route | Yes | Yes |
| analyze_budget_allocation | Local recommendation generation | Defined, not passed by chat route | Yes | Yes |
| generate_optimization_recommendations | Local recommendation generation | Defined, not passed by chat route | Yes | Yes |
| create_campaign | Yes: [`createGoogleAdsCampaign`](./lib/google-ads-api.ts:1652) | Defined, not passed by chat route | Yes: `CREATE_CAMPAIGN` | Yes |
| update_campaign_budget | Yes: [`mutateGoogleAdsCampaignBudget`](./lib/google-ads-api.ts:1529) | Defined, not passed by chat route | Yes: `UPDATE_BUDGET` | Yes |
| pause_campaign | Yes: [`mutateGoogleAdsCampaignStatus`](./lib/google-ads-api.ts:1447) | Defined, not passed by chat route | Yes: `PAUSE_CAMPAIGN` | Yes |
| enable_campaign | Yes: [`mutateGoogleAdsCampaignStatus`](./lib/google-ads-api.ts:1447) | Defined, not passed by chat route | Yes: `ENABLE_CAMPAIGN` | Yes |
| update_supported_campaign_settings | No corresponding Google Ads API handler or execute-route case | Defined, not passed by chat route | No; falls through to unsupported tool | Not safely reachable |
| apply_approved_recommendations | No corresponding Google Ads API mutation in this path | Defined, not passed by chat route | Local success-shaped handler only | Yes, but it does not perform the described mutation |
| create_monitoring_rule | No Google Ads API operation; creates an in-memory object in the tool result | Defined, not passed by chat route | Local handler | Yes |
| list_monitoring_rules | No direct Google Ads API operation; reads supplied `rules` | Defined, not passed by chat route | Local handler | Yes |
| update_monitoring_rule | No persistence or Google Ads API mutation in this handler | Defined, not passed by chat route | Local success-shaped handler | Yes |
| disable_monitoring_rule | No persistence or Google Ads API mutation in this handler | Defined, not passed by chat route | Local success-shaped handler | Yes |
| retrieve_alerts | No direct Google Ads API operation; reads supplied anomalies | Defined, not passed by chat route | Local handler | Yes |
| retrieve_automation_history | No direct Google Ads API operation; returns hardcoded history rows | Defined, not passed by chat route | Local handler | Yes |

Direct Google Ads API primitives in [`lib/google-ads-api.ts`](./lib/google-ads-api.ts) are:

| API operation | Function | Used by chat execution |
|---|---|---|
| List accessible customers | `listAccessibleCustomers` ([line 342](./lib/google-ads-api.ts:342)) | Indirectly by account-access verification, not by `/api/ai/chat/execute` |
| Query campaigns and reporting data | `queryLiveCampaigns` ([line 437](./lib/google-ads-api.ts:437) | Yes, chat refresh and post-mutation verification |
| Verify account access | `verifyCustomerAccess` ([line 1324](./lib/google-ads-api.ts:1324)) | Not directly by the chat routes |
| Mutate campaign status | `mutateGoogleAdsCampaignStatus` ([line 1447](./lib/google-ads-api.ts:1447)) | Yes |
| Mutate campaign budget | `mutateGoogleAdsCampaignBudget` ([line 1529](./lib/google-ads-api.ts:1529)) | Yes |
| Create campaign and budget | `createGoogleAdsCampaign` ([line 1652](./lib/google-ads-api.ts:1652)) | Yes |
| Fetch structural entities | `fetchStructuralEntities` ([line 1820](./lib/google-ads-api.ts:1820)) | Not by the chat routes |

## C. Why the AI proposed creating a campaign, then said the account only returned campaign data

The statement is not a backend capability check; it is an LLM-generated response. The exact phrase does not exist in the repository.

1. The repository declares a `create_campaign` tool definition with a name, budget, and channel ([`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:318)).
2. The local tool implementation creates a pending `CREATE_CAMPAIGN` proposal without calling Google Ads ([`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:1023)).
3. The chat route also has a deterministic create branch that calls `executeGoogleAdsTool('create_campaign', ...)` and returns the pending card ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:483)).
4. The actual mutation exists in [`createGoogleAdsCampaign`](./lib/google-ads-api.ts:1652), and the execute route dispatches `CREATE_CAMPAIGN` to it ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:151)).
5. The OpenRouter request is made only for non-mutation paths and receives the system prompt plus serialized evidence, but no `GOOGLE_ADS_TOOL_DEFINITIONS` array ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:617); [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:624)).
6. The system prompt says that the server has already retrieved evidence and that the model should not claim new tool activity ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:303)), but there is no response validator that rejects unsupported claims.
7. The execute route can still reject the real operation before calling Google Ads when the access token is missing or the customer ID is not a ten-digit ID ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:87)). That failure is distinct from the LLM sentence.

Therefore the inconsistency is caused by two separate paths: the proposal is produced locally, while later conversational text is generated by OpenRouter without a capability-grounded response validator. The backend does have a campaign-creation function, but the client connection may still be unable to execute it because execution requires a valid token and customer ID.

## D. Proposal and approval state locations

1. **Browser session and approval-card state**
   - `ChatSession.messages` contains the assistant message and its `actionProposal` object ([`types/adoptimize.ts`](./types/adoptimize.ts:348)).
   - Sessions are persisted under `adoptimize_chat_sessions_${userId || 'guest'}` in browser `localStorage` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:118), [`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:203)).
   - The inline card renders from `message.actionProposal`; its buttons update that client copy ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:1090)).
   - The reusable `ActionProposalCard` also renders directly from a passed proposal object ([`components/chat/action-proposal-card.tsx`](./components/chat/action-proposal-card.tsx:16)).

2. **Server proposal authorization state**
   - [`lib/chat-proposal-store.ts`](./lib/chat-proposal-store.ts:8) stores proposals in a module-level in-memory `Map`.
   - `registerChatProposal` generates the approval token and forces `PENDING_APPROVAL` ([`lib/chat-proposal-store.ts`](./lib/chat-proposal-store.ts:10)).
   - `supersedeChatProposal` marks the stored proposal superseded and consumed ([`lib/chat-proposal-store.ts`](./lib/chat-proposal-store.ts:24)).
   - `consumeChatProposalAuthorization` validates proposal ID, token, pending status, and revision, then marks the stored proposal approved ([`lib/chat-proposal-store.ts`](./lib/chat-proposal-store.ts:32)).
   - `restoreChatProposalAfterFailure` restores a consumed proposal to pending ([`lib/chat-proposal-store.ts`](./lib/chat-proposal-store.ts:55)).

3. **Chat reply state**
   - The natural-language assistant reply is stored as `ChatMessage.content`, independently of `actionProposal` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:420)).
   - A reply can therefore discuss or describe an action without changing the proposal object or authorizing execution.

4. **Database/persistent server state**
   - There is no database-backed proposal authorization store in the approval flow.
   - Firestore helpers exist for generic conversations: `saveUserConversation`, `fetchUserConversations`, and `deleteUserConversation` ([`lib/firestore-service.ts`](./lib/firestore-service.ts:923)).
   - The current chat component uses browser `localStorage` and does not call those Firestore conversation helpers ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:167)).
   - The in-memory proposal map is lost across server process/worker restarts or routing to a different runtime instance, while the browser card can survive via `localStorage`.

5. **Execution result state**
   - The execute endpoint returns success/error JSON but does not persist the proposal's final status server-side after Google Ads execution ([`app/api/ai/chat/execute/route.ts`](./app/api/ai/chat/execute/route.ts:323)).
   - The browser changes the card to `EXECUTED` or `FAILED` based on that response ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:636)).

These are the main disagreement points: browser card state can outlive the in-memory authorization map; chat text is separate from the card; the Firestore conversation helpers are separate from the active chat persistence; and final execution status is primarily client-maintained.

## E. Conversation history sent to the LLM

### Included

- The client sends the current session's messages as `conversationHistory` ([`components/chat/ai-chat-view.tsx`](./components/chat/ai-chat-view.tsx:394)).
- Each entry includes only `role` and `content`; client-side proposal objects, tool-call arrays, table data, analysis details, model metadata, and active-campaign fields are omitted from this history mapping.
- The server keeps only the last 24 history entries ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:362)).
- The server includes only `user` and `assistant` roles in `formattedMessages`; no prior `tool` messages are sent ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:364)).
- The current request adds the latest user message plus serialized deterministic evidence as a new user message ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:617)).
- A separately structured `activeCampaign` and `recentActionProposals` context is used by deterministic routing, not included as structured messages in the LLM transcript ([`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts:224)).

### Dropped or not sent

- Proposal IDs, revisions, approval tokens, statuses, payloads, and supersession relationships are not included in the LLM conversation messages.
- Tool-call arguments/results from prior turns are not included as tool messages.
- `activeCampaign` is not included as a structured LLM field.
- `recentActionProposals` is not included as a structured LLM field.
- Recommendations, tables, analysis details, and execution results are not preserved in the LLM transcript except where their text was rendered into `content`.
- The request does not pass `GOOGLE_ADS_TOOL_DEFINITIONS` to OpenRouter, so the model cannot use native function calling through this endpoint.

## F. Existing code to reuse

- `ToolContext` and `ToolExecutionResult` in [`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:14) and [`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:25).
- `ProposedAccountChange`, `ChatMessage`, and `ChatConversation` in [`types/adoptimize.ts`](./types/adoptimize.ts:299), [`types/adoptimize.ts`](./types/adoptimize.ts:339), and [`types/adoptimize.ts`](./types/adoptimize.ts:388).
- `resolveCampaignReference` for campaign identity resolution ([`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:35)).
- `GOOGLE_ADS_TOOL_DEFINITIONS` for the existing tool contract ([`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:122)).
- `executeGoogleAdsTool` for shared read/proposal preparation ([`lib/google-ads-tools.ts`](./lib/google-ads-tools.ts:500)).
- `registerChatProposal`, `supersedeChatProposal`, `consumeChatProposalAuthorization`, and `restoreChatProposalAfterFailure` for the existing proposal lifecycle ([`lib/chat-proposal-store.ts`](./lib/chat-proposal-store.ts:10)).
- `queryLiveCampaigns`, `mutateGoogleAdsCampaignStatus`, `mutateGoogleAdsCampaignBudget`, and `createGoogleAdsCampaign` in [`lib/google-ads-api.ts`](./lib/google-ads-api.ts:437) for live data, mutation, and verification.
- `verifyCustomerAccess` in [`lib/google-ads-api.ts`](./lib/google-ads-api.ts:1324) for explicit account-access checks.
- `sendOpenRouterChat` and its typed `ChatCompletionMessage`/`ToolDefinition` contracts in [`lib/openrouter-service.ts`](./lib/openrouter-service.ts:15).
- `cleanForFirestore` and the existing conversation persistence helpers in [`lib/firestore-service.ts`](./lib/firestore-service.ts:21) and [`lib/firestore-service.ts`](./lib/firestore-service.ts:923).
- The existing inline card and reusable [`ActionProposalCard`](./components/chat/action-proposal-card.tsx:16) rather than creating another approval UI.

## Top 5 risks

1. **Proposal authorization is process-local.** The in-memory `Map` can disagree with a browser-persisted card after a restart, deployment, or multi-instance route.
2. **Conversation text is not capability-validated.** OpenRouter output is returned as `response.reply` without a backend validator that checks claims against actual tool results or execution state.
3. **Tool definitions and implementation coverage diverge.** Several declared tools have local success-shaped handlers but no Google Ads persistence or execution handler, especially campaign settings, recommendations, and monitoring operations.
4. **The chat transcript drops structured proposal state.** The LLM receives rendered text but not proposal IDs, revisions, statuses, payloads, or approval lifecycle metadata.
5. **Final proposal status is mainly client-side.** The execute endpoint returns a result but does not persist the terminal proposal state in a durable server/database record, so refreshes and multiple clients can disagree.
