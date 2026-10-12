# Group-buy order merging

## Approved scope

- Manual merging in Admin and both original and V2 organiser Orders tabs.
- Selected orders must belong to the same account and group buy.
- Only unpaid, unprocessed orders are eligible.
- Delivery and vendor shipping must each become one charge, rather than the sum of charges on the selected orders.
- Show a preview and require confirmation. Retain originals in history.

## Selection and preview

Add “Merge selected orders” to the existing order-selection controls. Require at least two selected orders. The server validates the complete selection; it never silently drops ineligible orders.

The preview shows original order codes, account, combined items and quantities, product subtotal, delivery, vendor shipping, other existing fees, tips, coupons, credits, and the resulting amount payable.

Choose a main order to supply the delivery method, address and routing. Default both single shipping charges from that order. Both shipping amounts are editable in the preview: an old shipping quote might not cover the combined parcel, and a quantity-based vendor charge is not necessarily a duplicated flat fee.

The final confirmation names the original orders and shows the exact resulting charges. A changed selection, main order or shipping amount requires an updated server preview.

## Financial rules

Preserve historical product prices; do not use current catalogue prices. Add the quantities actually ordered. Identical-looking orders are not automatically assumed to be accidental duplicates.

Preserve all charges other than the two shipping amounts explicitly selected in the preview. Preserve existing credits and coupon deductions without spending credits again or redeeming coupons again.

Never permit a negative payable amount or silently discard excess credits. If fee reductions make applied credits exceed the recomputed total, block confirmation until the credit allocation is explicitly reconciled.

Do not merge orders with payment evidence, payment verification in progress, an outstanding balance, an active refund, existing shipment/dispatch records, a wholesale-share relationship, or a paid-parent addition relationship. These require separate reconciliation.

Require compatible delivery destinations and routing. Preserve relevant customer notes and fulfilment instructions.

## Persistence and concurrency

Use one database transaction for the final operation. Lock the group-buy stock scope and all selected order rows in stable order; recheck ownership, eligibility, amounts, contents and destinations against the confirmed preview.

Create one active merged order and archive the original orders with a durable link to it. Retain original line items, financial values, coupon-redemption history and credit-transaction history.

An archived source must never be independently restored, paid, edited or dispatched. It must not be removed by the ordinary deleted-order cleanup job. All active order, stock, shipping, fulfilment and revenue calculations must count the merged items only once.

Payment-verification callbacks that began against an original order before merging must not confirm the merged order or reactivate an archived source. The merged order starts with fresh payment-lock data.

Reject stale previews, concurrent changes and partial operations. Repeated confirmation must not create another merged order.

## UI after completion

Refresh the order list, totals and multiple-order highlighting. Clear the selection and link to the active merged order. Provide a history view listing the source orders and the financial changes.

Show server validation errors without losing the selection. Prevent repeated confirmation while a request is running.

## Verification

Test eligibility and ownership across accounts/groups/roles; fees charged once; preserved prices, coupon usage and credit balances; negative-total rejection; stale previews; retry safety; concurrent payment attempts; retained history and blocked source restoration; unchanged aggregate stock; and selection/preview/completion in all three UI paths.
