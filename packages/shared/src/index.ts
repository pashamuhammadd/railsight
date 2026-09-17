/**
 * Shared types for RailSight — used by both apps/web and packages/ingestion.
 * Mirrors the schema in db/schema.sql. Keep these two in sync by hand for the MVP.
 */

/**
 * Which facilitator settled a payment.
 *
 * IMPORTANT: as of this writing there is no confirmed, fixed on-chain
 * program ID or wallet address for either facilitator on Solana mainnet —
 * see the note in packages/ingestion/README.md. 'unknown' is the honest
 * default until a transaction can be attributed with confidence (e.g. by
 * matching a known fee-payer pubkey you've personally verified, or a memo
 * string).
 */
export type Facilitator = "payai" | "coinbase_cdp" | "unknown";

export interface X402Transaction {
  /** Solana transaction signature — primary key. */
  id: string;
  slot: number;
  blockTime: string; // ISO timestamp
  facilitator: Facilitator;
  payerWallet: string;
  payeeWallet: string;
  merchantId: string | null;
  amountUsdc: number;
  isFlagged: boolean;
  flagReason: FlagReason | null;
}

export interface Merchant {
  /** Derived from payee wallet or a declared identity. */
  id: string;
  label: string | null;
  payeeWallet: string;
}

export interface DailyVolume {
  day: string; // YYYY-MM-DD
  facilitator: Facilitator;
  volumeUsdc: number;
  txCount: number;
}

/**
 * MVP non-organic activity heuristics — see TECH-SPEC.md section 4.
 * Keep this union in sync with whatever ingestion/flags.ts actually writes
 * into x402_transactions.flag_reason.
 */
export type FlagReason =
  | "repeated_identical_amount_loop"
  | "volume_without_payer_growth";

/** A single settled-USDC transfer as normalized off a parsed Solana transaction. */
export interface ParsedUsdcTransfer {
  signature: string;
  slot: number;
  blockTime: string; // ISO timestamp
  source: string; // payer wallet
  destination: string; // payee wallet
  amountUsdc: number;
  feePayer: string;
}
