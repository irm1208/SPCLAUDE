---
name: Shared-order confirmation commitment
description: Rules for enforcing participants' ready-to-pay confirmation before shared wholesale locks.
---

Each current shared-order member, including the organiser, must explicitly confirm the exact draft they intend to pay for before a lock can succeed. A lock must check confirmations both before work begins and again after it has row-locked the members.

**Why:** A confirmation that is not tied to the current draft can let an organiser lock changed items or fees without the member's renewed readiness to pay. Concurrent removal and delivery changes can otherwise also leave a removed participant selected as recipient.

**How to apply:** Clear only the affected member's confirmation whenever an open-order item/tip draft changes, including administrator adjustments, and clear all confirmations when a locked share is reopened. Removal must lock and reread the parent/member, require the member remains unconfirmed, and derive delivery ownership from that locked parent; delivery assignment must require the recipient is still a member.

Readiness confirmation must remain visible outside collapsed order details after onboarding finishes. Reflect saved items and confirmation from the authoritative mutation response, not only a later polling refresh; cancel older reads before applying that response. Unsaved local changes cannot be confirmed.

**Why:** Members reported repeatedly refreshing to find the ready button. Finishing the item-setup gate must not hide the next required action, and a pre-save poll must not replace newer readiness data.

**How to apply:** Keep the action discoverable in both setup and regular views, preserve the server's eligibility checks, and test a delayed pre-save read completing after a successful save.