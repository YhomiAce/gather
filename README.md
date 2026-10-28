# gather

Event pages and RSVPs for meetups: a lightweight, self-hostable alternative to Luma or Eventbrite. No accounts: hosts and guests get private links.

## Features

- **Create an event** with a title, a markdown description, start and end times in a chosen **time zone**, a venue or online link, an optional capacity, a cover colour and emoji, and public or unlisted visibility.
- **Shareable event page**, server-rendered with Open Graph, Twitter and schema.org `Event` tags. Guests RSVP with their name, email and Going / Maybe / Can't go, plus an optional question set by the host. Times are shown in the event's zone, and also in the guest's own zone when it differs.
- **Capacity and waitlist.** When an event is full, new "Going" guests join a waitlist. When someone cancels or switches to Maybe / Can't go, or the host raises the capacity, the first people on the waitlist are promoted. Seat allocation runs in a transaction that holds a row lock on the event, so concurrent RSVPs can't overbook.
- **Guest links.** Each guest gets a private `/rsvp/<token>` link to change or cancel their RSVP and see the online link. Only a SHA-256 hash of the token is stored.
- **Host dashboard.** A private `/manage/<token>` link (also stored hashed) to edit the event, see guests and the waitlist, export a CSV, copy guest emails, or open a pre-filled email (BCC).
- **Calendar:** `.ics` download for every event.
- **Discovery:** upcoming public events are listed on the home page. Unlisted events are hidden there and marked `noindex`.
- **Protection:** per-IP in-memory rate limits on RSVPs and event creation, and a honeypot field on forms.

Note: gather doesn't send email. Guests and hosts are shown their private link once and asked to bookmark it.

## Stack

Nuxt 4 (SSR, Nitro server routes, `<script setup>` + TypeScript), Drizzle ORM with the `postgres` driver, zod, marked, Vitest.

## Local development

Requirements: Node 22+, npm, and a Postgres database.

```bash
cp .env.example .env          # adjust NUXT_DATABASE_URL if needed
npm install
npm run dev                   # http://localhost:5109
```

Migrations run automatically when the server starts. On first start with an empty database, 4 sample public events with RSVPs are created. Their manage links are printed in the server log.

Other scripts:

| Script | What it does |
| --- | --- |
| `npm test` | Vitest unit tests (waitlist logic, tokens, ICS, time zones). No database needed. |
| `npm run typecheck` | `nuxt typecheck` (vue-tsc) |
| `npm run build` | Production build into `.output/` (no database needed) |
| `npm start` | Runs the production server from `.output/` |
| `npm run preview` | Nuxt preview of the production build |
| `npm run db:generate` | Generate a new SQL migration after editing `server/database/schema.ts` |

## Environment variables

All variables are read at **runtime** through Nuxt `runtimeConfig`. None are needed at build time.

| Name | Required? | Example | Build or runtime | Notes |
| --- | --- | --- | --- | --- |
| `NUXT_DATABASE_URL` | yes (or `DATABASE_URL`) | `postgresql://user:pass@host:5432/gather` | runtime | Postgres connection string. |
| `DATABASE_URL` | alternative | `postgresql://user:pass@host:5432/gather` | runtime | Used only if `NUXT_DATABASE_URL` is not set. |
| `NUXT_PUBLIC_SITE_URL` | recommended | `https://events.example.com` | runtime | Absolute base for share links, `.ics` and Open Graph URLs. If unset, the request origin (with `X-Forwarded-Host`/`-Proto`) is used. |
| `NUXT_RSVP_RATE_LIMIT` | no | `10` | runtime | RSVPs allowed per IP per 10 minutes. |
| `PORT` / `NITRO_PORT` | no | `3000` | runtime | Port for `npm start`. Defaults to `3000`. |
| `HOST` / `NITRO_HOST` | no | `0.0.0.0` | runtime | Bind address. Defaults to all interfaces. |

## Deploying

- **Install:** `npm ci`
- **Build:** `npm run build` (runs `nuxt build` and produces `.output/`; no database or env vars needed)
- **Start:** `npm start` (runs `node .output/server/index.mjs`)
- **Port:** `PORT` (default `3000`), listening on `0.0.0.0` / `::`
- **Build-time env vars:** none
- **Runtime env vars:** `NUXT_DATABASE_URL` (or `DATABASE_URL`), plus `NUXT_PUBLIC_SITE_URL` (recommended)
- **Health check:** `GET /api/health` returns `200 {"status":"ok","db":"up"}`, or `503` if Postgres is unreachable.

`.output/` is self-contained: Nitro copies the server dependencies it needs into `.output/server/node_modules`, and the SQL migrations are bundled as server assets. You can ship only `.output/` and delete the project's `node_modules`.

On start, a Nitro plugin applies pending migrations (inside a Postgres advisory lock, so several replicas are safe) and seeds sample data if the `events` table is empty. Both steps are idempotent; there is no separate release step. The migration bookkeeping uses Drizzle's standard `drizzle.__drizzle_migrations` table, so `drizzle-kit migrate` agrees with it.

The rate limiter keeps its counters in memory per process, and keys on the last `X-Forwarded-For` hop (the address your reverse proxy saw).
