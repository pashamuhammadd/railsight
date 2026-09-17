# RailSight

Solana-native analytics and trust layer for the x402 payment protocol —
built for Colosseum's Crypto World's Fair hackathon (Solana track).

RailSight answers what raw x402 explorers don't: which merchants are
actually earning from x402 traffic on Solana, how that breaks down by
facilitator, and which volume looks non-organic.

Full product scope, architecture/stack decisions, and the week-by-week
build order live in the project's planning docs (PRD, TECH-SPEC, ROADMAP)
rather than in this repo.

## Status

Week 1 scaffold — data pipeline + schema. No dashboard yet.

## Repo structure

```
railsight/
  apps/
    web/              # Next.js (App Router) + TypeScript — dashboard + API routes
  packages/
    ingestion/        # standalone worker: Helius -> Postgres
    shared/            # shared TypeScript types (Transaction, Merchant, ...)
  db/
    schema.sql
    seed.sql           # a few fake rows for local dev
  .env.example
```

## Quick start (Windows / Git Bash)

```bash
git clone <your-repo-url>
cd railsight
npm install

cp .env.example .env.local              # apps/web reads this
cp .env.example packages/ingestion/.env  # ingestion worker reads this
# fill in HELIUS_API_KEY and DATABASE_URL in both

# 1. Supabase project -> copy Postgres connection string into DATABASE_URL
# 2. Apply the schema:
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql   # optional: a few fake rows to develop against

# 3. Helius free tier -> API key -> HELIUS_API_KEY

npm run dev            # Next.js dashboard, http://localhost:3000
npm run ingest:dev      # ingestion worker (separate terminal)
```

See `packages/ingestion/README.md` before running the worker against real
data — it explains why ingestion tracks known merchant wallets rather than
"the facilitator's address" (there isn't a fixed one to watch), and what's
still `[TODO: confirm]`.

## Deployment

All free-tier — see TECH-SPEC.md section 8. Frontend/API on Vercel,
Postgres on Supabase, ingestion worker on Railway/Render if it needs to run
continuously outside of Vercel's serverless functions.
