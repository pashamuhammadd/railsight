import { fetchAddressTransactions } from "./helius.js";
import { extractUsdcTransfersTo } from "./parse.js";
import { classifyFacilitator } from "./classify.js";
import { getTrackedMerchants, insertTransaction } from "./db.js";
import { config } from "./config.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * One polling pass: for every tracked merchant, pull their most recent
 * on-chain activity from Helius, keep only incoming USDC transfers, and
 * upsert them into x402_transactions.
 *
 * MVP simplification: always fetches the latest 100 transactions per
 * wallet rather than persisting a per-merchant pagination cursor. Inserts
 * are idempotent (`on conflict (id) do nothing`), so this is safe to run
 * on a fixed interval — it just re-checks recent history each time.
 *
 * **Rate limiting (confirmed necessary, not hypothetical):** once
 * Bazaar auto-discovery grew the tracked merchant list past ~250 wallets,
 * polling them with no delay between requests triggered 429 Too Many
 * Requests from Helius on nearly every wallet. Fixed with a
 * `config.heliusRequestDelayMs` pause between each merchant (see
 * config.ts — the exact number is our own conservative default, not a
 * confirmed Helius limit) plus retry-on-429 in helius.ts. This makes a
 * full pass over a large merchant list take longer (e.g. 250 merchants x
 * 300ms ≈ 75s) but that's fine for the local always-on worker loop (no
 * hard timeout) — see apps/web/src/lib/ingest-cron.ts for how the
 * *serverless* cron path handles this differently (a merchant-count cap +
 * randomized order, since Vercel's function has a hard 60s ceiling).
 */
export async function pollOnce(): Promise<{ merchantsChecked: number; inserted: number }> {
  const merchants = await getTrackedMerchants();
  let inserted = 0;

  for (let i = 0; i < merchants.length; i++) {
    const merchant = merchants[i];
    if (i > 0) await sleep(config.heliusRequestDelayMs);

    let txs;
    try {
      txs = await fetchAddressTransactions(merchant.payeeWallet, { limit: 100 });
    } catch (err) {
      console.error(`[poll] failed to fetch transactions for ${merchant.payeeWallet}:`, err);
      continue;
    }

    for (const tx of txs) {
      const transfers = extractUsdcTransfersTo(tx, merchant.payeeWallet);
      for (const transfer of transfers) {
        const facilitator = classifyFacilitator(transfer);
        const wasInserted = await insertTransaction({
          id: transfer.signature,
          slot: transfer.slot,
          blockTime: transfer.blockTime,
          facilitator,
          payerWallet: transfer.source,
          payeeWallet: transfer.destination,
          merchantId: merchant.id,
          amountUsdc: transfer.amountUsdc,
        });
        if (wasInserted) inserted += 1;
      }
    }
  }

  return { merchantsChecked: merchants.length, inserted };
}
