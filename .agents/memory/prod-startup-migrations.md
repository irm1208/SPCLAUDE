---
name: Production schema ownership
description: Keep PostgreSQL schema changes owned by Drizzle and Replit Publish, not application startup.
---

# Production schema ownership

New schema changes belong only in the Drizzle schema and flow to production through Replit Publish. Do not add new `CREATE TABLE`, `ALTER TABLE`, constraints, or indexes to the application startup path.

**Why:** Dual-owning admin 2FA tables in Drizzle and startup DDL gave development and production identical foreign keys with different names. Publish then tried to drop and recreate four valid constraints and failed during promotion.

**How to apply:** Define tables, indexes, constraints, and delete/update actions in the Drizzle schema; apply the normal development database push; inspect the publish schema diff; then publish. Treat existing startup DDL as legacy migration debt, not a pattern to copy.

Before approving a publish diff, investigate any unexpected drop or truncate. A safe additive change should not silently remove production structure or data.

Never perform payment-balance reconciliation at startup. Schema rollout and settlement-state mutation are separate concerns.