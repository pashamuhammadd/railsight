import type { ParsedUsdcTransfer } from "@railsight/shared";
import type { HeliusEnhancedTransaction } from "./helius.js";
import { USDC_MINT_MAINNET } from "./constants.js";

/**
 * Pull out USDC transfers *into* `trackedWallet` from a Helius enhanced
 * transaction. A single transaction can contain multiple token transfers
 * (e.g. compute-budget + transferChecked + memo instructions all bundled
 * together, which is how x402's "exact" scheme settles on Solana) so this
 * returns an array, not a single result.
 */
export function extractUsdcTransfersTo(
  tx: HeliusEnhancedTransaction,
  trackedWallet: string,
): ParsedUsdcTransfer[] {
  if (!tx.tokenTransfers?.length) return [];

  return tx.tokenTransfers
    .filter(
      (t) => t.mint === USDC_MINT_MAINNET && t.toUserAccount === trackedWallet,
    )
    .map((t) => ({
      signature: tx.signature,
      slot: tx.slot,
      blockTime: new Date(tx.timestamp * 1000).toISOString(),
      source: t.fromUserAccount,
      destination: t.toUserAccount,
      amountUsdc: t.tokenAmount,
      feePayer: tx.feePayer,
    }));
}
