---
name: Standalone crypto checkout boundary
description: Distribution and isolation requirements for Open Crypto Checkout.
---

Open Crypto Checkout must remain a standalone, independently installable package intended for transfer to another project. Do not merge or couple its source into the Peps application.

**Why:** The user intends to give the package to someone working in a different project. It must not inherit Peps branding, routes, schemas, data, wallets, secrets, deployment configuration, or database connectivity.

**How to apply:** Preserve the isolated worktree and downloadable source archive. Future changes must be made within the standalone package and re-run its boundary/archive checks before redistribution.