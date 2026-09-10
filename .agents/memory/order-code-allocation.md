---
name: Order code allocation
description: Durable concurrency constraint for allocating human-facing order codes across normal and shared-order creation paths.
---

Shared-order materialisation serializes its `max(code)+1` allocation with a transaction-scoped PostgreSQL advisory lock. This protects concurrent shared-order locks, but ordinary order creation uses a separate unsynchronized allocator, so duplicate codes remain possible across the two flows.

**Why:** Human-facing order codes are used for lookup and fulfilment. Without one database-authoritative allocator shared by every creation path, concurrent writers can persist the same code.

**How to apply:** Any future work on order creation or code allocation should replace all `max(code)+1` writers with one database sequence or locked counter (plus a uniqueness constraint and retry/migration plan), rather than adding flow-specific mutexes.