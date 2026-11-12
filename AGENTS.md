# Repository guidance

## Project context

AdOptimize is a Next.js and React application for advertising analysis and
optimization. `app/` contains pages and API routes, `components/` contains UI,
and `lib/` contains integrations and application logic. The application AI agent
and its Google Ads MCP server live in `lib/ai/` and `lib/mcp/`; they are product
runtime features, distinct from GitHub Copilot tooling. Storage implementations
are in `lib/store/`, and Vitest tests are in `tests/`.

Read the [project README](README.md) and [project notes](PROJECT_NOTES.md) for
more context. Treat historical verification claims as historical, not as evidence
that a check was run for the current change. The setup is tracked in the
[operating model issue](https://github.com/zakariaferzazi/AdOptimize/issues/2).

## Local checks

Install locked dependencies with `npm ci` when needed. From the repository root:

- `npm run lint` runs ESLint.
- `npx tsc --noEmit` runs the TypeScript check after dependencies are installed.
- `npm test` runs the Vitest suite.
- `npm run build:next` builds the Next.js application.
- `npm run build` selects the configured build path and may fall back to a
  Next.js build if the Cloudflare build fails. A successful fallback does not
  prove that the Cloudflare build succeeded.

Choose checks appropriate to the change and report the commands and results.
Use local, isolated environments and synthetic fixtures by default. For local
AI storage, set `AI_STORE=memory`; it is not durable. The D1 binding in
`wrangler.jsonc` is commented out, so do not infer live storage status from a
build. Do not run deployment, database, or live-service commands without
explicit human approval for the specific environment and action.

## Safety and collaboration

- Never commit secrets, credentials, private customer data, or private source
  material. Do not use real advertising accounts, spend, or mutations for
  development or validation without explicit human approval.
- GitHub issues, code, pull requests, and acceptance records are the source of
  truth. Reference Drive material only when it is approved for sharing and
  appropriate for this public repository; do not assume live synchronization.
- Start work from an issue on an isolated branch. Record reproducible evidence
  and limitations in a linked pull request, obtain independent human review,
  and require explicit human acceptance before treating the work as complete.
- A GitHub Copilot seat does not grant repository, cloud, or advertising account
  permissions. Respect existing access controls and request approval before
  changing settings or accessing a different environment.
- For UI changes, meet WCAG 2.2 AA and verify accessibility as appropriate.
