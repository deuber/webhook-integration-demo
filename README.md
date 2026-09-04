# webhook-integration-demo

A small end-to-end integration project: a TypeScript/Node.js server that
receives GitHub webhooks, verifies them, and reacts by calling back through
both the REST and GraphQL APIs — plus a standalone OAuth 2.0 authorization
code flow.

I built this as a self-directed way to get hands-on with a few things I'd
only worked with conceptually before (webhooks, GraphQL), alongside patterns
I already use daily in API/auth support work (REST, OAuth 2.0, JSON).

## What it demonstrates

| Area | Where |
|---|---|
| Webhook receipt + HMAC signature verification | `src/webhooks/github.ts` |
| Idempotency / duplicate-delivery handling (retries) | `src/lib/dedupe.ts` |
| REST API follow-up call | `src/lib/restClient.ts` |
| GraphQL API follow-up call | `src/lib/graphqlClient.ts` |
| OAuth 2.0 authorization code flow | `src/lib/oauth.ts` |
| JSON (webhook payloads), YAML (config), CSV (event log) | `src/config/config.yaml`, `data/processed-events.csv` |
| TypeScript / Node.js | throughout |

## How it works

1. GitHub sends a webhook (e.g. "issue opened") to `POST /webhooks/github`.
2. The handler verifies the `X-Hub-Signature-256` HMAC header against a
   shared secret using a constant-time comparison, and checks the
   `X-GitHub-Delivery` id against a short-lived in-memory store so a retried
   delivery doesn't get reprocessed or double-post a comment.
3. On a new `issues.opened` event, it makes a REST call to label the issue
   and post a comment, and a GraphQL call to fetch the repo's open issue
   count — run concurrently.
4. Every processed (or deduped) event is appended to `data/processed-events.csv`.
5. Separately, `GET /auth/login` and `GET /auth/callback` implement GitHub's
   OAuth 2.0 authorization code flow, including CSRF protection via a
   `state` parameter.

Without a `GITHUB_TOKEN` set, the REST/GraphQL calls run in **dry-run
mode** — they log the exact request they'd send instead of calling the real
API. That means the whole thing runs and is fully testable with zero GitHub
credentials, which is also what makes the local simulate script below work
with no external dependencies at all.

## Running it

```bash
npm install
cp .env.example .env
npm run dev
```

Open **http://localhost:3000** for a live dashboard: a pipeline diagram and
plain-English explanation of the five steps above, and a table of recent
deliveries that updates as they come in — status (processed/duplicate),
label applied, REST/GraphQL mode, and the live open-issue count.

Click **Send webhook (new id)** / **Send webhook (repeat id)** on the page
itself to trigger a real signed delivery straight from the browser — no
second terminal needed. The buttons hit the same `/webhooks/github` endpoint
a real GitHub delivery would, so clicking "repeat id" twice is a live demo of
the dedupe logic.

Or from the command line, send a simulated webhook delivery — a byte-for-byte
realistic GitHub payload, signed with the same HMAC scheme GitHub uses:

```bash
npm run simulate            # first delivery: gets processed
npm run simulate            # same delivery id again: gets deduped
npm run simulate -- --new   # fresh delivery id: processed again
```

Watch it show up on the dashboard, in the server log, and in
`data/processed-events.csv`.

## Trying it against a real GitHub repo (optional)

1. Create a throwaway test repo.
2. Generate a fine-grained personal access token scoped to that repo
   (`issues: write` is enough) and set `GITHUB_TOKEN` in `.env` to switch the
   REST/GraphQL calls from dry-run to live.
3. Expose your local server publicly. The easiest zero-setup option is
   [smee.io](https://smee.io): open smee.io/new, then run
   `npx smee-client --url <your smee channel> --path /webhooks/github --port 3000`.
4. In the repo's Settings -> Webhooks, add a webhook pointing at your smee
   channel URL, content type `application/json`, and the same secret as
   `WEBHOOK_SECRET` in `.env`.
5. Open an issue on the repo and watch it get labeled and commented on for
   real.

For the OAuth flow, register a free GitHub OAuth App (Settings -> Developer
settings -> OAuth Apps), set `GITHUB_OAUTH_CLIENT_ID`/`GITHUB_OAUTH_CLIENT_SECRET`
in `.env`, then visit `http://localhost:3000/auth/login`.

## Project structure

```
public/index.html          Live dashboard: explanation + table + send-webhook buttons
src/
  server.ts              Express app entry point
  api.ts                  GET /api/events + POST /api/simulate for the dashboard
  webhooks/github.ts      Signature verification, dedupe, event dispatch
  lib/restClient.ts        REST follow-up call (dry-run capable)
  lib/graphqlClient.ts      GraphQL follow-up call (dry-run capable)
  lib/oauth.ts               OAuth 2.0 authorization code flow
  lib/dedupe.ts               In-memory delivery-id dedupe store
  lib/eventLog.ts              In-memory event list backing the dashboard
  lib/csvExport.ts              Appends processed events to CSV
  lib/simulate.ts                Builds + sends a signed sample delivery
  config/config.yaml            Runtime config (YAML)
  fixtures/issue-opened.json      Sample GitHub webhook payload
scripts/simulate-webhook.ts   CLI wrapper around lib/simulate.ts
```
