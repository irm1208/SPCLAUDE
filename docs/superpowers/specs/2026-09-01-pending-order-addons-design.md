# Pending Order Add-ons

## Goal

An add-on submitted against a locked, paid group-buy order remains attached to the original order, but it must not appear to be paid before its incremental balance is confirmed.

## Data model

- The parent order keeps its original `paymentStatus = confirmed`.
- The order keeps the full combined `grandTotal` and an `amountDue` equal to all unpaid add-ons.
- The order stores a persisted snapshot of pending add-on line items. This is required so a refreshed page can distinguish already-paid quantities from newly-added unpaid quantities.
- Each subsequent add-on appends to the pending snapshot and increases `amountDue`.

## Customer order summary

- When `amountDue > 0`, the page must not present a single unqualified “Payment confirmed” state.
- The paid section is labelled **Original payment confirmed** and shows the paid amount (`grandTotal - amountDue`).
- Existing paid items remain in the normal Items section.
- Pending quantities appear separately under **Pending add-on — payment outstanding** with their incremental item totals.
- The order summary shows the outstanding balance and the balance-payment card.
- Refreshing reconstructs the same separation from persisted server data.

## Settlement

- Crypto, AnonPay, fiat/admin confirmation, or an explicit balance waiver promotes all pending add-on items into the paid order.
- Promotion and clearing `amountDue` happen atomically, so the page cannot show paid add-on items while retaining an outstanding balance or vice versa.
- Starting a payment session never changes the paid/unpaid classification.

## Integrity rules

- Generic order edits and refresh/load endpoints must not clear `amountDue` or pending add-on data.
- Stale balance confirmations must continue to fail if the outstanding amount changed after payment began.
- The original order code, initial payment evidence, address, delivery, routing, and fulfilment metadata remain unchanged.

## Verification

- Unit tests cover appending pending add-ons, paid/pending summary calculations, refresh persistence, and promotion after confirmation.
- API tests cover stale confirmation protection and ensure payment initialization does not settle an add-on.
- Browser verification covers a paid parent with an unpaid add-on on mobile and desktop, including a full refresh.