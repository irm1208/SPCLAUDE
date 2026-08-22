---
name: Deployment foreign-key action drift
description: Why a migration preview can disagree with the Drizzle schema for selected foreign keys.
---

Some deployments rename selected foreign-key constraints through direct SQL to avoid Drizzle's non-interactive create-versus-rename prompt. That SQL is an additional source of truth for the affected foreign-key actions.

**Why:** If the deploy SQL and Drizzle schema disagree, the deployment recreates the constraint with the old action and the next generated migration previews the same unwanted change again.

**How to apply:** Whenever changing an affected foreign key's delete or update action, update the Drizzle schema, the generated migration/snapshots if pending, and the direct deployment SQL together. Never apply a migration preview whose FK action does not match all three.