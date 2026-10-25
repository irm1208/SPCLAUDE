# Single-vial checkout currency and seller alerts

**Goal:** Preserve seller-currency prices and lock the correct stablecoin payment amount; make seller Telegram alerts configurable and failures visible.

**Approved approach:** Keep listing, basket, checkout and order totals in the product currency. Display crypto settlement separately. Reject mixed-currency baskets rather than adding unlike currencies.

## Implementation
- [x] Add regression tests for currency-aware cart state, money formatting, GBP-to-USD conversion, mixed-currency rejection, FX failure, and seller notification failures.
- [x] Persist a nullable pricing currency on vial orders. Null preserves the distinction between legacy unknown currency and newly snapshotted currency. Keep the existing locked USD payment amount and verification path.
- [x] Carry product currency into cart items. Preserve legacy selections and resolve missing currencies from the live catalogue rather than guessing. Reject mixed-currency additions with a visible message.
- [x] Replace hardcoded dollar/USDT labels on listing quantity totals, basket, checkout and seller orders. Keep the separate locked crypto amount on the payment screen.
- [x] Expose seller notification settings in Store Profile, validate a private Telegram chat ID, provide a test-message action, and audit failed/skipped new-order alerts without failing order creation.
- [x] Run focused API/frontend tests and builds, restart the canonical app once, check logs and capture the shop preview. Never place a real order, send a real payment or trigger a live seller alert during verification.

## Results
44 focused tests passed; API and web production builds passed; mobile shop preview and startup logs checked. Seller controls were tested with a simulated session, not a signed-in live browser. Full repository typechecking continues to report pre-existing errors, including two unchanged registration audit-log calls in the vial router.

## Checks
Use API Vitest tests and frontend tsx/Vitest tests with mocked DB, FX and Telegram. A £16 order at a mocked 1.30 rate must remain £16 in order totals and expect 20.80 USDT/USDC. An FX failure must prevent checkout rather than assume a rate. Seller alert failure must leave the order successful and produce a diagnostic event.
