import type { Facilitator, ParsedUsdcTransfer } from "@railsight/shared";
import { config } from "./config.js";

/**
 * Best-effort facilitator classification.
 *
 * There is currently no confirmed, published, fixed on-chain address for
 * either PayAI's or Coinbase CDP's Solana facilitator (see
 * packages/ingestion/README.md). The only signal we have is the
 * transaction's fee payer — facilitators sponsor gas, so they generally
 * appear as feePayer. This matches against `config.facilitatorFeePayers`,
 * which is empty until you (a) make a real test payment through each
 * facilitator's echo/test merchant, (b) look up the resulting transaction's
 * feePayer on Solscan/Helius, and (c) confirm it's stable across multiple
 * payments before trusting it as "the" facilitator address.
 *
 * Until then, everything classifies as 'unknown' — which is the honest
 * answer, not a bug.
 */
export function classifyFacilitator(transfer: ParsedUsdcTransfer): Facilitator {
  for (const [name, feePayer] of Object.entries(config.facilitatorFeePayers)) {
    if (feePayer && transfer.feePayer === feePayer) {
      if (name === "payai" || name === "coinbase_cdp") return name;
    }
  }
  return "unknown";
}
