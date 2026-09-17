import { config } from "./config.js";

/**
 * Minimal client for Helius's Enhanced Transactions API ("transaction
 * history by address"). Verified against Helius's docs
 * (helius.dev/docs/enhanced-transactions/transaction-history) as of
 * Sep 2026: base host mainnet.helius-rpc.com, path
 * /v0/addresses/{address}/transactions, cursor param `before-signature`.
 *
 * [TODO: confirm] Helius's API surface changes; if requests start failing,
 * re-check the docs page above for the current host/params before assuming
 * the code is wrong — don't just guess at a fix.
 */
const HELIUS_BASE_URL = "https://mainnet.helius-rpc.com";

/** Shape of the fields we actually use from a Helius enhanced transaction. */
export interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  fromTokenAccount?: string;
  toTokenAccount?: string;
  mint: string;
  tokenAmount: number;
}

export interface HeliusEnhancedTransaction {
  signature: string;
  slot: number;
  timestamp: number; // unix seconds
  feePayer: string;
  type: string;
  tokenTransfers: HeliusTokenTransfer[];
}

/**
 * Fetch recent transactions involving a given wallet address, newest first.
 *
 * @param address wallet to query (e.g. a merchant's payee wallet)
 * @param opts.beforeSignature pagination cursor — pass the last signature
 *   from a previous page to keep going backwards in time
 * @param opts.limit 1-100, defaults to 100
 */
export async function fetchAddressTransactions(
  address: string,
  opts: { beforeSignature?: string; limit?: number } = {},
): Promise<HeliusEnhancedTransaction[]> {
  const url = new URL(`${HELIUS_BASE_URL}/v0/addresses/${address}/transactions`);
  url.searchParams.set("api-key", config.heliusApiKey);
  url.searchParams.set("limit", String(opts.limit ?? 100));
  if (opts.beforeSignature) {
    url.searchParams.set("before-signature", opts.beforeSignature);
  }

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    throw new Error(
      `Helius request failed: ${res.status} ${res.statusText} for ${address} — ${body}`,
    );
  }

  return (await res.json()) as HeliusEnhancedTransaction[];
}
