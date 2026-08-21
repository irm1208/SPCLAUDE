---
name: Mockup registry Git churn
description: Prevent generated mockup registry order changes from leaving the repository dirty and blocking Git sync.
---

The mockup registry generator must sort discovered mockup file paths before writing its tracked output. The filesystem order returned by fast-glob is not stable enough to treat as source order.

**Why:** More than one preview-server process can exist during workflow restarts. Without a stable sort, each process can rewrite the generated registry in a different valid order, leaving a perpetual modified file. Git pulls then refuse to proceed or leave a rebase state behind.

**How to apply:** Keep the generator's discovery list sorted, commit the matching generated file, and ensure only one mockup preview workflow is running before diagnosing any remaining Git dirtiness. Do not mask the generated file with assume-unchanged as a long-term fix.