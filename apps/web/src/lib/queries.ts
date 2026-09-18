import type { Facilitator, FlagReason } from "@railsight/shared";
import { pool } from "./db";
import { formatUsdcFull, formatWallet } from "./format";

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
  /** The reason to surface in the UI when flagged — merchant-level flag wins over a merely-having-flagged-transactions state. */
  flagReason: FlagReason | null;
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
    merchant_flagged: boolean;
    merchant_flag_reason: FlagReason | null;
    any_tx_flagged: boolean;
  }>(
    `select
       m.id,
       m.label,
       m.payee_wallet,
       coalesce(sum(t.amount_usdc), 0) as volume,
       count(t.id)::int as tx_count,
       mode() within group (order by t.facilitator) as facilitator,
       coalesce(m.is_flagged, false) as merchant_flagged,
       m.flag_reason as merchant_flag_reason,
       bool_or(coalesce(t.is_flagged, false)) as any_tx_flagged
     from merchants m
     left join x402_transactions t on t.merchant_id = m.id
     group by m.id, m.label, m.payee_wallet, m.is_flagged, m.flag_reason
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
    // Merchant-level flag (heuristic 2) OR any of its transactions flagged
    // (heuristic 1) — either one means "this merchant needs a look".
    flagged: r.merchant_flagged || r.any_tx_flagged,
    flagReason: r.merchant_flagged ? r.merchant_flag_reason : r.any_tx_flagged ? "repeated_identical_amount_loop" : null,
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

// ---------------------------------------------------------------------------
// Merchant detail (/merchant/[id] and /api/merchant/[id])
// ---------------------------------------------------------------------------

export interface MerchantSummary {
  id: string;
  label: string | null;
  payeeWallet: string;
  rank: number;
  facilitator: Facilitator;
  allTimeVolume: number;
  allTimeTxCount: number;
  /** Merchant-level flag from heuristic 2 (volume without payer growth). */
  isFlagged: boolean;
  flagReason: FlagReason | null;
}

export interface MerchantFlagDetail {
  reason: FlagReason;
  headline: string;
  detail: string;
  /** ISO timestamp of the most recent occurrence, when there is one. */
  occurredAt: string | null;
}

export interface MerchantTransaction {
  id: string; // tx signature
  blockTime: string;
  payerWallet: string;
  amountUsdc: number;
  facilitator: Facilitator;
  isFlagged: boolean;
  flagReason: FlagReason | null;
}

export interface MerchantDetail {
  merchant: MerchantSummary;
  windowDays: number;
  currentVolume: number;
  currentTxCount: number;
  currentPayers: number;
  previousPayers: number;
  /** 0–100. See scoreExplanation for how it was derived — a simple, explainable formula, not ML. */
  verifiedScore: number;
  scoreExplanation: string;
  flags: MerchantFlagDetail[];
  dailyVolume: DailyVolumePoint[];
  recentTransactions: MerchantTransaction[];
}

/** Looks up one merchant's rank/volume/dominant facilitator/merchant-level flag. Null if the id doesn't exist. */
async function getMerchantSummary(id: string): Promise<MerchantSummary | null> {
  const { rows } = await pool.query<{
    id: string;
    label: string | null;
    payee_wallet: string;
    is_flagged: boolean;
    flag_reason: FlagReason | null;
    volume: string;
    tx_count: number;
    facilitator: Facilitator | null;
    rank: string;
  }>(
    `with ranked as (
       select
         m.id,
         m.label,
         m.payee_wallet,
         m.is_flagged,
         m.flag_reason,
         coalesce(sum(t.amount_usdc), 0) as volume,
         count(t.id)::int as tx_count,
         mode() within group (order by t.facilitator) as facilitator,
         row_number() over (order by coalesce(sum(t.amount_usdc), 0) desc, m.id asc) as rank
       from merchants m
       left join x402_transactions t on t.merchant_id = m.id
       group by m.id, m.label, m.payee_wallet, m.is_flagged, m.flag_reason
     )
     select * from ranked where id = $1`,
    [id],
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    label: row.label,
    payeeWallet: row.payee_wallet,
    rank: Number(row.rank),
    facilitator: row.facilitator ?? "unknown",
    allTimeVolume: Number(row.volume),
    allTimeTxCount: row.tx_count,
    isFlagged: row.is_flagged,
    flagReason: row.flag_reason,
  };
}

export async function getMerchantDetail(id: string, windowDays = 30): Promise<MerchantDetail | null> {
  const merchant = await getMerchantSummary(id);
  if (!merchant) return null;

  const [windowRes, dailyRes, flaggedTxRes, loopGroupsRes, recentRes] = await Promise.all([
    pool.query<{
      current_volume: string;
      current_tx_count: number;
      current_payers: number;
      previous_volume: string;
      previous_payers: number;
    }>(
      `select
         coalesce(sum(amount_usdc) filter (
           where block_time >= now() - make_interval(days => $2::int)
         ), 0) as current_volume,
         count(*) filter (
           where block_time >= now() - make_interval(days => $2::int)
         )::int as current_tx_count,
         count(distinct payer_wallet) filter (
           where block_time >= now() - make_interval(days => $2::int)
         )::int as current_payers,
         coalesce(sum(amount_usdc) filter (
           where block_time >= now() - make_interval(days => $2::int * 2)
             and block_time <  now() - make_interval(days => $2::int)
         ), 0) as previous_volume,
         count(distinct payer_wallet) filter (
           where block_time >= now() - make_interval(days => $2::int * 2)
             and block_time <  now() - make_interval(days => $2::int)
         )::int as previous_payers
       from x402_transactions
       where merchant_id = $1`,
      [id, windowDays],
    ),
    pool.query<{ day: string; volume: string; tx_count: number }>(
      `select
         date_trunc('day', block_time)::date as day,
         coalesce(sum(amount_usdc), 0) as volume,
         count(*)::int as tx_count
       from x402_transactions
       where merchant_id = $1
         and block_time >= now() - make_interval(days => $2::int)
       group by 1
       order by 1`,
      [id, windowDays],
    ),
    pool.query<{ flagged_tx_count: number; tx_count: number }>(
      `select
         count(*) filter (where is_flagged)::int as flagged_tx_count,
         count(*)::int as tx_count
       from x402_transactions
       where merchant_id = $1`,
      [id],
    ),
    pool.query<{ payer_wallet: string; amount_usdc: string; occurrences: number; first_at: string; last_at: string }>(
      `select
         payer_wallet,
         amount_usdc,
         count(*)::int as occurrences,
         min(block_time) as first_at,
         max(block_time) as last_at
       from x402_transactions
       where merchant_id = $1 and flag_reason = 'repeated_identical_amount_loop'
       group by payer_wallet, amount_usdc
       order by last_at desc`,
      [id],
    ),
    pool.query<{
      id: string;
      block_time: string;
      payer_wallet: string;
      amount_usdc: string;
      facilitator: Facilitator;
      is_flagged: boolean;
      flag_reason: FlagReason | null;
    }>(
      `select id, block_time, payer_wallet, amount_usdc, facilitator, is_flagged, flag_reason
       from x402_transactions
       where merchant_id = $1
       order by block_time desc
       limit 20`,
      [id],
    ),
  ]);

  const w = windowRes.rows[0];
  const currentVolume = Number(w?.current_volume ?? 0);
  const previousVolume = Number(w?.previous_volume ?? 0);
  const currentPayers = w?.current_payers ?? 0;
  const previousPayers = w?.previous_payers ?? 0;

  const flags: MerchantFlagDetail[] = [];

  if (merchant.isFlagged && merchant.flagReason === "volume_without_payer_growth") {
    const multiplier = previousVolume > 0 ? currentVolume / previousVolume : null;
    flags.push({
      reason: "volume_without_payer_growth",
      headline: "Volume rising without payer growth",
      detail:
        multiplier !== null
          ? `Volume over the last ${windowDays}d (${formatUsdcFull(currentVolume)}) is ${multiplier.toFixed(1)}x the prior ${windowDays}d (${formatUsdcFull(previousVolume)}), while unique payer wallets barely moved (${previousPayers} → ${currentPayers}). Flagged automatically — sharp volume growth with roughly flat payer count.`
          : `Volume over the last ${windowDays}d (${formatUsdcFull(currentVolume)}) rose with roughly flat payer wallets (${previousPayers} → ${currentPayers}).`,
      occurredAt: null,
    });
  }

  for (const group of loopGroupsRes.rows) {
    const spanMs = new Date(group.last_at).getTime() - new Date(group.first_at).getTime();
    const spanMinutes = Math.max(1, Math.round(spanMs / 60_000));
    flags.push({
      reason: "repeated_identical_amount_loop",
      headline: "Repeated identical-amount loop",
      detail: `${group.occurrences} payments of exactly ${formatUsdcFull(Number(group.amount_usdc))} from wallet ${formatWallet(group.payer_wallet)} within a ${spanMinutes}-minute window. Flagged automatically — same payer→payee pair, same amount, above the configured repeated-payment threshold.`,
      occurredAt: group.last_at,
    });
  }

  const flagStats = flaggedTxRes.rows[0];
  const flaggedTxCount = flagStats?.flagged_tx_count ?? 0;
  const totalTxCount = flagStats?.tx_count ?? 0;
  const flaggedShare = totalTxCount > 0 ? flaggedTxCount / totalTxCount : 0;

  const scoreNotes: string[] = [];
  let verifiedScore = 100;
  if (merchant.isFlagged) {
    verifiedScore -= 40;
    scoreNotes.push("an active volume-without-payer-growth flag");
  }
  if (flaggedShare > 0) {
    const penalty = Math.round(flaggedShare * 60);
    verifiedScore -= penalty;
    scoreNotes.push(`${Math.round(flaggedShare * 100)}% of transactions flagged as repeated identical-amount loops`);
  }
  verifiedScore = Math.max(0, Math.min(100, verifiedScore));

  const scoreExplanation =
    scoreNotes.length > 0
      ? `Lowered by: ${scoreNotes.join("; ")}.`
      : "No active flags on this merchant — full score.";

  return {
    merchant,
    windowDays,
    currentVolume,
    currentTxCount: w?.current_tx_count ?? 0,
    currentPayers,
    previousPayers,
    verifiedScore,
    scoreExplanation,
    flags,
    dailyVolume: dailyRes.rows.map((r) => ({ day: r.day, volume: Number(r.volume), txCount: r.tx_count })),
    recentTransactions: recentRes.rows.map((r) => ({
      id: r.id,
      blockTime: r.block_time,
      payerWallet: r.payer_wallet,
      amountUsdc: Number(r.amount_usdc),
      facilitator: r.facilitator,
      isFlagged: r.is_flagged,
      flagReason: r.flag_reason,
    })),
  };
}

// ---------------------------------------------------------------------------
// Verified-volume stub API (/api/verified-volume/[merchantId])
// ---------------------------------------------------------------------------

export interface VerifiedVolumeResult {
  merchantId: string;
  label: string | null;
  verifiedScore: number;
  scoreExplanation: string;
  allTimeVolumeUsdc: number;
  allTimeTxCount: number;
  activeFlagCount: number;
  generatedAt: string;
}

/**
 * Public trust-score stub (PRD.md P1 item 6 / TECH-SPEC.md section 5).
 * Reuses the same score as the merchant detail page so the number a
 * merchant sees on their own dashboard matches what this API reports.
 * Not yet metered over x402 itself — that's the PRD's "bonus" stretch
 * goal, not done here.
 */
export async function getVerifiedVolume(merchantId: string): Promise<VerifiedVolumeResult | null> {
  const detail = await getMerchantDetail(merchantId, 30);
  if (!detail) return null;

  return {
    merchantId: detail.merchant.id,
    label: detail.merchant.label,
    verifiedScore: detail.verifiedScore,
    scoreExplanation: detail.scoreExplanation,
    allTimeVolumeUsdc: detail.merchant.allTimeVolume,
    allTimeTxCount: detail.merchant.allTimeTxCount,
    activeFlagCount: detail.flags.length,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Payer leaderboard — demand side (/leaderboard?view=payers and /api/payers)
// ---------------------------------------------------------------------------

export interface PayerLeaderboardEntry {
  rank: number;
  payerWallet: string;
  volume: number;
  txCount: number;
  merchantCount: number;
  firstSeen: string;
  lastSeen: string;
}

/**
 * All-time ranking of *payer* wallets by total USDC spent across every
 * tracked merchant — the demand side of the leaderboard (who's actually
 * paying), complementing getLeaderboard()'s supply side (who's getting
 * paid). Capped at 50 rows; with a hackathon's worth of data this is
 * effectively "all of them", but caps it so this can't grow unbounded.
 */
export async function getPayerLeaderboard(): Promise<PayerLeaderboardEntry[]> {
  const { rows } = await pool.query<{
    payer_wallet: string;
    volume: string;
    tx_count: number;
    merchant_count: number;
    first_seen: string;
    last_seen: string;
  }>(
    `select
       payer_wallet,
       coalesce(sum(amount_usdc), 0) as volume,
       count(*)::int as tx_count,
       count(distinct merchant_id)::int as merchant_count,
       min(block_time) as first_seen,
       max(block_time) as last_seen
     from x402_transactions
     where payer_wallet is not null
     group by payer_wallet
     order by volume desc, payer_wallet asc
     limit 50`,
  );

  return rows.map((r, i) => ({
    rank: i + 1,
    payerWallet: r.payer_wallet,
    volume: Number(r.volume),
    txCount: r.tx_count,
    merchantCount: r.merchant_count,
    firstSeen: r.first_seen,
    lastSeen: r.last_seen,
  }));
}

// ---------------------------------------------------------------------------
// Volume spike alert (/ overview banner)
// ---------------------------------------------------------------------------

export interface VolumeSpike {
  isSpiking: boolean;
  windowHours: number;
  currentVolume: number;
  currentTxCount: number;
  /** Baseline daily average volume, scaled to windowHours for an apples-to-apples comparison. Null if there isn't enough trailing history yet. */
  baselineDailyAvgVolume: number | null;
  /** currentVolume / (baseline scaled to windowHours). Null if there's no usable baseline. */
  multiplier: number | null;
}

/**
 * Real-time-ish spike detector: compares settled volume in the trailing
 * `windowHours` against a 14-day trailing baseline (excluding the current
 * window itself), scaled to the same window length. Flags a spike when
 * there's at least 3 days of baseline history, at least 5 transactions in
 * the current window (so a single big payment from an otherwise-quiet
 * merchant doesn't read as "the whole network is spiking"), and volume is
 * >= 2x what the baseline would predict for a window this long. These
 * thresholds are our own tunable design choice (like the non-organic-
 * activity heuristics in TECH-SPEC.md section 4), not a researched x402/
 * Solana fact.
 */
export async function getVolumeSpike(windowHours = 24): Promise<VolumeSpike> {
  const { rows } = await pool.query<{
    current_volume: string;
    current_tx_count: number;
    baseline_volume: string;
    baseline_day_count: number;
  }>(
    `with current_window as (
       select
         coalesce(sum(amount_usdc), 0) as volume,
         count(*)::int as tx_count
       from x402_transactions
       where block_time >= now() - make_interval(hours => $1::int)
     ),
     baseline as (
       select
         coalesce(sum(amount_usdc), 0) as volume,
         count(distinct date_trunc('day', block_time))::int as day_count
       from x402_transactions
       where block_time >= now() - make_interval(hours => $1::int) - interval '14 days'
         and block_time <  now() - make_interval(hours => $1::int)
     )
     select
       cw.volume as current_volume,
       cw.tx_count as current_tx_count,
       b.volume as baseline_volume,
       b.day_count as baseline_day_count
     from current_window cw, baseline b`,
    [windowHours],
  );

  const r = rows[0];
  const currentVolume = Number(r?.current_volume ?? 0);
  const currentTxCount = r?.current_tx_count ?? 0;
  const baselineDayCount = r?.baseline_day_count ?? 0;
  const hasBaseline = baselineDayCount >= 3;

  const baselineDailyAvgVolume = hasBaseline ? Number(r!.baseline_volume) / baselineDayCount : null;
  const expectedForWindow = baselineDailyAvgVolume !== null ? baselineDailyAvgVolume * (windowHours / 24) : null;
  const multiplier = expectedForWindow !== null && expectedForWindow > 0 ? currentVolume / expectedForWindow : null;

  const isSpiking = hasBaseline && currentTxCount >= 5 && multiplier !== null && multiplier >= 2;

  return {
    isSpiking,
    windowHours,
    currentVolume,
    currentTxCount,
    baselineDailyAvgVolume,
    multiplier,
  };
}
