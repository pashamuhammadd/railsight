import { config } from "./config.js";
import { seedMerchantsFromConfig } from "./db.js";
import { pollOnce } from "./poll.js";
import { runFlaggingHeuristics } from "./flagging.js";

async function pollAndFlag() {
  const result = await pollOnce();
  const flags = await runFlaggingHeuristics();
  return { result, flags };
}

function logCycle(result: Awaited<ReturnType<typeof pollOnce>>, flags: Awaited<ReturnType<typeof runFlaggingHeuristics>>) {
  console.log(
    `[ingestion] checked ${result.merchantsChecked} merchant(s), inserted ${result.inserted} new transaction(s)`,
  );
  if (flags.loopFlaggedTransactions > 0 || flags.flaggedMerchants > 0 || flags.unflaggedMerchants > 0) {
    console.log(
      `[flagging] identical-amount-loop tx flagged: ${flags.loopFlaggedTransactions}, ` +
        `merchants newly flagged (volume-without-payer-growth): ${flags.flaggedMerchants}, ` +
        `merchants un-flagged: ${flags.unflaggedMerchants}`,
    );
  }
}

async function main() {
  const runOnce = process.argv.includes("--once");

  await seedMerchantsFromConfig();

  if (runOnce) {
    const { result, flags } = await pollAndFlag();
    logCycle(result, flags);
    process.exit(0);
  }

  console.log(
    `[ingestion] starting poll loop every ${config.pollIntervalMs}ms — Ctrl+C to stop`,
  );

  // Simple setInterval loop for the MVP. If this needs to run on a
  // schedule instead of always-on (e.g. Vercel cron), pollAndFlag() is the
  // function to call from that handler — see TECH-SPEC.md section 2/8.
  const tick = async () => {
    try {
      const { result, flags } = await pollAndFlag();
      if (result.inserted > 0 || flags.flaggedMerchants > 0 || flags.unflaggedMerchants > 0) {
        logCycle(result, flags);
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
