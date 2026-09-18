import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var ${name}. Copy .env.example to .env.local (or .env) and fill it in.`,
    );
  }
  return value;
}

export const config = {
  heliusApiKey: required("HELIUS_API_KEY"),
  solanaRpcUrl: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  databaseUrl: required("DATABASE_URL"),

  /** How often to poll each tracked merchant wallet, in milliseconds. */
  pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 60_000),

  /**
   * Comma-separated Solana wallet addresses to seed as tracked merchants on
   * first run, e.g. "MerchantWallet1...,MerchantWallet2...". Optional — you
   * can also insert rows into `merchants` directly. Ingestion always reads
   * the live list from the `merchants` table, this is just a bootstrap
   * convenience for local dev before you have a UI/API for adding merchants.
   */
  seedMerchantWallets: (process.env.SEED_MERCHANT_WALLETS ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean),

  /**
   * [TODO: confirm] Known facilitator fee-payer public keys, as a JSON map,
   * e.g. FACILITATOR_FEE_PAYERS='{"payai":"...","coinbase_cdp":"..."}'.
   *
   * As of this writing (Sep 2026) neither PayAI's nor Coinbase CDP's docs
   * publish a fixed, stable on-chain address for their Solana facilitator —
   * see packages/ingestion/README.md for how we verified this and how to
   * fill this in once you've observed real fee-payer pubkeys from your own
   * test payments. Until then this map is empty and every transaction is
   * classified as 'unknown'.
   */
  facilitatorFeePayers: parseFacilitatorMap(process.env.FACILITATOR_FEE_PAYERS),

  /**
   * Auto-discovery of Solana x402 merchants via Coinbase CDP's public
   * Bazaar directory (see discovery.ts) — an alternative/supplement to
   * hand-listing SEED_MERCHANT_WALLETS. On by default; set
   * ENABLE_BAZAAR_DISCOVERY=false to disable if the Bazaar API is
   * unreachable or misbehaving and you want ingestion to keep running
   * without it.
   */
  enableBazaarDiscovery: (process.env.ENABLE_BAZAAR_DISCOVERY ?? "true") !== "false",

  /** How often the always-on worker loop re-checks the Bazaar, in ms. */
  bazaarDiscoveryIntervalMs: Number(process.env.BAZAAR_DISCOVERY_INTERVAL_MS ?? 60 * 60_000),

  /**
   * Non-organic activity heuristics (TECH-SPEC.md section 4). These
   * thresholds are our own tunable design choice, not a researched x402/
   * Solana fact — the "e.g. >10 times in 1 hour" in TECH-SPEC.md was
   * explicitly an example, not a spec'd number. Override via env vars if
   * they turn out too strict/loose once there's more real transaction
   * volume flowing through ingestion.
   */
  heuristics: {
    // Heuristic 1 — repeated identical-amount loop (flags transactions).
    // "more than N times in 1 hour" -> loopCount must exceed this to flag.
    identicalAmountLoopThreshold: Number(
      process.env.HEURISTIC_IDENTICAL_AMOUNT_LOOP_THRESHOLD ?? 10,
    ),

    // Heuristic 2 — volume without payer growth (flags merchants).
    // Compares a trailing window against the one before it.
    volumeWindowDays: Number(process.env.HEURISTIC_VOLUME_WINDOW_DAYS ?? 7),
    // Current-period volume must be at least this many times the
    // previous-period volume to count as "rising sharply".
    volumeGrowthMultiplier: Number(process.env.HEURISTIC_VOLUME_GROWTH_MULTIPLIER ?? 2),
    // Distinct payer count is allowed to grow by at most this many wallets
    // (not multiplier — flat headroom) for the volume growth to still look
    // suspicious. E.g. previous period had 3 payers, this allows up to 4.
    payerGrowthAllowance: Number(process.env.HEURISTIC_PAYER_GROWTH_ALLOWANCE ?? 1),
    // Don't evaluate merchants with too little activity to say anything
    // meaningful — avoids flagging a merchant's very first few real
    // transactions just because "volume went from $0 to something".
    minCurrentPeriodTxCount: Number(process.env.HEURISTIC_MIN_CURRENT_PERIOD_TX_COUNT ?? 10),
  },
};

function parseFacilitatorMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed;
  } catch {
    console.warn(
      "[config] FACILITATOR_FEE_PAYERS is not valid JSON, ignoring it. Expected e.g. " +
        '\'{"payai":"...pubkey...","coinbase_cdp":"...pubkey..."}\'',
    );
    return {};
  }
}
