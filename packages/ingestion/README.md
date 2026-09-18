# @railsight/ingestion

Polls Helius for USDC transfers into tracked merchant wallets and writes
settled x402 payments into `x402_transactions`.

## Why this polls *merchant wallets*, not "facilitator addresses"

The Week 1 roadmap item was to confirm PayAI's and Coinbase CDP's
facilitator addresses/program IDs on Solana mainnet before writing
ingestion code. Research turned up the opposite of what that item assumed:

- x402 facilitators (PayAI, Coinbase CDP) are **off-chain API services**,
  not on-chain programs. Coinbase's own docs describe the facilitator as
  something that "verifies payment payloads" and "settles payments on the
  blockchain on behalf of servers" — there's no facilitator contract to
  watch.
- On Solana, the "exact" scheme settles as a plain **SPL Token
  `TransferChecked`** instruction (payer → payee, i.e. merchant, wallet),
  bundled with Compute Budget instructions and sometimes a Memo/Lighthouse
  instruction, all fee-paid and submitted by the facilitator's backend.
- Coinbase CDP's docs list Solana mainnet support via the CAIP-2 network id
  `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` — that's a network identifier,
  not a settlement address.
- Neither facilitator publishes a fixed, stable fee-payer public key in
  their docs (PayAI's docs only show their echo/test merchant endpoint,
  `https://x402.payai.network/api/solana-mainnet/paid-content`).

**Practical consequence:** there is nothing to filter the whole Solana
ledger for. Instead, ingestion tracks *known merchant payee wallets*
(rows in the `merchants` table) and pulls their incoming USDC transfers —
which is also just a better fit for RailSight's actual purpose (per-merchant
revenue), and matches how the `merchants` table was already designed in
`TECH-SPEC.md`.

`facilitator` is set to `'unknown'` for every transaction until you
populate `FACILITATOR_FEE_PAYERS` (see `.env.example`) with fee-payer
pubkeys you've personally verified — see below.

## [TODO: confirm] How to actually identify a facilitator's fee-payer key

1. Make a real (small) test payment through PayAI's echo merchant:
   `https://x402.payai.network/api/solana-mainnet/paid-content` — their
   getting-started doc (`docs.payai.network/x402-echo/getting-started`)
   walks through this.
2. Look up the resulting transaction signature on Solscan or Helius's
   explorer and note the `feePayer`.
3. Repeat with a couple more payments to confirm it's a *stable* address,
   not a rotating one — facilitators may use multiple signer keys.
4. Do the same for a Coinbase CDP-settled payment once you have a merchant
   integrated with CDP.
5. Once confirmed, set `FACILITATOR_FEE_PAYERS` in your `.env`:
   ```
   FACILITATOR_FEE_PAYERS={"payai":"<verified pubkey>","coinbase_cdp":"<verified pubkey>"}
   ```

Do not hardcode a guessed address — the project's own ground rule (see the
Project instructions) is to mark unconfirmed facts `[TODO: confirm]` rather
than invent them, and this one genuinely isn't published anywhere.

## Running

```bash
cd packages/ingestion
npm run once      # single pass, good for testing your .env
npm run discover  # single pass, but forces a Bazaar discovery lookup (ignores the throttle)
npm run dev       # polls every POLL_INTERVAL_MS (default 60s), restarts on file change
npm start          # after `npm run build`, runs the compiled dist/
```

Requires `HELIUS_API_KEY` and `DATABASE_URL` at minimum — see the root
`.env.example`. Copy it to `.env` (this package loads `.env` via `dotenv`
from the directory you run it in — for the monorepo scripts in the root
`package.json`, that's `packages/ingestion/`, so keep a `.env` there, or a
symlink to the root one).

`SEED_MERCHANT_WALLETS` (comma-separated) is a bootstrap convenience for
local dev only — normally you'd add rows to `merchants` through the API/DB
directly.

## Auto-discovering merchants via Coinbase CDP's Bazaar

Besides `SEED_MERCHANT_WALLETS`, every ingestion cycle can also pull real,
currently-active Solana x402 services straight from Coinbase CDP's public
**Bazaar** directory — a catalog of x402-gated services the CDP facilitator
has indexed. It's a real, documented, unauthenticated API:
`GET https://api.cdp.coinbase.com/platform/v2/x402/discovery/resources`
(paginated via `limit`/`offset`/`total`, no API key required — see
`docs.cdp.coinbase.com/x402/bazaar` and the discovery-resources API
reference). `src/discovery.ts` walks every page, keeps only entries whose
`accepts[]` has a Solana `network` and a `payTo` address, and dedupes by
wallet. Each discovered wallet is upserted into `merchants` via
`upsertDiscoveredMerchant()` (`src/db.ts`) — a manually-set `label` is never
overwritten by the Bazaar's `serviceName`.

**Confirmed working** (Pasha ran `npm run discover` from his own machine on
2026-09-18): found 236 real Solana merchants on the first call. The schema
assumed in `discovery.ts` matches what the API actually returns.

Heads up — running discovery for the first time on an established install
will jump your tracked-merchant count a lot (14 → 247 in that same run),
which immediately exposed a Helius rate-limit problem: see "Rate limiting"
below. If you're re-running this fresh, expect the same thing and don't be
alarmed by a wall of 429 errors on the *next* `npm run once`/`npm run dev` —
that's what the fix below is for.

Controlled by two env vars (see `.env.example`), both optional:

- `ENABLE_BAZAAR_DISCOVERY` (default `true`) — set to `false` to disable if
  the Bazaar API is unreachable or misbehaving and you want ingestion to
  keep running without it.
- `BAZAAR_DISCOVERY_INTERVAL_MS` (default `3600000`, 1 hour) — how often the
  always-on worker loop (`npm run dev`/`npm start`) re-checks the Bazaar.
  Irrelevant to `--once`/`--discover-only`/a serverless cron invocation,
  since each of those is a fresh process.

Still USDC-only and Solana-only, matching PRD.md/TECH-SPEC.md's scope —
non-Solana entries and non-USDC `asset`s are ignored, not broadened.

## Rate limiting (confirmed necessary, not hypothetical)

The first real run of Bazaar discovery grew the tracked merchant list from
14 to 247 wallets, and polling all of them with no delay between Helius
requests triggered `429 Too Many Requests` on nearly every single one.
Fixed in `src/helius.ts` (`fetchAddressTransactions`) and `src/poll.ts`:

- Each merchant's request now waits `HELIUS_REQUEST_DELAY_MS` (default
  `300`, see `.env.example`) after the previous one.
- A `429` response is retried up to twice, honoring Helius's `Retry-After`
  header when present, else a fixed 1s/2s backoff.

`[TODO: confirm]` the 300ms default is our own conservative starting point
— we couldn't find/verify Helius's actual free-tier requests-per-second
cap in their docs. Tune `HELIUS_REQUEST_DELAY_MS` down if it turns out
unnecessarily slow (a full pass over 247 merchants takes ~75s at the
default), or up if 429s still show up in the logs after this fix.

`apps/web/src/lib/ingest-cron.ts` (the Vercel Cron path) has the same
fix, plus a merchant-count cap (`CRON_MERCHANT_LIMIT`, default `80`) and
random polling order, since that route also has to fit inside Vercel's
60s `maxDuration` — see the comments in that file.

## Known limitations (MVP, see TECH-SPEC.md §10 build order)

- Re-fetches the last 100 transactions per wallet every poll instead of
  persisting a pagination cursor — fine for a handful of merchants and a
  hackathon timeline, wasteful at scale, and now that Bazaar discovery
  can grow the list into the hundreds, this is the main thing worth
  revisiting next if there's time (a per-merchant `before-signature`
  cursor would cut most of the redundant re-fetching).
- No Helius webhook support yet (TECH-SPEC.md mentions this as the
  alternative to polling) — polling was simpler to get working first and
  doesn't require a public HTTPS endpoint for Helius to call back to.
