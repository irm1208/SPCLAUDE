# Group Buy Refunds Design

## Goal

Add an admin-enabled refund system for group-buy orders. An eligible buyer chooses either an account-credit refund or an on-chain USDC/USDT ERC-20 refund. The refundable value is the order's server-recorded USD total. No refund state is inferred from client values.

## Scope

This feature applies only to personal orders linked to a group buy. Refunds are disabled by default for every group buy. Disabling the feature prevents new requests but never deletes or hides existing refund records.

The initial release supports:

- Account-credit refunds.
- USDC on Ethereum ERC-20.
- USDT on Ethereum ERC-20.
- Full refunds only.

It does not support partial refunds, fiat, cross-network refunds, automatic wallet broadcasting, private-key custody, or refunds for non-group-buy orders.

## Architecture

### Persisted group-buy setting

Add `cryptoRefundsEnabled` to `group_buys`, defaulting to `false`. Despite the historical name in the brief, the setting enables the complete refund feature, including the buyer's credit option.

Only an authorized admin may enable or disable the setting. Organisers may process requests in group buys they own, but cannot enable refunds.

### Dedicated refund records

Create `group_buy_refunds` rather than expanding the order's existing summary fields into a workflow table. Each record stores:

- Refund ID and order/group-buy/account linkage.
- Method: `credit` or `crypto`.
- Lifecycle status: `requested`, `verifying`, `verification_failed`, or `completed`.
- Server-snapshotted USD refund amount.
- For crypto: asset, network, destination wallet, exact base-unit amount, decimal precision, outgoing TXID, confirmation count, explorer URL, and verification error.
- Processor identity and role.
- Request, verification, failure, completion, and update timestamps.

Create a separate append-only processing-attempt table. Each attempt records the submitted TXID, processor, start/end time, result code, and privacy-safe failure reason. It must not store secrets.

Database constraints enforce supported methods, statuses, assets, networks, positive amounts, and method-specific required fields. A partial unique index permits only one active refund per order while allowing historical completed records to remain.

### Central refund service

All request creation, credit completion, crypto verification completion, rejection/failure handling, and retry transitions use focused server-side services. Completion runs in a database transaction that locks:

1. The refund.
2. The linked order.
3. The owning group buy.
4. The buyer account when credits are changed.

The service revalidates eligibility under those locks. Conditional writes make repeated and concurrent calls idempotent.

## Refund amount authority

The refundable USD value is snapshotted from the order's persisted `grandTotal` when the request is created. The client never submits an amount.

For account credits, one account credit equals one USD. The exact server-snapshotted order value is posted to the existing credit ledger and account balance. Existing credit storage and calculations must be upgraded to preserve two decimal places if they do not already do so; no rounding to whole credits is allowed.

For USDC and USDT ERC-20, the locked token amount equals the USD refund amount at the supported stablecoin one-dollar denomination. Convert the decimal USD string to exact six-decimal token base units without JavaScript floating-point arithmetic. For example, `$123.45` becomes `123450000` base units. The locked base-unit amount is immutable after request creation.

If the original confirmed payment used USDC or USDT on Ethereum ERC-20, preselect that asset. Otherwise the buyer chooses either supported asset. Unsupported original assets do not broaden the supported refund rails.

## Customer eligibility and request creation

The authenticated customer may request a refund only when all conditions hold:

- Refunds are currently enabled for the linked group buy.
- The order belongs to the authenticated account.
- The order is a non-deleted group-buy order.
- The order has a confirmed, real crypto payment.
- The stored payment transaction evidence is present and tied to that order through the existing authoritative payment-confirmation fields.
- The order is not already cancelled or refunded.
- The order has a positive server-recorded grand total.
- No active refund exists for the order.
- The selected method is supported.
- For crypto, the selected asset/network pair is supported and the destination is a valid Ethereum address.

Test-confirmed, screenshot-only, client-only, or synthetic payment states are not eligible. Client transaction fields, USD totals, rates, and amounts are ignored.

Request creation snapshots all authoritative fields in one transaction and writes an audit event. A duplicate concurrent request returns the existing active request rather than creating another.

## Customer interface

The existing group-buy order summary response includes:

- Whether the order may request a refund.
- A stable ineligibility reason code when it may not.
- The current refund record, if any.

The order summary shows **I want a refund** only when the group-buy setting is enabled and the order is otherwise eligible or already has refund history.

The form lets the buyer choose:

- **Refund to account credits**
- **Refund in crypto**

Crypto requests collect the destination Ethereum wallet and USDC/USDT ERC-20 selection. The form explains that completed on-chain transfers cannot be reversed. The customer sees requested, verifying, verification-failed, and completed states, plus the outgoing TXID and Ethereum explorer link when available.

## Admin and organiser processing

Add a refund queue within the existing group-buy administration area.

Admins may see and process all refund requests. A permitted organiser may see and process only requests whose group buy has that organiser's ID. Scope is enforced by the server on every list and mutation route, not by UI filtering.

Queue and detail responses include:

- Customer display identity.
- Order and group-buy identifiers.
- Method, requested asset/network, amount, and destination.
- Request date and current state.
- Previous privacy-safe processing attempts.
- Current validation or verification error.

### Credit processing

An authorized processor approves a credit request. One transaction:

1. Locks and revalidates the refund/order/group buy/account.
2. Adds the exact refund amount to the account credit balance.
3. Inserts one idempotent positive credit-ledger transaction linked to the refund.
4. Marks the refund completed.
5. Marks the order refund status completed, sets `refundedAt`, and changes order status to `Cancelled`.
6. Writes the audit record.

Retries return the already-completed result and never credit the account twice.

### Crypto processing

An authorized processor submits an outgoing TXID. The server:

1. Claims the refund for verification with a conditional `requested|verification_failed -> verifying` transition.
2. Records a processing attempt.
3. Independently queries Ethereum transaction and receipt data.
4. Confirms successful execution, Ethereum network, expected token contract, exact destination, exact immutable base-unit amount, and required confirmation depth.
5. Re-locks the refund and order and confirms that the same TXID/attempt still owns the verification before completion.

The server does not trust a client-provided amount, USD value, exchange rate, token contract, success flag, or confirmation count.

On verification failure, the order remains unchanged. The refund becomes `verification_failed`, stores a stable failure code and safe message, and remains available for retry.

On success, the completion transaction stores the TXID/explorer link, marks the refund completed, marks the order refunded, sets `refundedAt`, changes the order status to `Cancelled`, and writes the audit record.

Submitting the same completed TXID is idempotent. A different TXID cannot replace a completed refund. Concurrent processors cannot both own or complete the same attempt.

## Refund-sensitive mutation blocking

While a refund is `requested`, `verifying`, or `verification_failed`, block changes to:

- Order status and payment status.
- Line items, quantities, prices, and out-of-stock flags.
- Shipping, delivery, and forwarding addresses.
- Payment destination, payment transaction evidence, currency, network, rates, and locked amounts.
- Group-buy or order associations.
- Soft deletion, restoration, cancellation, and other refund-sensitive fields.

Use one reusable server-side guard and apply it to customer, admin, organiser, dispatch, bulk, and background mutation paths. UI disabling is supplementary and is never the authority.

After completion, the order remains immutable through the existing refunded/cancelled protections.

## Verification provider and confirmations

Reuse the existing server-side Ethereum token-transfer verification boundary but add a refund-specific exact-base-unit verifier. Contract addresses are server-configured constants for Ethereum USDC and USDT.

Required confirmation depth is server-configured with a safe positive default. A successful receipt without sufficient depth remains in `verifying` or returns a retryable verification result; it does not complete the refund.

The outgoing TXID must be globally bound to one refund. A database uniqueness constraint prevents replaying one transaction across different refunds.

## Notifications and audit

Use the existing notification channels for real lifecycle transitions:

- Request submitted.
- Verification begins.
- Verification fails.
- Refund completed.

Notifications use deterministic refund/status idempotency keys or a persisted notification marker so retries do not duplicate them.

Audit records include refund/order/group-buy identity, method, processor role, source, transition, stable result code, and TXID when applicable. They never include credentials or private keys.

## Error handling

API errors use stable codes for:

- Refunds disabled.
- Not owner or outside organiser scope.
- Ineligible payment evidence.
- Already cancelled/refunded.
- Active refund exists.
- Unsupported method/asset/network.
- Invalid wallet or TXID.
- Wrong token, recipient, network, or amount.
- Failed transaction.
- Insufficient confirmations.
- Concurrent state change.

Expected validation and verification failures do not partially mutate orders or balances. Unexpected failures roll back transactions, preserve retryability, and produce privacy-safe logs.

## Testing

Add focused tests for:

- Admin-only setting changes, default-off behavior, and persistence.
- Disabling without deleting history.
- Customer ownership and group-buy linkage.
- Real confirmed crypto evidence eligibility.
- Rejection of test/screenshot/client-only evidence.
- Exact server-owned USD snapshot.
- Credit versus crypto selection.
- Ethereum wallet, asset, and network validation.
- Duplicate and concurrent request prevention.
- Organiser queue scoping and admin access.
- Exact six-decimal base-unit conversion.
- Wrong token, network, recipient, amount, failed receipt, and insufficient confirmations.
- Successful crypto completion and cancellation.
- Credit-ledger atomicity and duplicate-credit prevention.
- TXID replay prevention and idempotent resubmission.
- Concurrent processor attempts.
- Mutation blocking across representative customer/admin/organiser/background paths.
- Customer status, TXID, and explorer visibility.
- Transition-only notification and audit behavior.
- Regression coverage that shared-wholesale organiser payment confirmation changes only the organiser's personal order.

Verification must rebuild shared library declarations first, run focused unit/integration/database tests, run relevant typechecks and builds, restart only the canonical application workflow, inspect logs, and render the customer and processor surfaces.

## Deployment and operational notes

Add the schema through the project's normal development schema path. Production schema changes remain part of Replit Publish; no startup-time production data migration is added.

No private keys, signing services, or automatic transaction broadcasting are introduced. Processors send refunds from their existing wallet and provide the outgoing TXID for independent verification.