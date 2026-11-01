---
name: Testmedaddy separation
description: User-required product and domain separation between Testmedaddy and Salt & Peps.
---

Testmedaddy must be separate from Salt & Peps. `saltandpeps.co.uk` must
open Salt & Peps; `testmedaddy.com` must open Testmedaddy.

**Why:** The user explicitly requested separate sites with these domain mappings.

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
