---
name: Publish-safe unique identities
description: How to enforce normalized transaction uniqueness without generating malformed Replit publish migrations.
---

Do not represent normalized blockchain transaction uniqueness as a PostgreSQL functional or expression index in a Replit-managed database. Persist the canonical identity in a nullable text column and enforce it with an ordinary unique constraint.

**Why:** Replit's publish schema-diff serializer can emit malformed SQL for multi-expression indexes containing nested CASE, trim, regexp, and partial-index predicates even though PostgreSQL accepts the original index. The app build then succeeds but publishing fails while applying the generated database migration.

**How to apply:** Normalize currency, network aliases, and transaction hashes in one application helper; store the resulting identity with the payment submission; backfill historical rows before enabling the plain unique constraint; and query production read-only for collisions before publishing.