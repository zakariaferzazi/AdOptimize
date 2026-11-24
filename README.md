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
