---
name: Shared-order confirmation commitment
description: Rules for enforcing participants' ready-to-pay confirmation before shared wholesale locks.
---

Each current shared-order member, including the organiser, must explicitly confirm the exact draft they intend to pay for before a lock can succeed. A lock must check confirmations both before work begins and again after it has row-locked the members.

**Why:** A confirmation that is not tied to the current draft can let an organiser lock changed items or fees without the member's renewed readiness to pay. Concurrent removal and delivery changes can otherwise also leave a removed participant selected as recipient.

**How to apply:** Clear only the affected member's confirmation whenever an open-order item/tip draft changes, including administrator adjustments, and clear all confirmations when a locked share is reopened. Removal must lock and reread the parent/member, require the member remains unconfirmed, and derive delivery ownership from that locked parent; delivery assignment must require the recipient is still a member.