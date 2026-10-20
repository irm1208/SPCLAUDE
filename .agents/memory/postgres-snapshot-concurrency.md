---
name: PostgreSQL snapshot concurrency
description: JSONB snapshot hashing and timestamp precision pitfalls in durable queues.
---

Canonicalize object keys recursively before hashing snapshots that are stored as JSONB. Preserve array ordering intentionally.

**Why:** PostgreSQL JSONB changes object-key ordering. Hashing plain JSON.stringify output made an unchanged supplier snapshot falsely report material changes after reading it back.

**How to apply:** Use semantic canonical hashes for preview tokens and immutable snapshot comparisons, and include a JSONB round-trip test.

Use an integer generation or state transition for outbox claim compare-and-swap rather than comparing a PostgreSQL-generated timestamp to its JavaScript Date round trip.

**Why:** PostgreSQL default now() retains microseconds that JavaScript Date truncates. Timestamp equality prevented a pending readiness alert from ever being claimed.

**How to apply:** Atomically compare the generation/state and check that the delivery is due, then increment the generation when claiming. Test claims against real PostgreSQL, not only mocks.
