---
name: Group-buy stock scope
description: Organiser stock changes are group-only; bulk quantities refer to available kits.
---
Organiser stock edits within group-buy management must affect only the selected group buy, not the shared catalogue or other group buys.

**Why:** The user explicitly chose “Only this group buy.”

**How to apply:** Keep group allocations separate from catalogue stock. Bulk set/increase/decrease controls refer to available kits and preserve quantities already ordered. Label any total-allocation editor clearly because its number includes those ordered kits.

Bulk selection must submit explicit selected product IDs, including when all loaded products are selected.

**Why:** Expanding a client selection to server-side “all” could also change products added after the organiser reviewed the catalogue.

**How to apply:** Keep “select visible” and “select all” distinct, and clear selection when switching group buys.

Order price/stock revisions with member acceptance must be optional for group-buy organisers who add their own stock, and must not affect anyone else.

**Why:** The user explicitly repeated this scope restriction.

**How to apply:** Keep the feature opt-in and scoped to the organiser's selected group buy; do not change shared catalogue stock or other organisers' order workflows.

Member-confirmed order revisions apply to unpaid orders only.

**Why:** The user explicitly chose “Unpaid orders only” when asked whether paid orders should be included.

**How to apply:** Exclude paid orders from revision requests and recheck payment eligibility when applying an accepted revision.

Order changes in this optional workflow are proposals, not immediate edits: members review before/after details and accept or decline; declined or unanswered requests leave the original order unchanged.

**Why:** The user approved this member-confirmation process for unpaid, organiser-owned-stock group buys and wants negotiated supplier prices entered manually or by CSV.

Negotiated prices must remain separate from live catalogue prices, including when a member accepts their own order's proposed price.

**Why:** Member consent is per existing unpaid order; repricing the catalogue would also affect unrelated groups or future orders without that review.

**How to apply:** CSV price updates match existing own-stock products, never create duplicates, and feed the same member-confirmation process as manual proposals.

Price proposals treat products uploaded specifically for the authorised group buy as its own stock even when their recorded uploader is missing or differs from its current organiser.

**Why:** Legacy imports and organiser changes can leave mixed product ownership within one uploaded catalogue, causing a price CSV to silently omit most of the group's products.

**How to apply:** Require group membership plus either current organiser ownership or matching source group. Keep unrelated shared-catalogue products excluded; do not rewrite uploader identities or relax unpaid-order protections.

Keep organiser product pricing and CSV controls, but hide the large order-change panel until the organiser explicitly opens the price confirmation review.

**Why:** The user chose “Keep pricing, hide this panel.”

**How to apply:** Show the order review only from “Review product price changes”; keep request history available without displaying the full editor by default.

Rejecting a new price proposal should cancel the member’s own unpaid order, including after the group buy closes. This is an explicit exception to the normal closed-group cancellation rule, not a change to older non-price requests.

**Why:** The user specifically chose “allow closed-group cancellation” for a member declining an organiser-negotiated new price. A decline that leaves the old order in place is not the desired choice.

**How to apply:** Clearly explain and confirm the whole-order cancellation. Retain paid, partially paid, supplier-batch, refund and credit-value safeguards; never cancel unrelated revision requests.

**How to apply:** Preserve that consent boundary in future bulk-edit, notification and payment work.
