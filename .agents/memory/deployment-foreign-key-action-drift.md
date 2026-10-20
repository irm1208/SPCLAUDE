---
name: Deployment foreign-key action drift
description: Why a migration preview can disagree with the Drizzle schema for selected foreign keys.
---

Do not rename, create, or recreate foreign-key constraints from the deployment build script. Keep the schema as the single source of truth and let Replit's managed Publish flow apply the development-to-production diff.

**Why:** Direct deploy SQL made constraint names and actions drift from the Drizzle schema. A later publish generated six drop-and-recreate statements and failed after applying them, even though the application build itself passed.

**How to apply:** Define foreign keys only in the schema source of truth, apply development schema changes through the normal dev-side flow, inspect the publish diff, and republish. Keep deployment build commands limited to dependency installation and compilation.

Development DDL must give implicit foreign keys the same names that the ORM generates, rather than relying on PostgreSQL's default `_fkey` names.

**Why:** Managed publishing can install equivalent constraints under ORM-style names. PostgreSQL-default names in development then produce repeated drop/recreate diffs even when referenced columns and update/delete actions match exactly. A failed publish can already have installed the new table and constraints.

**How to apply:** Compare constraint definitions in both environments before repairing anything. Align only the development names to the schema's canonical names, without dropping constraints or changing their actions, then confirm the read-only publish diff is empty. Never repeat these repairs from build/startup hooks or against production.