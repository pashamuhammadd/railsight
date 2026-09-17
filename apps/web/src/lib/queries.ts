import type { Facilitator } from "@railsight/shared";
import { pool } from "./db";

const FACILITATORS: Facilitator[] = ["payai", "coinbase_cdp", "unknown"];

// ---------------------------------------------------------------------------
// Overview (/ and /api/overview)
// ---------------------------------------------------------------------------

export interface OverviewTotals {
  totalVolume: number;
  txCount: number;
  merchantCount: number;
  flaggedCount: number;
  previousVolume: number;
  previousTxCount: number;
}

export interface DailyVolumePoint {
  day: string; // ISO date, UTC
  volume: number;
  txCount: number;
}

export interface FacilitatorShare {
  facilitator: Facilitator;
  volume: number;
  txCount: number;
  share: number; // 0..1 of the window's total volume
}

export interface TopMerchant {
  id: string;
  label: string | null;
  payeeWallet: string;
  volume: number;
}

export interface OverviewData {
  windowDays: number;
  totals: OverviewTotals;
  dailyVolume: DailyVolumePoint[];
  facilitatorBreakdown: FacilitatorShare[];
  topMerchants: TopMerchant[];
}

/**
 * Everything the Overview page needs, in one call. `windowDays` also
 * defines the "previous period" used for KPI deltas (e.g. 30 -> compares
 * the last 30 days against the 30 days before that).
 */
export async function getOverview(windowDays = 30): Promise<OverviewData> {
  const [totalsRes, dailyRes, facilitatorRes, topMerchantsRes] = await Promise.all([
    pool.query<{
      current_volume: string;
      current_tx_count: number;
      previous_volume: string;
      previous_tx_count: number;
      flagged_count: number;
      merchant_count: number;
    }>(
      `select
         coalesce(sum(amount_usdc) filter (
           where block_time >= now() - make_interval(days => $1::int)
         ), 0) as current_volume,
         count(*) filter (
           where block_time >= now() - make_interval(days => $1::int)
         )::int as current_tx_count,
         coalesce(sum(amount_usdc) filter (
           where block_time >= now() - make_interval(days => $1::int * 2)
             and block_time <  now() - make_interval(days => $1::int)
         ), 0) as previous_volume,
         count(*) filter (
           where block_time >= now() - make_interval(days => $1::int * 2)
             and block_time <  now() - make_interval(days => $1::int)
         )::int as previous_tx_count,
         count(*) filter (where is_flagged)::int as flagged_count,
         count(distinct merchant_id)::int as merchant_count
       from x402_transactions`,
      [windowDays],
    ),
    pool.query<{ day: string; volume: string; tx_count: number }>(
      `select
         date_trunc('day', block_time)::date as day,
         coalesce(sum(amount_usdc), 0) as volume,
         count(*)::int as tx_count
       from x402_transactions
       where block_time >= now() - make_interval(days => $1::int)
       group by 1
       order by 1`,
      [windowDays],
    ),
    pool.query<{ facilitator: Facilitator; volume: string; tx_count: number }>(
      `select
         facilitator,
         coalesce(sum(amount_usdc), 0) as volume,
         count(*)::int as tx_count
       from x402_transactions
       where block_time >= now() - make_interval(days => $1::int)
       group by facilitator
       order by volume desc`,
      [windowDays],
    ),
    pool.query<{ id: string; label: string | null; payee_wallet: string; volume: string }>(
      `select
         m.id,
         m.label,
         m.payee_wallet,
         coalesce(sum(t.amount_usdc) filter (
           where t.block_time >= now() - make_interval(days => $1::int)
         ), 0) as volume
       from merchants m
       left join x402_transactions t on t.merchant_id = m.id
       group by m.id, m.label, m.payee_wallet
       order by volume desc
       limit 5`,
      [windowDays],
    ),
  ]);

  const t = totalsRes.rows[0];
  const totalVolume = Number(t?.current_volume ?? 0);

  const facilitatorRows = facilitatorRes.rows;
  const facilitatorMap = new Map(
    facilitatorRows.map((r) => [r.facilitator, { volume: Number(r.volume), txCount: r.tx_count }]),
  );
  // Always return all three facilitators (even at 0) so the UI doesn't have
  // to special-case a missing bucket — matches the design's 3-way breakdown.
  const facilitatorBreakdown: FacilitatorShare[] = FACILITATORS.map((facilitator) => {
    const row = facilitatorMap.get(facilitator) ?? { volume: 0, txCount: 0 };
    return {
      facilitator,
      volume: row.volume,
      txCount: row.txCount,
      share: totalVolume > 0 ? row.volume / totalVolume : 0,
    };
  }).filter((f) => f.volume > 0 || f.txCount > 0 || facilitatorRows.length === 0);

  return {
    windowDays,
    totals: {
      totalVolume,
      txCount: t?.current_tx_count ?? 0,
      merchantCount: t?.merchant_count ?? 0,
      flaggedCount: t?.flagged_count ?? 0,
      previousVolume: Number(t?.previous_volume ?? 0),
      previousTxCount: t?.previous_tx_count ?? 0,
    },
    dailyVolume: dailyRes.rows.map((r) => ({
      day: r.day,
      volume: Number(r.volume),
      txCount: r.tx_count,
    })),
    facilitatorBreakdown,
    topMerchants: topMerchantsRes.rows
      .filter((r) => Number(r.volume) > 0)
      .map((r) => ({ id: r.id, label: r.label, payeeWallet: r.payee_wallet, volume: Number(r.volume) })),
  };
}

// ---------------------------------------------------------------------------
// Leaderboard (/leaderboard and /api/leaderboard)
// ---------------------------------------------------------------------------

export interface LeaderboardMerchant {
  rank: number;
  id: string;
  label: string | null;
  payeeWallet: string;
  facilitator: Facilitator;
  volume: number;
  txCount: number;
  flagged: boolean;
}

/**
 * All-time ranking (not windowed like the Overview KPIs) — with the small
 * amount of real transaction history so far, a 30-day leaderboard would
 * mostly just repeat the all-time one, so we keep this simple until there's
 * enough volume for the two views to actually differ.
 */
export async function getLeaderboard(): Promise<LeaderboardMerchant[]> {
  const { rows } = await pool.query<{
    id: string;
    label: string | null;
    payee_wallet: string;
    volume: string;
    tx_count: number;
    facilitator: Facilitator | null;
    flagged: boolean;
  }>(
    `select
       m.id,
       m.label,
       m.payee_wallet,
       coalesce(sum(t.amount_usdc), 0) as volume,
       count(t.id)::int as tx_count,
       mode() within group (order by t.facilitator) as facilitator,
       bool_or(coalesce(t.is_flagged, false)) as flagged
     from merchants m
     left join x402_transactions t on t.merchant_id = m.id
     group by m.id, m.label, m.payee_wallet
     order by volume desc, m.id asc`,
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    id: r.id,
    label: r.label,
    payeeWallet: r.payee_wallet,
    facilitator: r.facilitator ?? "unknown",
    volume: Number(r.volume),
    txCount: r.tx_count,
    flagged: r.flagged,
  }));
}

// ---------------------------------------------------------------------------
// Facilitator breakdown (/api/facilitators)
// ---------------------------------------------------------------------------

export interface FacilitatorStat {
  facilitator: Facilitator;
  volume: number;
  txCount: number;
  merchantCount: number;
  share: number;
}

/** All-time, unwindowed — the canonical "who's actually settling this" view. */
export async function getFacilitatorStats(): Promise<FacilitatorStat[]> {
  const { rows } = await pool.query<{
    facilitator: Facilitator;
    volume: string;
    tx_count: number;
    merchant_count: number;
  }>(
    `select
       facilitator,
       coalesce(sum(amount_usdc), 0) as volume,
       count(*)::int as tx_count,
       count(distinct merchant_id)::int as merchant_count
     from x402_transactions
     group by facilitator
     order by volume desc`,
  );

  const totalVolume = rows.reduce((sum, r) => sum + Number(r.volume), 0);

  return rows.map((r) => ({
    facilitator: r.facilitator,
    volume: Number(r.volume),
    txCount: r.tx_count,
    merchantCount: r.merchant_count,
    share: totalVolume > 0 ? Number(r.volume) / totalVolume : 0,
  }));
}
