---
name: Minified storage SDK AbortSignal
description: Production bundling can invalidate the signal used by Replit App Storage's transitive fetch stack.
---

Keep JavaScript class/function names in the minified API-server build when bundling the App Storage SDK.

**Why:** The bundled node-fetch v2 dependency checks `signal` using its prototype constructor's literal name `AbortSignal`. Minifying the transitive abort-controller class changes that name and every App Storage upload fails with “Expected signal to be an instanceof AbortSignal,” even while unbundled development uploads succeed.

**How to apply:** When changing production bundling/minification or storage dependencies, run the bundled signal regression test and inspect the production bundle's preserved constructor names. A development-only SDK upload does not verify the bundled production path.