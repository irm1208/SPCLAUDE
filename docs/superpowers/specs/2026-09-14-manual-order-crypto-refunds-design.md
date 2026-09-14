# Manual and Admin-Edited Group-Buy Refunds

## Goal

Show the customer refund option on confirmed manual group-buy orders and confirmed group-buy orders whose payment evidence is no longer automatically verifiable after an Admin edit.

## Eligibility

The existing automatically verified path remains unchanged for orders with valid stored crypto payment evidence.

A second, manual-review path is available when all of the following are true:

- The order belongs to a group buy with crypto refunds enabled.
- The customer owns the order.
- The order is not deleted, cancelled, wholesale, or already refunded.
- Payment status is confirmed and a confirmation timestamp exists.
- The current order total is positive.
- No active refund request already exists.
- Automatic payment evidence is unavailable or no longer matches because the order was created manually or edited by an Admin.

Test-confirmed orders remain ineligible.

## Customer Experience

The existing refund panel and wallet-destination form appear on eligible manual-review orders. The panel explains that the payment cannot be automatically verified and that the request requires Admin review.

Submitting the form creates a refund request with a server-owned review mode. The customer cannot choose or alter this mode.

## Admin and Payment Safety

Manual-review requests must not be treated as automatically verified payments. They remain pending until an Admin reviews the order and payment history.

The request records the current refundable amount and the reason automatic verification was unavailable. Existing duplicate-request, cancellation, ownership, amount, and refund-state safeguards continue to apply.

Orders with valid crypto evidence continue through the current verification flow without additional Admin review.

## Data Flow

1. The customer order API evaluates strict crypto eligibility first.
2. If strict evidence is missing, it evaluates the controlled manual-review criteria.
3. The API returns whether a request is allowed and whether Admin review is required.
4. The customer panel displays the appropriate explanation.
5. Refund submission repeats the eligibility decision server-side and stores the review mode.
6. Automatic processing skips manual-review requests until Admin approval.

## Testing

- A confirmed manual group-buy order shows the refund option and creates an Admin-review request.
- A confirmed Admin-edited group-buy order with missing or mismatched crypto evidence does the same.
- A normal crypto-paid order continues using automatic verification.
- Test-confirmed, cancelled, deleted, wholesale, zero-total, disabled-group, already-refunded, and active-request orders remain blocked.
- The customer cannot forge the review mode or bypass Admin review.