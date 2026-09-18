import type { Facilitator } from "@railsight/shared";
import { pool } from "./db";

/**
 * Self-contained ingestion cycle for the Vercel Cron route
 * (apps/web/src/app/api/cron/ingest/route.ts) — this is what makes
 * ingestion run continuously instead of only when Pasha's laptop happens
 * to be running `npm run dev` in packages/ingestion.
 *
 * Why this duplicates packages/ingestion instead of importing it:
 * `@railsight/ingestion`'s src/index.ts has a CLI `main()` that calls
 * `process.exit()` — that must never run inside a Next.js serverless
 * function (it would kill the whole invocation). Cleanly separating a
 * side-effect-free sub-export and getting Next.js/Vercel's build to
 * actually bundle a cross-workspace TS import correctly (via
 * `transpilePackages`) wasn't something this session could verify against
 * a real Vercel deploy before the hackathon deadline, so — smallest thing
 * that works — this keeps its own trimmed copy of the same logic instead.
 * If packages/ingestion's poll.ts, flagging.ts, discovery.ts,
 * classify.ts, parse.ts, or helius.ts change, mirror the change here too.
 *
 * Everything below is a direct port of:
 *   packages/ingestion/src/{helius,parse,classify,poll,flagging,discovery,db}.ts
 * with apps/web's own `pool` (src/lib/db.ts) instead of ingestion's.
 */

// --- constants (packages/ingestion/src/constants.ts) -----------------------

const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

// --- config (subset of packages/ingestion/src/config.ts) -------------------

function parseFacilitatorMap(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    console.warn("[ingest-cron] FACILITATOR_FEE_PAYERS is not valid JSON, ignoring it.");
    return {};
  }
}

const cronConfig = {
  heliusApiKey: process.env.HELIUS_API_KEY ?? "",
  seedMerchantWallets: (process.env.SEED_MERCHANT_WALLETS ?? "")
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean),
  facilitatorFeePayers: parseFacilitatorMap(process.env.FACILITATOR_FEE_PAYERS),
  enableBazaarDiscovery: (process.env.ENABLE_BAZAAR_DISCOVERY ?? "true") !== "false",
  heuristics: {
    identicalAmountLoopThreshold: Number(process.env.HEURISTIC_IDENTICAL_AMOUNT_LOOP_THRESHOLD ?? 10),
    volumeWindowDays: Number(process.env.HEURISTIC_VOLUME_WINDOW_DAYS ?? 7),
    volumeGrowthMultiplier: Number(process.env.HEURISTIC_VOLUME_GROWTH_MULTIPLIER ?? 2),
    payerGrowthAllowance: Number(process.env.HEURISTIC_PAYER_GROWTH_ALLOWANCE ?? 1),
    minCurrentPeriodTxCount: Number(process.env.HEURISTIC_MIN_CURRENT_PERIOD_TX_COUNT ?? 10),
  },
};

// --- helius.ts ---------------------------------------------------------

const HELIUS_BASE_URL = "https://mainnet.helius-rpc.com";

interface HeliusTokenTransfer {
  fromUserAccount: string;
  toUserAccount: string;
  mint: string;
  tokenAmount: number;
}

interface HeliusEnhancedTransaction {
  signature: string;
  slot: number;
  timestamp: number;
  feePayer: string;
  tokenTransfers: HeliusTokenTransfer[];
}

async function fetchAddressTransactions(address: string, limit = 100): Promise<HeliusEnhancedTransaction[]> {
  const url = new URL(`${HELIUS_BASE_URL}/v0/addresses/${address}/transactions`);
  url.searchParams.set("api-key", cronConfig.heliusApiKey);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = await res.text().catch(() => "<no body>");
    throw new Error(`Helius request failed: ${res.status} ${res.statusText} for ${address} — ${body}`);
  }
  return (await res.json()) as HeliusEnhancedTransaction[];
}

// --- parse.ts ------------------------------------------------------------

interface ParsedUsdcTransfer {
  signature: string;
  slot: number;
  blockTime: string;
  source: string;
  destination: string;
  amountUsdc: number;
  feePayer: string;
}

function extractUsdcTransfersTo(tx: HeliusEnhancedTransaction, trackedWallet: string): ParsedUsdcTransfer[] {
  if (!tx.tokenTransfers?.length) return [];
  return tx.tokenTransfers
    .filter((t) => t.mint === USDC_MINT_MAINNET && t.toUserAccount === trackedWallet)
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

// --- classify.ts ---------------------------------------------------------

function classifyFacilitator(transfer: ParsedUsdcTransfer): Facilitator {
  for (const [name, feePayer] of Object.entries(cronConfig.facilitatorFeePayers)) {
    if (feePayer && transfer.feePayer === feePayer) {
      if (name === "payai" || name === "coinbase_cdp") return name;
    }
  }
  return "unknown";
}

// --- discovery.ts (Coinbase CDP Bazaar) -----------------------------------

const BAZAAR_BASE_URL = "https://api.cdp.coinbase.com/platform";
const BAZAAR_PAGE_SIZE = 100;

interface BazaarAcceptEntry {
  network?: string;
  payTo?: string;
}

interface BazaarResourceItem {
  resource: string;
  serviceName?: string;
  accepts?: BazaarAcceptEntry[];
}

interface BazaarListResponse {
  items: BazaarResourceItem[];
  limit: number;
  offset: number;
  total: number;
}

interface DiscoveredMerchant {
  wallet: string;
  serviceName: string | null;
}

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

/** [TODO: confirm] see packages/ingestion/src/discovery.ts for the full caveat — this session couldn't reach api.cdp.coinbase.com to live-test it. */
async function discoverSolanaMerchantsFromBazaar(): Promise<DiscoveredMerchant[]> {
  const found = new Map<string, DiscoveredMerchant>();
  let offset = 0;

  for (let page = 0; page < 200; page++) {
    const result = await fetchBazaarPage(offset);
    const items = result.items ?? [];

    for (const item of items) {
      for (const accept of item.accepts ?? []) {
        if (!accept.payTo || !isSolanaNetwork(accept.network)) continue;
        if (!found.has(accept.payTo)) {
          found.set(accept.payTo, { wallet: accept.payTo, serviceName: item.serviceName ?? null });
        }
      }
    }

    offset += items.length;
    if (items.length === 0 || offset >= result.total) break;
  }

  return Array.from(found.values());
}

// --- db.ts (writes) -------------------------------------------------------

async function upsertDiscoveredMerchant(wallet: string, serviceName: string | null): Promise<void> {
  await pool.query(
    `insert into merchants (id, label, payee_wallet)
     values ($1, $2, $1)
     on conflict (id) do update
       set label = coalesce(merchants.label, excluded.label)`,
    [wallet, serviceName],
  );
}

async function seedMerchantsFromConfig(): Promise<void> {
  for (const wallet of cronConfig.seedMerchantWallets) {
    await pool.query(
      `insert into merchants (id, label, payee_wallet)
       values ($1, null, $1)
       on conflict (id) do nothing`,
      [wallet],
    );
  }
}

async function getTrackedMerchants(): Promise<Array<{ id: string; payeeWallet: string }>> {
  const { rows } = await pool.query<{ id: string; payee_wallet: string }>(
    "select id, payee_wallet from merchants order by id",
  );
  return rows.map((r) => ({ id: r.id, payeeWallet: r.payee_wallet }));
}

async function insertTransaction(tx: {
  id: string;
  slot: number;
  blockTime: string;
  facilitator: Facilitator;
  payerWallet: string;
  payeeWallet: string;
  merchantId: string;
  amountUsdc: number;
}): Promise<boolean> {
  const { rowCount } = await pool.query(
    `insert into x402_transactions
       (id, slot, block_time, facilitator, payer_wallet, payee_wallet, merchant_id, amount_usdc)
     values ($1, $2, $3, $4, $5, $6, $7, $8)
     on conflict (id) do nothing`,
    [tx.id, tx.slot, tx.blockTime, tx.facilitator, tx.payerWallet, tx.payeeWallet, tx.merchantId, tx.amountUsdc],
  );
  return (rowCount ?? 0) > 0;
}

// --- poll.ts ---------------------------------------------------------------

async function pollOnce(): Promise<{ merchantsChecked: number; inserted: number }> {
  const merchants = await getTrackedMerchants();
  let inserted = 0;

  for (const merchant of merchants) {
    let txs: HeliusEnhancedTransaction[];
    try {
      txs = await fetchAddressTransactions(merchant.payeeWallet, 100);
    } catch (err) {
      console.error(`[ingest-cron] failed to fetch transactions for ${merchant.payeeWallet}:`, err);
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

// --- flagging.ts ------------------------------------------------------------

async function flagIdenticalAmountLoops(): Promise<number> {
  const { rowCount } = await pool.query(
    `with windowed as (
       select
         id,
         count(*) over (
           partition by payer_wallet, payee_wallet, amount_usdc
           order by block_time
           range between interval '1 hour' preceding and current row
         ) as loop_count
       from x402_transactions
     )
     update x402_transactions t
     set is_flagged = true,
         flag_reason = 'repeated_identical_amount_loop'
     from windowed w
     where t.id = w.id
       and w.loop_count > $1`,
    [cronConfig.heuristics.identicalAmountLoopThreshold],
  );
  return rowCount ?? 0;
}

async function flagVolumeWithoutPayerGrowth(): Promise<{ flagged: number; unflagged: number }> {
  const h = cronConfig.heuristics;

  const periodsCte = `
    with periods as (
      select
        merchant_id,
        coalesce(sum(amount_usdc) filter (
          where block_time >= now() - make_interval(days => $1::int)
        ), 0) as current_volume,
        count(*) filter (
          where block_time >= now() - make_interval(days => $1::int)
        )::int as current_tx_count,
        count(distinct payer_wallet) filter (
          where block_time >= now() - make_interval(days => $1::int)
        )::int as current_payers,
        coalesce(sum(amount_usdc) filter (
          where block_time >= now() - make_interval(days => $1::int * 2)
            and block_time <  now() - make_interval(days => $1::int)
        ), 0) as previous_volume,
        count(distinct payer_wallet) filter (
          where block_time >= now() - make_interval(days => $1::int * 2)
            and block_time <  now() - make_interval(days => $1::int)
        )::int as previous_payers
      from x402_transactions
      where merchant_id is not null
      group by merchant_id
    ),
    qualifying as (
      select merchant_id
      from periods
      where current_tx_count >= $2
        and previous_volume > 0
        and current_volume >= previous_volume * $3
        and current_payers <= previous_payers + $4
    )
  `;

  const [unflagged, flagged] = await Promise.all([
    pool.query(
      `${periodsCte}
       update merchants m
       set is_flagged = false, flag_reason = null
       where m.flag_reason = 'volume_without_payer_growth'
         and m.id not in (select merchant_id from qualifying)`,
      [h.volumeWindowDays, h.minCurrentPeriodTxCount, h.volumeGrowthMultiplier, h.payerGrowthAllowance],
    ),
    pool.query(
      `${periodsCte}
       update merchants m
       set is_flagged = true, flag_reason = 'volume_without_payer_growth'
       from qualifying q
       where m.id = q.merchant_id
         and (m.is_flagged is not true or m.flag_reason is distinct from 'volume_without_payer_growth')`,
      [h.volumeWindowDays, h.minCurrentPeriodTxCount, h.volumeGrowthMultiplier, h.payerGrowthAllowance],
    ),
  ]);

  return { flagged: flagged.rowCount ?? 0, unflagged: unflagged.rowCount ?? 0 };
}

// --- public entry point ------------------------------------------------

export interface CronIngestResult {
  discovered: number;
  merchantsChecked: number;
  inserted: number;
  loopFlaggedTransactions: number;
  flaggedMerchants: number;
  unflaggedMerchants: number;
}

/**
 * One full ingestion pass, meant to be called once per invocation of
 * `/api/cron/ingest` (Vercel Cron hits this once a day on the Hobby
 * plan — see vercel.json). Every sub-step is wrapped so one failure
 * (e.g. the Bazaar API being down) doesn't take down the rest of the
 * cycle.
 */
export async function runDailyIngestCycle(): Promise<CronIngestResult> {
  if (!cronConfig.heliusApiKey) {
    throw new Error("Missing HELIUS_API_KEY env var — set it in Vercel Project Settings -> Environment Variables.");
  }

  let discovered = 0;
  if (cronConfig.enableBazaarDiscovery) {
    try {
      const merchants = await discoverSolanaMerchantsFromBazaar();
      for (const m of merchants) {
        await upsertDiscoveredMerchant(m.wallet, m.serviceName);
      }
      discovered = merchants.length;
    } catch (err) {
      console.error("[ingest-cron] Bazaar discovery failed, continuing without it:", err);
    }
  }

  await seedMerchantsFromConfig();
  const { merchantsChecked, inserted } = await pollOnce();
  const loopFlaggedTransactions = await flagIdenticalAmountLoops();
  const { flagged: flaggedMerchants, unflagged: unflaggedMerchants } = await flagVolumeWithoutPayerGrowth();

  return {
    discovered,
    merchantsChecked,
    inserted,
    loopFlaggedTransactions,
    flaggedMerchants,
    unflaggedMerchants,
  };
}
