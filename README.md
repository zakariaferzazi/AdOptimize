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

Without a D1 binding the agent still runs, but it falls back to an in-memory store.
Conversations and proposals then do not survive across requests, and approvals fail
closed with "proposal not found". The server logs a warning when this happens.
