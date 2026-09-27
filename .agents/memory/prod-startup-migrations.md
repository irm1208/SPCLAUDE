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

## Failed publish after schema application

A publish can fail after its database migration has already applied. Before retrying or changing code, compare the read-only production columns with the publish schema diff; a zero diff means the migration is already present, even if the build is marked failed.

**Why:** One publish compiled and pushed its image, logged additive migration statements, then failed without an application error. Production already had every new column, and the development-to-production diff was empty.

**How to apply:** Separate compile, schema application, and service promotion in the build history. Never manually replay the migration; if no code error or runtime log appears, retry publishing once and investigate the new failure if it recurs.