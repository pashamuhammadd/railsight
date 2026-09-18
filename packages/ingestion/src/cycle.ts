import { seedMerchantsFromConfig, upsertDiscoveredMerchant } from "./db.js";
import { pollOnce } from "./poll.js";
import { runFlaggingHeuristics } from "./flagging.js";
import { discoverSolanaMerchantsFromBazaar } from "./discovery.js";
import { config } from "./config.js";

export interface IngestionCycleResult {
  discovered: number;
  merchantsChecked: number;
  inserted: number;
  loopFlaggedTransactions: number;
  flaggedMerchants: number;
  unflaggedMerchants: number;
}

// Module-level throttle for Bazaar discovery: the long-running worker
// loop (index.ts) ticks every `config.pollIntervalMs` (default 60s), but
// re-walking the whole Bazaar listing that often is wasteful and
// unnecessary — new services don't appear that fast. Only re-checks
// every `config.bazaarDiscoveryIntervalMs` (default 1h). Irrelevant to a
// single `--once` run or a serverless cron invocation (each is a fresh
// process, so this just resets to 0 and discovery runs every time —
// which is fine at a once-a-day cron cadence).
let lastDiscoveryAt = 0;

/**
 * One full ingestion pass: discover new merchants (Bazaar), seed
 * hand-picked wallets (SEED_MERCHANT_WALLETS), poll every tracked
 * merchant for new transactions, then run the non-organic-activity
 * heuristics. No side effects beyond writing to the DB and console logs
 * inside the functions it calls — safe to call repeatedly.
 *
 * This is the single reusable "do one cycle" function TECH-SPEC.md's
 * original index.ts comment pointed at for a future Vercel Cron handler.
 * apps/web's actual cron route (`/api/cron/ingest`) does NOT import this
 * directly, though — see `apps/web/src/lib/ingest-cron.ts` for why it
 * keeps its own trimmed copy instead (short version: this module's
 * sibling, index.ts, has a CLI `main()`/`process.exit()` that must never
 * run inside a serverless function, and wiring a clean sub-export across
 * the workspace boundary for Next.js to bundle wasn't something this
 * session could verify against a live Vercel deploy). If you refactor
 * toward a single shared implementation later, this is the function to
 * point the cron route at.
 */
export async function runIngestionCycle(options: { discover?: boolean } = {}): Promise<IngestionCycleResult> {
  let discovered = 0;
  const shouldDiscover =
    options.discover ??
    (config.enableBazaarDiscovery && Date.now() - lastDiscoveryAt >= config.bazaarDiscoveryIntervalMs);

  if (shouldDiscover) {
    lastDiscoveryAt = Date.now();
    try {
      const merchants = await discoverSolanaMerchantsFromBazaar();
      for (const m of merchants) {
        await upsertDiscoveredMerchant(m.wallet, m.serviceName);
      }
      discovered = merchants.length;
    } catch (err) {
      console.error("[discovery] Bazaar lookup failed, continuing without it:", err);
    }
  }

  await seedMerchantsFromConfig();
  const result = await pollOnce();
  const flags = await runFlaggingHeuristics();

  return {
    discovered,
    merchantsChecked: result.merchantsChecked,
    inserted: result.inserted,
    loopFlaggedTransactions: flags.loopFlaggedTransactions,
    flaggedMerchants: flags.flaggedMerchants,
    unflaggedMerchants: flags.unflaggedMerchants,
  };
}
