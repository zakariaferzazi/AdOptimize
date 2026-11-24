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
