---
name: Shared-order active membership invariant
description: Defines when a materialised wholesale shared order is operationally active and how removal and repair must preserve payment safety.
---

An active `wholesale_shared` order must have a `wholesale_share_members` row whose order reference points to that exact order ID. Removing a member must cancel and soft-delete their linked unpaid order in the same transaction before deleting membership.

**Why:** A locked share can be reopened after orders are materialised. Deleting only the roster row leaves an apparently active buyer order that continues into Admin and FS3 operations.

**How to apply:** Gate Admin and FS3 operational queries with a NULL-safe rule that preserves ordinary orders but requires exact membership for shared orders. Historical repair must recheck orphan status atomically during the update, auto-repair only unpaid orders, and leave payment-started or refund-active orders for review.