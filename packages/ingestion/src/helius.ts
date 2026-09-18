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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch recent transactions involving a given wallet address, newest first.
 *
 * @param address wallet to query (e.g. a merchant's payee wallet)
 * @param opts.beforeSignature pagination cursor — pass the last signature
 *   from a previous page to keep going backwards in time
 * @param opts.limit 1-100, defaults to 100
 *
 * [TODO: confirm] Helius's free-tier requests-per-second cap isn't
 * documented with a specific number we could find/verify, so this retries
 * on 429 (honoring a `Retry-After` header when Helius sends one, else a
 * fixed backoff) up to twice before giving up on that one address —
 * confirmed necessary in practice: polling 247 merchants back-to-back with
 * no delay (after Bazaar auto-discovery grew the merchant list) triggered
 * 429s on nearly every request. See poll.ts's inter-request delay
 * (`config.heliusRequestDelayMs`) for the other half of the fix.
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

  const maxRetries = 2;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const res = await fetch(url.toString());
    if (res.ok) {
      return (await res.json()) as HeliusEnhancedTransaction[];
    }

    if (res.status === 429 && attempt < maxRetries) {
      const retryAfterHeader = res.headers.get("retry-after");
      const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : NaN;
      const backoffMs = Number.isFinite(retryAfterMs) && retryAfterMs > 0 ? retryAfterMs : 1000 * (attempt + 1);
      await sleep(backoffMs);
      continue;
    }

    const body = await res.text().catch(() => "<no body>");
    throw new Error(
      `Helius request failed: ${res.status} ${res.statusText} for ${address} — ${body}`,
    );
  }

  // Unreachable — the loop above always returns or throws — but keeps TS happy.
  throw new Error(`Helius request failed for ${address}: exhausted retries`);
}
