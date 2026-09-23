---
name: Deployment foreign-key action drift
description: Why a migration preview can disagree with the Drizzle schema for selected foreign keys.
---

Do not rename, create, or recreate foreign-key constraints from the deployment build script. Keep the schema as the single source of truth and let Replit's managed Publish flow apply the development-to-production diff.

**Why:** Direct deploy SQL made constraint names and actions drift from the Drizzle schema. A later publish generated six drop-and-recreate statements and failed after applying them, even though the application build itself passed.

**How to apply:** Define foreign keys only in the schema source of truth, apply development schema changes through the normal dev-side flow, inspect the publish diff, and republish. Keep deployment build commands limited to dependency installation and compilation.