---
name: Shared-order organiser credit offset
description: How member account-credit payments affect the organiser's platform amount.
---

The organiser's platform payable for a shared wholesale order is the combined member product subtotal plus vendor shipping, less all persisted member-order creditsApplied. Tips and organiser fees remain excluded from the platform payable.

**Why:** Account credits are platform-funded payment already applied to a member order. Leaving them in the organiser's forwarding amount makes the organiser cover that portion again.

**How to apply:** Derive the offset from authenticated, persisted member orders in the organiser display and every automatic/admin confirmation amount path. Keep the credit spend itself atomic and operation-key idempotent.