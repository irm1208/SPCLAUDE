---
name: Member order receipt policy
description: Scope and eligibility approved for members marking orders as received.
---

Members may mark their own group-buy, wholesale and shared orders as received, but only once the order is marked shipped.

**Why:** The user explicitly selected all order types and approved shipped-only eligibility.

**How to apply:** Keep the action individual to the member's order. Receipt confirmation must not imply that other shared-order members received their parcels or that any payment was received.

Members want a small Received action directly on My Orders, not only inside order details. Show Received when completion has a saved member receipt; do not relabel unrelated completed orders.

**Why:** The user selected “Members’ My Orders page—for their own delivered orders” and requested that the order show as received.

**How to apply:** Reuse the existing authenticated receipt operation and shipped-only eligibility. Preserve the canonical Completed lifecycle plus receipt timestamp; use that timestamp to distinguish Received in member-facing labels. Do not conflate receipt with reversible personal list archiving.

My Orders cards should have one **Received / Completed** receipt action, not an additional **Mark as completed** footer button. Personal-list management stays in the three-dot menu.

**Why:** The user requested removing the duplicate footer action while keeping Received/Completed.

**How to apply:** Keep receipt confirmation and personal-list archiving separate; do not restore the redundant footer button.
