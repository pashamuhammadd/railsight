# RailSight

Solana-native analytics and trust layer for the x402 payment protocol —
built for Colosseum's Crypto World's Fair hackathon (Solana track).

RailSight answers what raw x402 explorers don't: which merchants are
actually earning from x402 traffic on Solana, how that breaks down by
facilitator, and which volume looks non-organic.

**Live:** https://railsight.vercel.app

Full product scope, architecture/stack decisions, and the week-by-week
build order live in the project's planning docs (`PRD.md`, `TECH-SPEC.md`,
`ROADMAP.md`) rather than in this repo.

## Status

Week 1–3 of the roadmap are done: real ingestion from Solana mainnet via
Helius, a dashboard (Overview + Leaderboard + per-merchant detail) reading
live Supabase data, and two non-organic activity heuristics running
automatically on every ingestion poll. See `ROADMAP.md` for the exact
state of each item and what's still open (UI polish, leaderboard
filters/pagination, demo video).

### Screenshots

_Not committed yet — grab a couple from https://railsight.vercel.app
(Overview and Leaderboard look best once a few merchants have real
volume) and drop them in `docs/screenshots/`, then link them here before
the submission, e.g.:_

```md
![Overview](docs/screenshots/overview.png)
![Leaderboard](docs/screenshots/leaderboard.png)
```

## What it does

- **Ingests** settled x402 USDC payments on Solana mainnet for a set of
  tracked merchant wallets (via Helius's Enhanced Transactions API).
- **Dashboard** (`/`): daily volume chart, facilitator share, top
  merchants — all computed live from Postgres, no mock data.
- **Leaderboard** (`/leaderboard`): merchants ranked by all-time x402
  revenue, with a flagged/clean status per merchant.
- **Merchant detail** (`/merchant/[id]`): a 0–100 "verified-volume" score,
  plain-English explanations of any active flags, a revenue trend, and
  recent transactions.
- **Non-organic activity heuristics** (no ML, by design — see
  `TECH-SPEC.md` section 4):
  1. *Repeated identical-amount loop* — the same payer→payee pair sending
     the same amount more than N times within a trailing 1-hour window.
     Flags the transactions.
  2. *Volume without payer growth* — a merchant's volume rising sharply
     while its distinct payer count barely moves. Flags the merchant.
  Both run automatically at the end of every ingestion poll cycle
  (`packages/ingestion/src/flagging.ts`) — no separate cron job needed.
  Thresholds are tunable via env vars (see `.env.example`); the defaults
  are our own design choice, not a researched x402 fact.
- **Verified-volume API** (`GET /api/verified-volume/:merchantId`): a
  public stub trust-score endpoint — the same score shown on the merchant
  detail page, reusable by anyone. Not yet metered over x402 itself
  (that's a stretch goal, see `PRD.md`).

## Repo structure

```
railsight/
  apps/
    web/              # Next.js (App Router) + TypeScript — dashboard + API routes
  packages/
    ingestion/        # standalone worker: Helius -> Postgres, + flagging heuristics
    shared/            # shared TypeScript types (Transaction, Merchant, FlagReason, ...)
  db/
    schema.sql         # full schema — run this on a fresh database
    migrations/         # incremental changes for an existing database
    seed.sql            # a few fake rows for local dev
  .env.example
```

## Quick start (Windows / Git Bash)

```bash
git clone <your-repo-url>
cd railsight
npm install

cp .env.example apps/web/.env.local      # Next.js only reads .env files from its own app dir
cp .env.example packages/ingestion/.env  # ingestion worker reads this
# fill in HELIUS_API_KEY and DATABASE_URL in both — npm workspaces run each
# package's scripts with that package's folder as cwd, so a root .env.local
# is NOT picked up by `npm run dev`. (This bit us once — see ROADMAP.md.)

# 1. Supabase project -> Project Settings -> Database -> Connection string
#    -> use the **Supavisor transaction pooler** string, not the direct
#    connection host (the direct host is IPv6-only and fails to resolve on
#    a lot of networks — see ROADMAP.md Week 1 for the exact error we hit).
#
# 2. Apply the schema. On a brand-new database:
psql "$DATABASE_URL" -f db/schema.sql
# On a database that already has Week 1's schema (predates merchant-level
# flags), also run:
psql "$DATABASE_URL" -f db/migrations/002_add_merchant_flags.sql
psql "$DATABASE_URL" -f db/seed.sql   # optional: a few fake rows to develop against
# No psql on Windows? Open the Supabase dashboard's SQL Editor instead,
# paste the file's contents, and click Run — same effect, no install needed.

# 3. Helius free tier -> API key -> HELIUS_API_KEY

npm run dev            # Next.js dashboard, http://localhost:3000
npm run ingest:dev      # ingestion worker + flagging heuristics (separate terminal)
```

See `packages/ingestion/README.md` before running the worker against real
data — it explains why ingestion tracks known merchant wallets rather than
"the facilitator's address" (there isn't a fixed one to watch), and what's
still `[TODO: confirm]`.

## API routes

| Endpoint | Purpose |
|---|---|
| `GET /api/overview?days=30` | Daily volume + tx count, facilitator breakdown, top merchants |
| `GET /api/leaderboard` | Merchants ranked by all-time revenue |
| `GET /api/facilitators` | Volume/tx/merchant share per facilitator |
| `GET /api/merchant/:id?days=30` | One merchant's detail: revenue, active flags, trend, recent tx |
| `GET /api/verified-volume/:merchantId` | Public trust-score stub |

## Deployment

All free-tier — see `TECH-SPEC.md` section 8. Frontend/API on Vercel
(Root Directory = `apps/web`, `DATABASE_URL` + `HELIUS_API_KEY` set as
Vercel env vars), Postgres on Supabase. The ingestion worker does **not**
run on Vercel — serverless functions can't host its long-lived polling
loop — so it needs to run somewhere continuously: locally
(`npm run ingest:dev`) for now, or moved to Railway/Render/a Vercel Cron
job later.
