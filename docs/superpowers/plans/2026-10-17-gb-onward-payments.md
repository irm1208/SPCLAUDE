# Group-buy onward-delivery payment requests

## Approved scope
Existing GB orders, including closed GBs, can receive a separate reshipper-owned onward delivery charge. No product total, paid flag, vendor shipping, credit, coupon, fulfilment status or product payment lock is modified. The reshipper supplies a separate onward wallet and chooses manual confirmation (default) or automatic blockchain verification.

## Implementation
1. Add tested pure rules for wallet/rail validation, amounts, transaction identities, request state transitions and automatic-verification decisions.
2. Persist settings by stable GB reshipper assignment and request ledgers by order ID in the existing database configuration store. Serialize mutations with the order row lock; transaction claims use the configuration key primary key. Keep request and rejected-attempt history.
3. Implement authenticated reshipper request/settings/list/confirmation/cancellation APIs and member read/submit/verify APIs. Resolve assignment and membership authoritatively, enforce owner privacy and stale-assignment guards.
4. Lock request amount, fiat-to-crypto quote, delivery method, wallet and automatic/manual mode at creation. Never use a global/product wallet as fallback. Reuse existing live pricing and blockchain verifiers, with 1% tolerance and minimum confirmation/amount/recipient checks.
5. Build focused frontend components for reshipper settings/requests and customer order payment. Mount without rewriting existing order or reshipper functionality. Admin/organiser can inspect, not change the reshipper's wallet.
6. Retry automatic pending requests through the existing scheduler conventions. Manual confirmation/rejection remains available. Audit financial transitions after commit.
7. Run rule, HTTP boundary and transactional database tests; compile backend/frontend, restart only Start application, inspect readiness and public preview. Publishing remains a user action.

## Safety
At most one non-cancelled request per order. Creation retries use a client idempotency key. Paid requests cannot be cancelled or overwritten. Pending submissions cannot have amount/wallet edits. Claim identities include canonical chain and transaction, not token symbol. Reusing a product/balance/test transaction for onward delivery is forbidden. Reassignment must not expose an old reshipper's payment proof to the new reshipper or let them confirm it. Network verification happens outside locks; confirmation rechecks request and transaction identity under the lock.

## Verification
Cover closed GB requests, EU destinations and >25-kit manual quotes, money validation, invalid wallets/rails, immutable snapshots, duplicate requests/transactions, concurrent submissions/confirmations, manual vs automatic mode, insufficient/unsupported/unconfirmed blockchain results, foreign order access, assignment removal/reassignment, and original order money/status unchanged.
