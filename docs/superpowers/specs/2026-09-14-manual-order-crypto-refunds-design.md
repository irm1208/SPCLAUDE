# Manual and Admin-Edited Group-Buy Refunds

## Goal

Show the normal customer refund option on every confirmed paid group-buy order, including manual orders such as order 4687 and orders whose quantities or totals were edited by Admin after the group buy closed.

## Eligibility

Refund eligibility is available when all of the following are true:

- The order belongs to a group buy with crypto refunds enabled.
- The customer owns the order.
- The order is not deleted, cancelled, wholesale, or already refunded.
- Payment status is confirmed and a confirmation timestamp exists.
- The current order total is positive.
- No active refund request already exists.

Test-confirmed orders remain ineligible.

## Customer Experience

The existing refund panel and wallet-destination form appear on all eligible paid orders. Manual and Admin-edited orders use the same customer flow as other paid orders.

## Admin and Payment Safety

Creating a request snapshots the order's current `grandTotal` as the refund amount. This is the amount shown to the customer and processed later, including quantity increases applied by Admin after payment.

Original transaction evidence does not control visibility, request creation, or Admin/organiser completion. Existing duplicate-request, cancellation, ownership, positive-total, payment-state, and refund-state safeguards continue to apply.

## Data Flow

1. The customer order API evaluates confirmed-paid eligibility from server-owned order state.
2. The API returns whether a request is allowed and the current `grandTotal`.
3. The customer panel displays that amount.
4. Refund submission repeats eligibility under row locks and snapshots the current `grandTotal`.
5. Admin or the owning organiser processes the request through the existing flow.

## Testing

- A confirmed manual group-buy order with no transaction hash shows the refund option and creates a request.
- A confirmed Admin-edited group-buy order uses its current increased `grandTotal`.
- Credit and crypto refund processing can complete without original incoming-payment proof.
- Test-confirmed, cancelled, deleted, wholesale, zero-total, disabled-group, already-refunded, and active-request orders remain blocked.
- The customer cannot supply or override the refund amount.