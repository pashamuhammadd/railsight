import { pool } from "./db.js";
import { config } from "./config.js";

/**
 * Non-organic activity heuristics — TECH-SPEC.md section 4. Simple,
 * explainable SQL rules, no ML, exactly as scoped for the hackathon MVP.
 * Both heuristics are safe to re-run on every poll cycle: heuristic 1 only
 * ever adds flags (a loop that happened, happened), heuristic 2 recomputes
 * from scratch each time so a merchant can also get *un*-flagged once its
 * volume/payer ratio normalizes.
 */

export interface FlaggingResult {
  loopFlaggedTransactions: number;
  flaggedMerchants: number;
  unflaggedMerchants: number;
}

/**
 * Heuristic 1: same payer -> payee pair, same amount_usdc, more than
 * `identicalAmountLoopThreshold` times within a trailing 1-hour window.
 * Flags the individual transactions (TECH-SPEC.md: "flag both transactions
 * and the merchant" — the merchant side of this is covered by whichever
 * merchant those transactions belong to already showing as having flagged
 * transactions on the leaderboard; we don't also set merchants.is_flagged
 * here, to keep "why is this merchant flagged" unambiguous — see
 * flagVolumeWithoutPayerGrowth for the merchant-level flag).
 */
async function flagIdenticalAmountLoops(): Promise<number> {
  const { rowCount } = await pool.query(
    `with windowed as (
       select
         id,
         count(*) over (
           partition by payer_wallet, payee_wallet, amount_usdc
           order by block_time
           range between interval '1 hour' preceding and current row
         ) as loop_count
       from x402_transactions
     )
     update x402_transactions t
     set is_flagged = true,
         flag_reason = 'repeated_identical_amount_loop'
     from windowed w
     where t.id = w.id
       and w.loop_count > $1`,
    [config.heuristics.identicalAmountLoopThreshold],
  );
  return rowCount ?? 0;
}

/**
 * Heuristic 2: a merchant's volume over the trailing `volumeWindowDays`
 * rose sharply (>= volumeGrowthMultiplier x the prior window) while its
 * distinct payer count barely moved (grew by at most payerGrowthAllowance
 * wallets). Flags the merchant (merchants.is_flagged/flag_reason — see
 * db/migrations/002_add_merchant_flags.sql), not individual transactions,
 * per TECH-SPEC.md. Recomputed fully on every run: merchants that no
 * longer qualify get unflagged too.
 */
async function flagVolumeWithoutPayerGrowth(): Promise<{ flagged: number; unflagged: number }> {
  const { heuristics } = config;

  const periodsCte = `
    with periods as (
      select
        merchant_id,
        coalesce(sum(amount_usdc) filter (
          where block_time >= now() - make_interval(days => $1::int)
        ), 0) as current_volume,
        count(*) filter (
          where block_time >= now() - make_interval(days => $1::int)
        )::int as current_tx_count,
        count(distinct payer_wallet) filter (
          where block_time >= now() - make_interval(days => $1::int)
        )::int as current_payers,
        coalesce(sum(amount_usdc) filter (
          where block_time >= now() - make_interval(days => $1::int * 2)
            and block_time <  now() - make_interval(days => $1::int)
        ), 0) as previous_volume,
        count(distinct payer_wallet) filter (
          where block_time >= now() - make_interval(days => $1::int * 2)
            and block_time <  now() - make_interval(days => $1::int)
        )::int as previous_payers
      from x402_transactions
      where merchant_id is not null
      group by merchant_id
    ),
    qualifying as (
      select merchant_id
      from periods
      where current_tx_count >= $2
        and previous_volume > 0
        and current_volume >= previous_volume * $3
        and current_payers <= previous_payers + $4
    )
  `;

  const [unflagged, flagged] = await Promise.all([
    pool.query(
      `${periodsCte}
       update merchants m
       set is_flagged = false, flag_reason = null
       where m.flag_reason = 'volume_without_payer_growth'
         and m.id not in (select merchant_id from qualifying)`,
      [heuristics.volumeWindowDays, heuristics.minCurrentPeriodTxCount, heuristics.volumeGrowthMultiplier, heuristics.payerGrowthAllowance],
    ),
    pool.query(
      `${periodsCte}
       update merchants m
       set is_flagged = true, flag_reason = 'volume_without_payer_growth'
       from qualifying q
       where m.id = q.merchant_id
         and (m.is_flagged is not true or m.flag_reason is distinct from 'volume_without_payer_growth')`,
      [heuristics.volumeWindowDays, heuristics.minCurrentPeriodTxCount, heuristics.volumeGrowthMultiplier, heuristics.payerGrowthAllowance],
    ),
  ]);

  return { flagged: flagged.rowCount ?? 0, unflagged: unflagged.rowCount ?? 0 };
}

export async function runFlaggingHeuristics(): Promise<FlaggingResult> {
  const loopFlaggedTransactions = await flagIdenticalAmountLoops();
  const { flagged, unflagged } = await flagVolumeWithoutPayerGrowth();
  return {
    loopFlaggedTransactions,
    flaggedMerchants: flagged,
    unflaggedMerchants: unflagged,
  };
}
