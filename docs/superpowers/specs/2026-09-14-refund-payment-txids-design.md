# Refund Queue Payment TXIDs

## Goal

Let Admin and the owning group-buy organiser see all recorded customer payment transaction IDs while reviewing a refund.

## Behavior

- Each refund card shows a `Payment TXID(s)` section containing the order's original payment TXID and every recorded additional or top-up payment TXID.
- Duplicate and blank values are removed while preserving the original payment TXID first.
- The outgoing refund transfer remains separate and is labelled `Refund TXID`.
- A paid manual order without a recorded transaction shows `No payment TXID recorded`.
- Payment TXIDs are added only to the protected Admin and organiser refund responses. The customer-safe refund response remains unchanged.

## Testing

- Admin and organiser list/detail responses include ordered, deduplicated payment TXIDs.
- Manual orders return an empty payment TXID list.
- Refund cards render every payment TXID and the empty-state message.
- Existing outgoing refund TXID behavior remains.