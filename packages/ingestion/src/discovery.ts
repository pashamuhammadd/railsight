/**
 * Auto-discovery of Solana x402 merchants via Coinbase CDP's public
 * "Bazaar" directory — a catalog of x402 payment-gated services that
 * CDP's own facilitator has indexed. This is a real, documented,
 * unauthenticated API (not a guess/workaround):
 *
 *   - docs.cdp.coinbase.com/x402/bazaar: "Bazaar discovery is public. You
 *     do not need a CDP API key to use the discovery APIs."
 *   - docs.cdp.coinbase.com/api-reference/v2/rest-api/x402-facilitator/list-x402-resources:
 *     GET /v2/x402/discovery/resources on base https://api.cdp.coinbase.com/platform,
 *     paginated via `limit`/`offset`/`total`, each item's `accepts[]`
 *     carries `network`, `payTo`, `asset`, etc. Legacy network names like
 *     "solana" are accepted alongside the normalized CAIP-2 id
 *     ("solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp" — see
 *     claude/x402-facilitator-research.md), so this matches both forms.
 *
 * [TODO: confirm] This was researched via docs pages, not a live test
 * call — this session's network policy blocked reaching
 * api.cdp.coinbase.com to verify a real response. Run
 * `npm run discover` once from your own machine and read the console
 * output before trusting this for the actual submission; if the schema
 * has drifted, fix this file, don't silently guess around a failure.
 *
 * Why this matters for RailSight: instead of only tracking merchant
 * wallets Pasha hand-picks (SEED_MERCHANT_WALLETS), this pulls real,
 * currently-active Solana x402 services straight from the facilitator's
 * own registry — more real transaction volume without manual
 * wallet-hunting, and a stronger "we're not just guessing" story for
 * judges. Kept to Solana + the existing USDC-only scope (PRD.md
 * non-goals / TECH-SPEC.md section 3) — non-Solana and non-`payTo`
 * entries are ignored.
 */

const BAZAAR_BASE_URL = "https://api.cdp.coinbase.com/platform";
const BAZAAR_PAGE_SIZE = 100;

interface BazaarAcceptEntry {
  scheme?: string;
  network?: string;
  amount?: string;
  payTo?: string;
  asset?: string;
  maxTimeoutSeconds?: number;
}

interface BazaarResourceItem {
  resource: string;
  type: string;
  x402Version: number;
  description?: string;
  serviceName?: string;
  accepts?: BazaarAcceptEntry[];
  quality?: {
    l30DaysTotalCalls?: number;
    l30DaysUniquePayers?: number;
    lastCalledAt?: string;
  };
}

interface BazaarListResponse {
  items: BazaarResourceItem[];
  limit: number;
  offset: number;
  total: number;
}

export interface DiscoveredMerchant {
  wallet: string;
  serviceName: string | null;
  resource: string;
  l30DaysTotalCalls: number | null;
  l30DaysUniquePayers: number | null;
}

/** Accepts both the legacy "solana" slug and the normalized CAIP-2 id. */
function isSolanaNetwork(network: string | undefined): boolean {
  if (!network) return false;
  return network === "solana" || network.startsWith("solana:");
}

async function fetchBazaarPage(offset: number): Promise<BazaarListResponse> {
  const url = `${BAZAAR_BASE_URL}/v2/x402/discovery/resources?type=http&limit=${BAZAAR_PAGE_SIZE}&offset=${offset}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    throw new Error(`Bazaar discovery request failed: ${res.status} ${res.statusText} — ${body}`);
  }
  return (await res.json()) as BazaarListResponse;
}

/**
 * Walks every page of the Bazaar's public resource listing and returns
 * every distinct Solana `payTo` wallet found, deduped by wallet address.
 * A single service can list several `accepts` entries (different
 * chains/assets) — only ones matching a Solana `network` are kept.
 */
export async function discoverSolanaMerchantsFromBazaar(): Promise<DiscoveredMerchant[]> {
  const found = new Map<string, DiscoveredMerchant>();
  let offset = 0;

  // Safety valve: bail after a generous number of pages so a pagination
  // bug (e.g. `total` never satisfied) can't loop forever inside the
  // long-running worker process.
  for (let page = 0; page < 200; page++) {
    const result = await fetchBazaarPage(offset);
    const items = result.items ?? [];

    for (const item of items) {
      for (const accept of item.accepts ?? []) {
        if (!accept.payTo || !isSolanaNetwork(accept.network)) continue;
        if (!found.has(accept.payTo)) {
          found.set(accept.payTo, {
            wallet: accept.payTo,
            serviceName: item.serviceName ?? null,
            resource: item.resource,
            l30DaysTotalCalls: item.quality?.l30DaysTotalCalls ?? null,
            l30DaysUniquePayers: item.quality?.l30DaysUniquePayers ?? null,
          });
        }
      }
    }

    offset += items.length;
    if (items.length === 0 || offset >= result.total) break;
  }

  return Array.from(found.values());
}
