-- RailSight — MVP schema. See TECH-SPEC.md section 3 for design notes.
-- Deliberately flat / under-normalized for hackathon speed.

create table if not exists merchants (
  id            text primary key,        -- derived from payee wallet or declared identity
  label         text,                    -- human-readable name if known
  payee_wallet  text not null
);

-- one row per settled x402 payment
create table if not exists x402_transactions (
  id            text primary key,        -- tx signature
  slot          bigint not null,
  block_time    timestamptz not null,
  facilitator   text not null,           -- 'payai' | 'coinbase_cdp' | 'unknown'
  payer_wallet  text not null,
  payee_wallet  text not null,
  merchant_id   text references merchants(id),
  amount_usdc   numeric not null,
  is_flagged    boolean default false,
  flag_reason   text
);

-- optional: precomputed daily rollups for fast dashboard queries
create table if not exists daily_volume (
  day           date not null,
  facilitator   text not null,
  volume_usdc   numeric not null,
  tx_count      integer not null,
  primary key (day, facilitator)
);

-- Indexes to support the MVP API endpoints (TECH-SPEC.md section 5):
-- overview (by day), leaderboard (by merchant), facilitator breakdown.
create index if not exists idx_x402_transactions_block_time
  on x402_transactions (block_time);

create index if not exists idx_x402_transactions_merchant_id
  on x402_transactions (merchant_id);

create index if not exists idx_x402_transactions_facilitator
  on x402_transactions (facilitator);

create index if not exists idx_x402_transactions_payer_payee_amount
  on x402_transactions (payer_wallet, payee_wallet, amount_usdc);
