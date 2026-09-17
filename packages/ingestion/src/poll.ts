import { fetchAddressTransactions } from "./helius.js";
import { extractUsdcTransfersTo } from "./parse.js";
import { classifyFacilitator } from "./classify.js";
import { getTrackedMerchants, insertTransaction } from "./db.js";

/**
 * One polling pass: for every tracked merchant, pull their most recent
 * on-chain activity from Helius, keep only incoming USDC transfers, and
 * upsert them into x402_transactions.
 *
 * MVP simplification: always fetches the latest 100 transactions per
 * wallet rather than persisting a per-merchant pagination cursor. Inserts
 * are idempotent (`on conflict (id) do nothing`), so this is safe to run
 * on a fixed interval — it just re-checks recent history each time.
 * Fine for a handful of merchants; revisit if the merchant list grows or
 * Helius rate limits become a problem (see PRD.md's open question about
 * Helius free-tier limits).
 */
export async function pollOnce(): Promise<{ merchantsChecked: number; inserted: number }> {
  const merchants = await getTrackedMerchants();
  let inserted = 0;

  for (const merchant of merchants) {
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
