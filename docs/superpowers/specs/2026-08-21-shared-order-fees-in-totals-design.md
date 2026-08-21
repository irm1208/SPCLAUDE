# Shared Order Fees in Order Totals — Design

## Decision

Organiser fees on shared wholesale orders are platform-collected order charges. They are included in each applicable member order’s itemised total and payment amount, regardless of whether the member pays the platform wallet or an organiser wallet.

This applies to:

- all shared orders created or locked after the change;
- currently open shared orders when they are later locked;
- currently locked shared orders, including `FCZ9YE`.

Cancelled, submitted, and completed historical shares are not retroactively billed.

The existing exemptions remain: the organiser and designated parcel recipient are not charged an organiser fee. When they are the same person, there is one exempt member.

## Financial model

### Fee snapshot and order total

`wholesale_share_members.organiser_fee` remains the server-owned resolved fee for a member. At lock time, its effective value is copied to a new `orders.organiser_fee` snapshot and the materialised order total is:

```
product subtotal
+ vendor-shipping share
+ tip
+ per-kit fee
+ admin adjustment fee
+ organiser fee
= grand total
```

The order must expose an itemised “Organiser fee” line so a member can see why the amount changed.

### Wallet routing

The member’s payable order amount always includes the organiser fee:

- **Platform wallet:** the platform receives the complete member order total, including the fee.
- **Organiser wallet:** the organiser receives the complete member order total, including the fee. Their required onward payment to the platform remains product subtotal plus vendor shipping only, so they retain the organiser-fee portion.

The old separate fee card, manual “fee paid” state, and manual payee confirmation are removed from the collection flow. A confirmed order payment is the source of truth for the included fee.

### Existing confirmed orders

Never relabel an existing confirmed payment as unpaid. When a locked share is reconciled or an authenticated admin changes a locked organiser fee:

1. update the order’s organiser-fee snapshot and grand total;
2. calculate the fee delta compared with the old snapshot;
3. add only that positive delta to `orders.amount_due`;
4. reset any non-final balance-payment state so the member can submit the new balance;
5. preserve the original confirmed order payment and its recorded amount.

For `FCZ9YE`, four unpaid applicable orders receive the $10 in their normal total. Three confirmed applicable orders receive a $10 outstanding balance. The organiser/recipient order remains exempt.

## Server design

1. Add `orders.organiser_fee numeric(10,2) NOT NULL DEFAULT 0` to the Drizzle schema and Publish-managed migration.
2. Centralise shared-order total calculation in a small server helper that accepts subtotal, shipping share, tip, kit fees, admin adjustment fee, and organiser fee. Every lock and locked-admin-reconciliation path uses it.
3. Update the lock transaction to copy the effective member organiser fee onto each order and include it in `grand_total`.
4. Update the locked admin fee-edit path to update the matching materialised order in the same transaction. Unpaid orders receive the new normal total and reset any locked crypto rate. Confirmed orders receive only the delta in `amount_due`.
5. Add a protected, idempotent admin reconciliation action for a single locked share. It recalculates all member order snapshots and balances from the resolved member fee. It rejects any status other than `locked`.
6. Use the action after publication for `FCZ9YE`. It is safe to run repeatedly and must not change an order twice when the fee snapshot already matches.
7. Update the organiser-forwarding amount calculation to exclude `orders.organiser_fee`; that amount remains money owed to the platform, not money retained by the organiser.

## Client design

1. Extend the shared-order response and client types with the materialised order organiser fee and order total once locked.
2. Replace the two-payment “What You Owe” presentation with one order payment amount and an itemised organiser-fee line.
3. Remove the separate organiser payment instructions and manual fee-paid roster from the payment flow.
4. In the admin shared-order view, show the fee included in each affected order and provide the protected reconciliation action only for locked shares.
5. Invalidate/refetch the share and relevant order detail after fee edits or reconciliation so balances and totals are immediately visible.

## Error handling and invariants

- Fee amounts are always non-negative, rounded to cents, and server-resolved.
- The recipient/organiser exemption is calculated from the locked delivery recipient before any fee is copied to orders.
- A share that is cancelled, submitted, or completed cannot be reconciled or have fee totals changed.
- Existing confirmed funds are never overwritten; only the new fee delta becomes an outstanding balance.
- Any total-changing update clears a non-final locked crypto amount/rate before payment verification can use it.
- Reconciliation is transactional, status-gated, and idempotent.

## Test strategy

Test-first coverage will prove:

1. a newly locked share includes each applicable organiser fee in both the order snapshot and grand total;
2. recipient/organiser exemptions remain zero;
3. a locked unpaid order is updated to the new total once;
4. a locked confirmed order keeps its confirmed payment and receives only the fee delta as `amount_due`;
5. a second reconciliation makes no further change;
6. organiser-forwarding amount excludes the retained organiser-fee portion;
7. the shared-order UI presents one payable amount with an itemised organiser-fee line rather than a separate manual payment.