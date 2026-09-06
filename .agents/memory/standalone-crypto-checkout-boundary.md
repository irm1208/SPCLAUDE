---
name: Standalone crypto checkout boundary
description: Distribution and isolation requirements for Open Crypto Checkout.
---

Open Crypto Checkout must remain a standalone, independently installable package intended for transfer to another project. It may be stored in the main repository as its own artifact, but must not be coupled to the Peps application.

**Why:** The user intends to give the package to someone working in a different project. It must not inherit Peps branding, routes, schemas, data, wallets, secrets, deployment configuration, or database connectivity.

**How to apply:** Keep changes within the standalone artifact, retain the downloadable source archive, and re-run its boundary/archive checks before redistribution. Do not add Peps imports, data, configuration, branding, or runtime dependencies.