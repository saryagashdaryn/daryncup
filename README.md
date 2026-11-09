# Daryn Cup

Полноценный сайт футбольного турнира: матчи, таблица, составы, плей-офф, аукцион и посты.

## Cloudflare Workers

- Worker name: `daryncup`
- Branch: `main`
- Build command: `pnpm run build`
- Deploy command: `pnpm run deploy`
- Node version: 24 (build variable `NODE_VERSION=24`)
- Protect with Cloudflare Access: off (spectators can visit without an account).
- Disable preview builds until production is configured; previews must not share production D1.

D1 is configured in `wrangler.json` with binding `DB`. Deployment applies idempotent SQL migrations. The initial dataset is the workbook snapshot of **4 November 2026**. Later changes from the ChatGPT-hosted site must be imported from its JSON backup; they are not automatically transferred.

## Organizer access

In the deployed Worker's Settings → Variables and Secrets, add **Secret** `ADMIN_PASSWORD`: a unique password of 16–256 characters. Do not put it in GitHub, build logs, or chat. Redeploy after setting the secret. Open `/login` to manage the tournament. Changing the secret invalidates previous sessions.

Spectators do not need a password. Mutations require a signed HttpOnly secure cookie, same-origin requests, and the organizer's password. Login attempts are limited in D1.

## Move current results

1. On the original site, sign in as organizer and download `Деректер көшірмесі ↓`.
2. On the new site, log in, select `Көшірмені қалпына келтіру`, and upload the JSON backup.
3. Review and click Save. Download the new site's backup before replacing any existing data.

The repository contains source code; GitHub Pages cannot execute the backend.
