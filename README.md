# AI Marketing Manager

AI Marketing Manager is an autonomous AI marketing agent that helps businesses manage, analyze, and optimize their advertising campaigns.

Instead of simply showing dashboards and metrics, the AI agent continuously monitors advertising performance, understands what is happening, identifies problems and opportunities, decides what actions should be taken, and can optimize campaigns automatically.

## The AI Marketing Agent

The core of the product is an AI agent that acts like a dedicated marketing manager.

It continuously monitors connected advertising accounts and can:

- Analyze campaign performance
- Detect wasted advertising spend
- Identify underperforming campaigns
- Find high-performing campaigns
- Detect sudden performance changes
- Analyze CPA, ROAS, CTR, CPC, conversions, and other metrics
- Identify problematic keywords and search terms
- Detect budget allocation problems
- Find opportunities to improve ROI
- Explain why performance changed
- Recommend specific actions
- Execute supported optimizations
- Monitor the results after making changes
- Continue optimizing based on the new results

The goal is to give a business an AI agent that can perform many of the tasks normally handled by a human performance marketer.

## How It Works

```text
Connect Advertising Account
            ↓
      AI Monitors Data
            ↓
      Analyze Performance
            ↓
 Detect Problems & Opportunities
            ↓
      Decide What To Do
            ↓
 Recommend / Execute Changes
            ↓
      Monitor Results
            ↓
      Optimize Again
```

## Deployment

The AI agent stores conversations, proposals and execution records in Cloudflare D1.
The database must exist before the Worker can be deployed, because Wrangler validates
the `database_id` at deploy time.

One-time setup:

```bash
npm run db:create     # creates the D1 database and prints its database_id
# paste the database_id into the d1_databases binding in wrangler.jsonc
npm run db:migrate    # creates the tables in the remote database
```

Then deploy:

```bash
npm run deploy
```

`npm run deploy` runs `scripts/predeploy-check.js` first. If the D1 binding is missing
or still contains a placeholder id, it stops with the exact fix instead of letting
Wrangler fail with error 10021.

Production requires the D1 binding; deployment and chat requests fail explicitly
if durable storage is unavailable rather than silently saving to memory.
Development and tests can still use `AI_STORE=memory`.

Chat history belongs to the signed-in Firebase user and is stored in D1. After
sign-in, the chat loads the account's conversation list and fetches messages when
a conversation is opened, even if browser storage was cleared or a different device
is used. Rename, delete and clear-history actions update the account's saved data.
The browser cache is only a convenience, not the source of account history.
Clearing cookies signs the user out; signing back into the same account restores
server-saved chats. Older chats that only exist in a browser cache are not
automatically uploaded; continuing such a chat recovers its transcript when the
server has no messages for that conversation.

## Google Ads audit

The Audit page runs a read-only report against the signed-in user's connected
Google Ads account, not the cached insights feed. Choose complete-day presets
or custom dates (up to 366 days), with an equally long previous-period comparison.
Dates use the Google Ads account time zone. Optional CPA and ROAS targets are
audit benchmarks only; they never change bidding settings.

Reports include campaign performance, non-converting reported search queries,
current keyword Quality Scores, prioritized review steps and a CSV export.
The CSV is a single findings table (priority, category, campaign, finding,
evidence and next step), with the reporting dates in its filename. Account
details, metric summaries and coverage notes remain on the audit page.
Checks are deterministic and disclose their thresholds, missing data and row
limits. Zero conversions are not proof of waste, missing revenue is not zero
ROAS, and overlapping campaign/query spend is not added into a savings claim.
Keyword and query failures are shown as incomplete coverage, not passing checks.
Campaign-level failures stop the report. Google Ads reads may use the shared
60-second query cache.

Automations is no longer an application page or navigation item. The AI
Marketing Agent and its explicit proposal/approval workflow are unchanged.

## Reports and activity

Reports reads selected-period and equally long previous-period campaign
performance directly from the signed-in user's server-bound Google Ads account.
Presets and custom dates use the account time zone (maximum 366 days).
Account totals include all non-removed campaigns; the campaign table loads
the top 200 by spend, with explicit coverage notes. Table search, current-status
filters and sorting also control the clean campaign CSV and printable report.
Missing CPA/ROAS stays unavailable rather than becoming a misleading zero.

Activity is a read-only AdOptimize history, not Google's complete change log.
AI proposal, approval, cancellation and execution events are loaded from D1,
scoped by verified user and server-bound account before pagination. Load older
AI events to extend the searchable history. Account-linked app records are
read from Firestore; up to 200 are displayed. Older app records without an
account ID are excluded rather than attributed to the wrong account.
Filters and CSV export apply to loaded records. Source failures are disclosed.

An approval does not mean a change ran. AI executions distinguish verified,
failed and unverified outcomes, with recorded details and available snapshots.
App mutations accepted by the API are labelled separately from read-back
verified executions; app-only records are not proof of Google Ads changes.
The former activity-page Revert action only changed app records and has been
removed. Undoing a live change requires a fresh, explicitly approved proposal.

## Polar billing (sandbox first)

One paid plan, **Pro: USD $29/month or $99/year**, plus applicable taxes.
Basic dashboard/campaign viewing, settings, billing, and activity history remain
free. Pro protects AI chat/approval/execution, Ads Audit, Reports, Budget Optimizer,
Google Ads mutations, and the HTTP MCP endpoint. Conversation history and canceling
an unexecuted proposal remain available after expiration.

The official `@polar-sh/sdk` is pinned to API version `2026-10`.
Use Node.js 24+ for local tooling/builds, as required by the SDK package.
Billing uses Firebase ID tokens and D1, never a browser-selected plan. An HttpOnly, SameSite
session cookie lets server pages check the same stored entitlement; only its
SHA-256 hash is stored, and it expires no later than its Firebase token.
Token refresh rotates the session; logout invalidates it. Clearing cookies does
not delete subscriptions or account history.

The homepage always remains public, including for signed-in users. Log In opens
`/sign-in`; Get started and the Google signup CTAs open `/sign-up`, where Google
authentication is initiated. Sign-in synchronizes the secure server session
before navigating to the workspace. Anonymous workspace visits go to sign-in;
only the homepage **View Demo** link opens the anonymous dashboard preview at
`/dashboard?demo=true`. That flag never bypasses API authentication or Pro access.
Subscription management is available in Settings and `/billing`, not a
sidebar "Billing & Pro" button. Rebuild before deploying routing changes;
deploying an existing `.open-next` bundle can publish stale UI.
Paid signup follows Account -> Plan -> Polar payment -> Connect Google Ads.
Only webhook-confirmed Pro access reveals the connection step; returning to
sign-up with an active subscription resumes it. It reuses the app's connection
modal instead of a standalone pre-payment onboarding page. Google Ads consent
still requires an explicit user click, separately from login. Users choosing the
free plan go straight to their dashboard and can connect later in Settings.
Auth screens include an illustrative AI Marketing Agent conversation, not customer
data or promised performance results. Keep decorative sparkle icons out of the website UI;
navigation and loading indicators use functional icons instead.
Email signup requires **Email/Password** to be enabled under Firebase Console ->
Authentication -> Sign-in method in the project used by `firebase-applet-config.json`.
`OPERATION_NOT_ALLOWED` from `accounts:signUp` means that provider is disabled;
changing Cloudflare secrets or the form will not enable it. Enable Email/Password
(not just email-link sign-in) and save before testing signup.

**Only verified webhooks write subscription state.** Checkout creation, redirect
parameters, and portal access cannot grant Pro. The SDK verifies the original raw
body, signature, and delivery timestamp (five-minute tolerance). D1 atomically
commits the event marker and state, so retries/concurrent duplicates are harmless
and failed writes can be retried. Resource modification times preserve ordering;
equal-time contradictory subscription states resolve conservatively. Only minimal
IDs/statuses/dates and payload hashes are saved, not webhook bodies, customer
addresses, payment details, portal tokens, or SDK errors.

Access requires an active allowlisted subscription with an unexpired paid-through
date. Scheduled cancellation retains access until that date; revocation, pausing,
and `past_due` suspend it. A newer active webhook restores recovered payments.
Subscription management displays scheduled cancellations as canceled with access
until period end, rather than simply active. It reloads webhook-backed status on
tab focus/visibility and every 30 seconds while visible; no manual refresh is
required. Status read failures remain visible and offer a retry.
Order/refund events are recorded but do not independently change access: refunds
follow the subscription's state. There is no invented `payment.failed` event;
failed renewals arrive as `subscription.past_due`/subscription updates.
Missing D1/configuration fails explicitly; `AI_STORE=memory` and
`AI_ALLOW_ANONYMOUS` never bypass paid-route authentication or entitlement checks.

### Configure sandbox

1. In your **Polar sandbox organization**, create two recurring fixed-price
   products: Pro Monthly ($29 USD, every one month), Pro Yearly ($99 USD, every one
   year). Each product should have exactly one enabled fixed USD price, with no
   metered or seat-based additions. Checkout validates this catalog configuration.
   Keep **Organization Settings > Subscriptions > Allow multiple subscriptions**
   disabled to prevent duplicate subscriptions, including concurrent checkouts.
   Trials and checkout discount codes are disabled by this integration.
   A checkout `503` with `billing_product_mismatch` means the fetched product
   fails catalog validation, even if all Wrangler secret names exist. The error
   lists the mismatched organization, archive state, cycle, price count, amount,
   or currency without exposing IDs or credentials. Check **Products** in the
   selected Polar environment, then update that environment's product IDs if
   necessary. Monthly and yearly IDs must refer to two separate products;
   recurring cycles are fixed at product creation.
2. Create an organization-scoped token with `checkouts:write`,
   `customer_sessions:write`, and `products:read`. Copy both product UUIDs and the
   organization UUID. Never put billing credentials in `NEXT_PUBLIC_*`.
3. Configure the server environment from `.env.example`. One flag,
   `POLAR_ENVIRONMENT` (`sandbox` or `production`, default **sandbox**), selects the
   whole credential set together: Polar API server, access token, organization,
   product IDs and webhook secret. **Production uses the plain names; sandbox uses
   the same names with a `_SANDBOX` suffix.** The sets are never mixed, and a
   missing value fails closed instead of falling back to the other environment.

   ```dotenv
   APP_URL=http://localhost:3000
   POLAR_ENVIRONMENT=sandbox
   # Sandbox set (used when POLAR_ENVIRONMENT is sandbox or unset)
   POLAR_ACCESS_TOKEN_SANDBOX=<sandbox-organization-token>
   POLAR_WEBHOOK_SECRET_SANDBOX=<exact-sandbox-webhook-secret>
   POLAR_ORGANIZATION_ID_SANDBOX=<sandbox-organization-uuid>
   POLAR_PRODUCT_PRO_MONTHLY_SANDBOX=<monthly-product-uuid>
   POLAR_PRODUCT_PRO_YEARLY_SANDBOX=<yearly-product-uuid>
   # Production set (used only when POLAR_ENVIRONMENT=production)
   POLAR_ACCESS_TOKEN=
   POLAR_WEBHOOK_SECRET=
   POLAR_ORGANIZATION_ID=
   POLAR_PRODUCT_PRO_MONTHLY=
   POLAR_PRODUCT_PRO_YEARLY=
   ```

   `APP_URL` is required for secure sign-in, even before Polar is configured.
   It is the canonical application origin, not user input. Use the actual
   HTTPS application/tunnel origin outside local development; it controls trusted
   return URLs and same-origin checks. Omitting `POLAR_ENVIRONMENT` defaults to
   sandbox; switching environments isolates customer/subscription/event records.
   Local billing also requires the D1 binding and schema. Choose the appropriate
   command; do not replay old ALTER TABLE migrations on an existing AI database:

   ```powershell
   # Fresh local database only:
   npm run db:migrate:local
   # Existing local database with AI migrations already applied:
   npm run db:migrate:billing:local
   ```

4. Create an API-version **2026-10** webhook endpoint at
   `https://YOUR_APP_OR_TUNNEL/api/billing/webhook`. Subscribe to:

   ```text
   subscription.created   subscription.updated    subscription.active
   subscription.canceled  subscription.uncanceled subscription.cycled
   subscription.revoked   subscription.past_due   subscription.paused
   subscription.resumed   subscription.migrated
   order.created          order.updated          order.paid
   order.refunded         refund.created         refund.updated
   ```

   Pass the dashboard webhook secret **unchanged**, including any `whsec_` prefix.
   Use an HTTPS tunnel or a sandbox deployment for local deliveries. Do not use
   public checkout links: start checkout from the signed-in app so Polar receives
   the verified Firebase UID as `external_customer_id`.
5. On Cloudflare, `wrangler.jsonc` sets the non-secret `APP_URL` variable to
   `https://adoptimize.app`. Update this value for another deployment domain;
   do not also create a secret with the same name.
   Configure the Polar values interactively (not as CLI values that can leak
   through shell history), then apply the schema before deployment. The migration
   creates the secure-session and rate-limit tables too, so it is required for
   sign-in even if Polar payments have not been configured:

   ```powershell
   npx wrangler secret put POLAR_ACCESS_TOKEN_SANDBOX
   npx wrangler secret put POLAR_WEBHOOK_SECRET_SANDBOX
   npx wrangler secret put POLAR_ORGANIZATION_ID_SANDBOX
   npx wrangler secret put POLAR_PRODUCT_PRO_MONTHLY_SANDBOX
   npx wrangler secret put POLAR_PRODUCT_PRO_YEARLY_SANDBOX
   # Production credentials (plain names) are only used once POLAR_ENVIRONMENT=production.
   npx wrangler secret put TOKEN_ENCRYPTION_KEY
   npm run db:migrate:billing
   npm run deploy
   ```

   `TOKEN_ENCRYPTION_KEY` is 32 random bytes, base64 encoded
   (`[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))`
   or `openssl rand -base64 32`). It encrypts stored Google Ads credentials; keep it
   secret and stable, because losing it means users must reconnect Google Ads.

   Start with sandbox values. Do not run these commands against a live deployment
   until you intend to change its configuration. `db:migrate:billing` applies the
   billing/session tables and the encrypted Google Ads token tables; both migrations
   are additive and repeatable. For a brand-new remote database, run the full
   `npm run db:migrate` once instead. Existing installations must use the
   billing-only command to avoid replaying earlier ALTER TABLE migrations.

### Sign-up, payment and routes

| Route | Purpose |
|---|---|
| `/sign-up` | One page, four steps: **Account → Plan → Polar checkout → Success**. The step is derived from server-side state (signed in? active subscription?), so a returning user resumes correctly. Accepts `?plan=monthly\|yearly` and `?next=<app path>` (whitelisted). |
| `/sign-in` | Email/password or Google sign-in, then returns to `?next=` (whitelisted) or the dashboard. |
| `/billing` | Manage an existing subscription (status, portal, invoices) inside the app. |
| `/billing/success` | Return page after checkout. It polls the verified server state; returning from checkout never grants access by itself. |

Homepage and pricing CTAs send new visitors to `/sign-up` and send signed-in users
straight to a server-created checkout. Visitors can continue with the free plan.
Paid pages redirect unauthenticated or unpaid users to `/sign-up?next=<page>`.

### Google Ads authorization

Google sign-in requests only `openid`, `email` and `profile`. Google Ads access is a
separate, incremental authorization-code flow (with PKCE and a single-use state)
that starts only when the user clicks **Connect Google Ads**. The server exchanges the
code, then stores the refresh and access tokens AES-256-GCM encrypted in D1
(`TOKEN_ENCRYPTION_KEY`), each bound to its owner. The browser never receives a
refresh token; it only receives short-lived access tokens minted by
`POST /api/google-ads/token`. Credentials stored in plaintext by earlier versions are
deleted automatically on the user's next load, and those users reconnect Google Ads.
The OAuth redirect URI registered with Google must be
`https://YOUR_DOMAIN/api/google-ads/oauth-callback`.

Endpoints: authenticated `POST /api/billing/checkout` accepts only
`{"interval":"monthly"}` or `{"interval":"yearly"}`; `POST /api/billing/portal`
accepts `{}`. `GET /api/billing/status` reads stored state. Responses containing
billing status or redirects are `no-store`; portal links are generated on click,
not stored. Checkout and portal are limited per verified user in D1 (5 and 10
requests per ten minutes). Other sensitive routes have persistent limits too.
Cloudflare connecting IPs are validated, hashed for short-lived auth rate limits,
and forwarded to checkout for country/tax detection; they are not logged.

### Verify and go live

- Run `npx vitest run`, TypeScript, and lint. The billing suite uses the real SDK
  signature verifier and an isolated real D1 instance; the Google Ads suite covers
  encryption at rest, single-use state, and credential isolation.
- Complete sandbox checkout for **both** intervals. Confirm Pro stays locked
  before the webhook and unlocks afterward, including after reload/new sign-in.
  Verify the portal, monthly/yearly switching, invoices, duplicate deliveries,
  scheduled cancellation, revocation, failed renewal/recovery, and refunds.
- Confirm unpaid users cannot call any premium API directly; free viewing,
  history, billing, and payment recovery must remain accessible. Test logout,
  expired sessions, and a second user's account.
- Monitor webhook delivery failures in Polar; correct failures and redeliver.
  Do not manually toggle database access flags. Alert on repeated non-2xx
  deliveries. Protect unsigned webhook traffic with Cloudflare WAF/rate limits.
- Review dependency audit findings and get a production Cloudflare build/preview
  passing. Automated mocked-provider tests are not a real sandbox payment test.
- Create equivalent **production** products/token/webhook and configure allowed
  portal plan changes between only the two Pro products. Keep multiple
  subscriptions disabled. Set the plain-named production secrets, then set
  `POLAR_ENVIRONMENT=production` (the one switch for API server, token,
  organization, products and webhook secret) and the real HTTPS `APP_URL`, deploy,
  and verify one controlled live purchase and webhook before launch.

Official references:
[TypeScript SDK](https://polar.sh/docs/integrate/sdk/typescript.md),
[webhook verification](https://polar.sh/docs/integrate/webhooks/endpoints.md),
[checkout sessions](https://polar.sh/docs/features/checkout/session.md),
[customer portal](https://polar.sh/docs/features/customer-portal/navigate-customers.md),
[subscriptions](https://polar.sh/docs/features/subscriptions/introduction.md).
