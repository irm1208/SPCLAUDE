# Connected Reshipper Payouts Implementation Plan

**Goal:** Allow Admin wallet-approved USDT/USDC payouts with verified per-order settlement.

**Architecture:** Shared asset manifest, durable intents in the existing payout ledger, chain-specific wallet adapters and strict server-side verification. Retain manual payouts and existing authorization boundaries.

**Tech Stack:** React, Express, PostgreSQL/Drizzle, Zod, Solana web3, browser wallet providers.

## Work
- [x] Add failing tests for supported assets, reservations and immutable chain settlement.
- [x] Add shared token/network definitions and backward-compatible wallet token preferences.
- [x] Add durable intents, exact allocation checks and reservation guards to the existing ledger.
- [x] Add prepare/approve/submit/check/cancel APIs with Admin-only authorization and replay protection.
- [x] Implement EVM sender/nonce transfers, and sign-only Solana/Tron adapters with persist-before-broadcast.
- [x] Add conservative finality verification and bounded background reconciliation.
- [x] Add token choice to reshipper wallet preferences, connected payment UI, pending recovery and verified receipts.
- [x] Run targeted unit, route, component and development-database tests; production builds; restart once and inspect preview.

Verification: 87 targeted tests passed (47 backend unit/route, 17 development DB, 23 frontend). Both production builds passed. Public read-only RPC checks succeeded on every supported network. The unauthenticated app preview loads; the signed-in UI was tested via components, not visually signed in. No real funds were sent. Full-project type checks exceeded the execution timeout; no claim of a passing full-project type check.

## Files
Shared definitions: `lib/payout-assets/`.
Backend: `artifacts/api-server/src/lib/payout-chain-*`, `reshipper-chain-payments.ts`, existing payout service/rules/routes and server startup.
Frontend: existing `components/reshipper-payouts/`, plus focused connected-wallet adapters and a chain payment component.
