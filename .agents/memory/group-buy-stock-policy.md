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

**Why:** The user approved this member-confirmation process for unpaid, organiser-owned-stock group buys.

**How to apply:** Preserve that consent boundary in future bulk-edit, notification and payment work.
