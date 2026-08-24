# Shared-order organiser payment transaction visibility

## Goal

On the shared wholesale order overview, let the organiser see each member's
payment transaction IDs and the amount received for both payment stages:

- Test payment
- Remaining payment

The information must be visible only to the organiser of that shared order.
Other members must not receive these payment identifiers in the shared-order
response.

## Recommended approach

Extend the existing `buildShareResponse` member payload rather than adding a
new endpoint. The server already loads each materialised member order for the
locked/submitted payment roster and already knows whether the current viewer is
the organiser.

Each member will receive an organiser-only payment transaction object, or no
payment transaction data for non-organisers. The object will contain:

- Test transaction ID and received amount, when a test transaction exists.
- Remaining transaction ID and received amount, when a remaining transaction
  exists.
- The payment currency when available, so the amount is not ambiguous.

The UI will render these values inside each organiser-only member payment row,
beside the existing payment status. IDs will be full, selectable monospace
text, with clear labels and a readable unavailable state when a stage has no
transaction.

## Amount rules

- Test payment amount: the stored `paymentTestAmount`.
- Remaining payment amount: the stored `paymentUsdAmount` when present.
- Legacy fallback for a remaining payment: `grandTotal - paymentTestAmount`
  when a test payment exists and no explicit remaining amount was stored.
- If no amount can be determined, show the transaction ID but omit a fabricated
  amount.

These values are display-only. This change must not alter payment status,
verification, totals, or any order data.

## Data flow and access control

1. `buildShareResponse` loads member orders as it does for the existing
   locked/submitted payment roster.
2. For each member, it derives the two payment stages from the order's stored
   transaction and amount fields.
3. It includes the payment transaction data only when `isCreatorViewer` is
   true.
4. The frontend type mirrors the optional organiser-only response shape.
5. The organiser overview renders the data; participant views remain unchanged
   because the server response omits the sensitive fields.

The organiser's separate platform payment remains a separate section and is
not mixed into member payment rows.

## Testing

- Add a backend regression test that asserts the member response contains the
  organiser-only transaction fields and amount rules.
- Add a backend regression test that keeps those fields gated on the organiser
  viewer.
- Add a frontend source/markup test for the two labels and received amounts in
  the member payment roster.
- Run the targeted tests, full API tests, API compile, and frontend production
  build.

## Error and empty states

- Missing test or remaining transaction IDs are shown as not submitted rather
  than inferred from payment status.
- Missing amounts never fall back to a guessed value.
- Existing member payment status and manual mark-payment actions continue to
  work independently of the transaction details.