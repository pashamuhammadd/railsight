-- RailSight — migration 002: merchant-level flags.
--
-- Week 3 adds a non-organic-activity heuristic (TECH-SPEC.md section 4,
-- heuristic 2: "volume without payer growth") that flags a *merchant*, not
-- individual transactions. The original schema.sql only had is_flagged /
-- flag_reason on x402_transactions, so this adds the same two columns to
-- merchants.
--
-- Run this once against your existing Supabase database (SQL Editor, or
-- `psql "$DATABASE_URL" -f db/migrations/002_add_merchant_flags.sql`).
-- Safe to re-run — every statement is idempotent.

alter table merchants add column if not exists is_flagged boolean default false;
alter table merchants add column if not exists flag_reason text;

create index if not exists idx_merchants_is_flagged
  on merchants (is_flagged)
  where is_flagged = true;
