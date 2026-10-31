# Vendor wallets and supplier payment records

User requirements: Admin records a payment TXID against selected vendor orders. Vendor Settings supports multiple receiving wallets across all supported currencies/networks. Vendors must save at least one wallet before using the portal.

Implementation:
- New vendor_wallets, vendor_payments and vendor_payment_allocations tables through additive startup schema setup. No customer payment fields are changed.
- Wallet settings support all configured USDT/USDC payout rails plus native BTC, ETH and SOL. Require 1–20 wallets. Validate Bitcoin Bech32/Bech32m/Base58Check, Tron Base58Check, EVM/EIP55 and Solana encoding. All wallet changes are authenticated, CSRF protected, vendor scoped and audited with before/after public receiving-address snapshots.
- The backend wallet-setup guard blocks vendor order and other portal APIs until setup; authentication, security and settings stay accessible. The frontend gate fails closed on loading/error and reloads orders after the first wallet save.
- Admin selects a vendor, current saved wallet, distinct unpaid/nonstale submissions, actual crypto amount, TXID and optional date/note. The review screen confirms exact destinations and selected orders before saving. Server locks and validates sources and computes the USD supplier total using integer cents.
- Payments are manual declarations of externally sent funds, not transfers or automatic blockchain verification. Receipt snapshots preserve the destination and per-order USD allocation. Native ETH and ERC-20 rails share a canonical transaction identity, enforced in both locks and a database unique index. Active allocations prevent paying an order twice.
- Vendors see their own receipt history in Settings. Voiding requires Admin and a reason; history is retained and active allocations released. Recall is blocked for a paid submission until its record is voided.

Verification: backend validation/auth/domain tests, vendor UI gate/settings tests, admin review/void/error tests, rollback PostgreSQL wallet/ledger tests, a real-source order payment/void/recall fixture, and browser wallet-to-payment review flow. Tests never send funds or persist synthetic receipts. Full repository typechecks retain unrelated existing errors; focused production changes have no reported type errors.
