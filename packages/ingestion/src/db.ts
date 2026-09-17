import pg from "pg";
import type { Facilitator, Merchant } from "@railsight/shared";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({ connectionString: config.databaseUrl });

/** Merchants currently tracked — ingestion polls each one's payee wallet. */
export async function getTrackedMerchants(): Promise<Merchant[]> {
  const { rows } = await pool.query<{
    id: string;
    label: string | null;
    payee_wallet: string;
  }>("select id, label, payee_wallet from merchants order by id");

  return rows.map((r) => ({ id: r.id, label: r.label, payeeWallet: r.payee_wallet }));
}

/**
 * Bootstrap convenience for local dev: insert any wallets from
 * SEED_MERCHANT_WALLETS that aren't already tracked. Uses the wallet
 * address itself as the merchant id for the MVP — replace with a real
 * merchant-identity flow later (see TECH-SPEC.md's `merchants` table).
 */
export async function seedMerchantsFromConfig(): Promise<void> {
  for (const wallet of config.seedMerchantWallets) {
    await pool.query(
      `insert into merchants (id, label, payee_wallet)
       values ($1, null, $1)
       on conflict (id) do nothing`,
      [wallet],
    );
  }
}

export interface InsertableTransaction {
  id: string; // tx signature
  slot: number;
  blockTime: string; // ISO
  facilitator: Facilitator;
  payerWallet: string;
  payeeWallet: string;
  merchantId: string;
  amountUsdc: number;
}

/**
 * Insert a settled transfer. Idempotent on signature (`id`) so re-polling
 * the same window is safe — this is what lets the MVP skip persisting a
 * pagination cursor.
 */
export async function insertTransaction(tx: InsertableTransaction): Promise<boolean> {
  const { rowCount } = await pool.query(
    `insert into x402_transactions
       (id, slot, block_time, facilitator, payer_wallet, payee_wallet, merchant_id, amount_usdc)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing`,
    [
      tx.id,
      tx.slot,
      tx.blockTime,
      tx.facilitator,
      tx.payerWallet,
      tx.payeeWallet,
      tx.merchantId,
      tx.amountUsdc,
    ],
  );
  return (rowCount ?? 0) > 0;
}
