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
