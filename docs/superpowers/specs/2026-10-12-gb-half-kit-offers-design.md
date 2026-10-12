# Fill remaining group-buy half kits

## Agreed business rules

1. Organiser/Admin chooses which product totals ending in `.5` to fill.
2. The organiser decides when offers are published, both before and after normal ordering closes.
3. A successful claim removes the offered half from the available list and adds `0.5` kit to the member's existing order.
4. Paid and unpaid orders are eligible. A paid order keeps its confirmed payment; only the additional amount becomes due.
5. Each offer starts at half the current group-buy kit price. Organiser/Admin may set a custom price.
6. Organiser/Admin may set optional extra delivery and vendor-shipping charges, shown before confirmation.
7. No coupons apply to the new offer. Credits may be used only if currently permitted by the group buy. Existing discounts and credits remain intact.
8. Unpaid claims remain reserved until organiser/Admin releases them manually. There is no automatic payment expiry.

## Recommended page structure

Use a dedicated, group-specific **Available half kits** page linked from the member's group-buy/order view.

In both organiser dashboards and Admin, provide **Fill half kits** management linked from the group-buy Summary. Show eligible products, total ordered, the unfilled `0.5`, publication state, editable price/extra shipping, and claim history.

Only authorised organisers for that group buy and Admin may manage offers. The member page must respect group-buy access controls.

## Member flow

- Show available offers with product/dose, `0.5 kit`, group currency, price and any extra shipping.
- Require an existing submitted, non-cancelled, not-yet-dispatched order in that group buy.
- If the member has multiple eligible orders, let them select which one receives the half; do not merge orders or automatically pick a different group buy.
- Confirm the exact item, target order, price, shipping charges, permitted credit deduction and cash amount due.
- If claimed, add the half and its charges to that existing order, remove the offer from availability, update the summary, and link to the appropriate payment screen.
- For an unpaid order, update its payable total. For a paid order, use the existing paid-order addition model and balance-payment UI, preserving the original order code and payment metadata.

## Offer eligibility and changing totals

Calculate candidates from the same active order quantities used by the real group-buy summary, not placeholder counts.

Each available offer represents one actual excess `0.5` for an exact group-buy product. Revalidate that remainder at publication and claim time. If normal order changes fill the remainder, withdraw the stale offer instead of allowing an extra half to be sold.

The offer price and additional charges are server-owned snapshots. An already-claimed offer retains its agreed amounts even if later offers use a different price.

## Persistence and financial safeguards

Store offers and claim history durably, scoped to the group buy and product. Keep identifiers linking each claim to its order and claimed line item.

Claiming is one transaction: lock the relevant group-stock/offer/order scope, validate ownership and live availability, check payment/refund/dispatch state, apply any permitted credit spend, append the half, update totals/balance, and mark the offer claimed. Reject a stale price preview or concurrent claim; never partly debit credits or update an order.

Retries must return the completed claim rather than append another half or deduct credits twice. Check credit permission inside the debit transaction.

Custom half-kit prices and extra charges must survive later normal order edits, coupon recalculation, shipping updates, and fulfilment exports. An ordinary edit must not silently remove or reprice a claimed half. Claim snapshots must remain auditable.

Do not reset confirmed primary-payment state or overwrite payment history. Reject changes while an applicable payment/refund verification is in progress, and protect delayed verification callbacks from clearing a changed balance.

Respect group-only stock limits, applicable per-member limits, and already ordered quantities. Publishing an offer does not silently override those limits or modify the shared/global product catalogue.

## Manual release

Organiser/Admin sees the claimant, order, agreed charges, credit use and payment state.

An unpaid claim may be released explicitly. Reverse only that claim's item and charges and return only credits actually spent on it, using an idempotent ledger operation. Preserve all unrelated order amounts and payment records.

Do not release a paid or currently-verifying claim as though it were unpaid. Recheck the order/payment state under lock. Handle an already-cancelled/deleted order without another credit refund.

Only make the half available again when the live group total actually has an unfilled half. Preserve claim/release history even when another member subsequently claims it.

## Verification

Cover publication before/after closing, organiser/Admin ownership, real `.5` eligibility, concurrent normal orders and competing claims, stale prices, paid/unpaid orders, multiple target orders, custom prices, optional shipping, coupons excluded, credits allowed/disabled, retry safety, manual release, payment/credit races, summary totals and stock, reload persistence, and controls in both organiser dashboards plus Admin.

## Outside the initial scope

- New orders for people without an eligible existing order, or a separate delivery for already-dispatched orders.
- Automatic expiry, automatic publication, and automatic community announcements.
- Partial refunds for already-paid half-kit claims; these need a separate financial reconciliation flow.
