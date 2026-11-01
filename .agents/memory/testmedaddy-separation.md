---
name: Testmedaddy separation
description: User-required product/domain separation and approved initial Testmedaddy core-release scope.
---

All three websites must stay separate: `pepsanonymous.com` must open Peps
Anonymous, `saltandpeps.co.uk` must open Salt & Peps, and `testmedaddy.com`
must open Testmedaddy. None should overlap or show another site's pages.

**Why:** The user explicitly requested these domain mappings and reiterated
that all three websites must have no overlap.

**How to apply:** Preserve separate branding and entry points. Do not treat
Testmedaddy as a Salt & Peps page or show the Salt & Peps frontend on its domain.

The user selected **“Separate websites, shared publishing.”** Keep a single
publishing operation; separate projects and databases were not requested.

**Why:** The user explicitly chose shared publishing when asked how separate
the sites should be.

**How to apply:** Use one hostname-aware production entry point, not competing
generic root static handlers. Root static handlers selected only by path bypass
domain separation when multiple custom domains share one deployment.

Editor preview paths must be unique, even though both public sites use `/` on
their respective domains. A preview-only path prefix must not become the
Testmedaddy public URL.

**Why:** Artifact validation rejects duplicate preview paths; public hostname
routing and editor preview routing are separate concerns.

**How to apply:** Preserve the Testmedaddy preview prefix only for development;
build its public site at the domain root.

For the initial Testmedaddy backend, the user chose **“Login and core pool
workflow”**, not all existing screen features. Joining records interest only;
it is not a payment or proof of funding.

**Why:** The user selected the core option after being told that payments,
proof uploads, lab results and Telegram require a later backend phase.

**How to apply:** Keep advanced features unavailable until explicitly connected
and verified. Never describe core membership as paid, confirmed on-chain or
funded. Preserve independent Testmedaddy identities rather than reusing Salt &
Peps member accounts.
