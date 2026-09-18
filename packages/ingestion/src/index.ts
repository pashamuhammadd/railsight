import { config } from "./config.js";
import { runIngestionCycle, type IngestionCycleResult } from "./cycle.js";

function logCycle(result: IngestionCycleResult) {
  if (result.discovered > 0) {
    console.log(`[discovery] found ${result.discovered} Solana merchant(s) via the Bazaar directory`);
  }
  console.log(
    `[ingestion] checked ${result.merchantsChecked} merchant(s), inserted ${result.inserted} new transaction(s)`,
  );
  if (result.loopFlaggedTransactions > 0 || result.flaggedMerchants > 0 || result.unflaggedMerchants > 0) {
    console.log(
      `[flagging] identical-amount-loop tx flagged: ${result.loopFlaggedTransactions}, ` +
        `merchants newly flagged (volume-without-payer-growth): ${result.flaggedMerchants}, ` +
        `merchants un-flagged: ${result.unflaggedMerchants}`,
    );
  }
}

async function main() {
  const runOnce = process.argv.includes("--once");
  const discoverOnly = process.argv.includes("--discover-only");

  if (discoverOnly) {
    // Forces a Bazaar lookup regardless of the throttle, useful for
    // checking the discovery integration works without waiting for a
    // full poll cycle. Still runs the normal poll/flagging too (cheap,
    // and keeps this a strict superset of `--once` rather than a special
    // path that could drift out of sync with it).
    const result = await runIngestionCycle({ discover: true });
    logCycle(result);
    process.exit(0);
  }

  if (runOnce) {
    const result = await runIngestionCycle();
    logCycle(result);
    process.exit(0);
  }

  console.log(
    `[ingestion] starting poll loop every ${config.pollIntervalMs}ms — Ctrl+C to stop`,
  );

  // Simple setInterval loop for the MVP. If this needs to run on a
  // schedule instead of always-on, runIngestionCycle() (cycle.ts) is the
  // function to call from that handler — see TECH-SPEC.md section 2/8 and
  // apps/web/src/lib/ingest-cron.ts for why the actual Vercel Cron route
  // keeps its own copy instead of importing this package directly.
  const tick = async () => {
    try {
      const result = await runIngestionCycle();
      if (result.discovered > 0 || result.inserted > 0 || result.flaggedMerchants > 0 || result.unflaggedMerchants > 0) {
        logCycle(result);
      }
    } catch (err) {
      console.error("[ingestion] poll cycle failed:", err);
    }
  };

  await tick();
  setInterval(tick, config.pollIntervalMs);
}

main().catch((err) => {
  console.error("[ingestion] fatal error:", err);
  process.exit(1);
});
