import { config } from "./config.js";
import { seedMerchantsFromConfig } from "./db.js";
import { pollOnce } from "./poll.js";

async function main() {
  const runOnce = process.argv.includes("--once");

  await seedMerchantsFromConfig();

  if (runOnce) {
    const result = await pollOnce();
    console.log(
      `[ingestion] single run done — checked ${result.merchantsChecked} merchant(s), inserted ${result.inserted} new transaction(s)`,
    );
    process.exit(0);
  }

  console.log(
    `[ingestion] starting poll loop every ${config.pollIntervalMs}ms — Ctrl+C to stop`,
  );

  // Simple setInterval loop for the MVP. If this needs to run on a
  // schedule instead of always-on (e.g. Vercel cron), pollOnce() is the
  // function to call from that handler — see TECH-SPEC.md section 2/8.
  const tick = async () => {
    try {
      const result = await pollOnce();
      if (result.inserted > 0) {
        console.log(
          `[ingestion] checked ${result.merchantsChecked} merchant(s), inserted ${result.inserted} new transaction(s)`,
        );
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
