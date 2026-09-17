-- A few fake rows for local dev before real Helius data is flowing.
-- These wallet addresses are placeholders, NOT real Solana addresses —
-- swap in real ones (or just run the ingestion service) once you're ready
-- to test against real data.

insert into merchants (id, label, payee_wallet) values
  ('demo-merchant-1', 'Demo API (example)', 'DemoMerchant1PayeeWa11etPLACEHOLDERxxxxxxx'),
  ('demo-merchant-2', 'Demo Agent Tool (example)', 'DemoMerchant2PayeeWa11etPLACEHOLDERxxxxxxx')
on conflict (id) do nothing;

insert into x402_transactions
  (id, slot, block_time, facilitator, payer_wallet, payee_wallet, merchant_id, amount_usdc, is_flagged, flag_reason)
values
  ('demo-sig-1', 1, now() - interval '2 hours', 'unknown', 'DemoPayerWa11etPLACEHOLDERxxxxxxxxxxxxxxx1', 'DemoMerchant1PayeeWa11etPLACEHOLDERxxxxxxx', 'demo-merchant-1', 0.05, false, null),
  ('demo-sig-2', 2, now() - interval '1 hour',  'unknown', 'DemoPayerWa11etPLACEHOLDERxxxxxxxxxxxxxxx2', 'DemoMerchant1PayeeWa11etPLACEHOLDERxxxxxxx', 'demo-merchant-1', 0.05, false, null),
  ('demo-sig-3', 3, now() - interval '30 minutes', 'unknown', 'DemoPayerWa11etPLACEHOLDERxxxxxxxxxxxxxxx1', 'DemoMerchant2PayeeWa11etPLACEHOLDERxxxxxxx', 'demo-merchant-2', 1.20, false, null)
on conflict (id) do nothing;
