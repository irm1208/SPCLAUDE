---
name: Artifact runtime dependencies
description: Why a successful production build can still fail when the artifact server starts.
---

New server dependencies imported at startup should be bundled into the production API output unless their availability in the published artifact has been verified. A manifest dependency and a successful local compile are not sufficient proof.

**Why:** In artifact-mode publishing, a build succeeded and the image was pushed, but the API failed its startup health check because an externalized package could not be resolved at runtime. The development workspace had the package installed, hiding the issue.

**How to apply:** When adding a startup import, inspect the server bundler's external-dependency rules and the compiled output for bare runtime imports. Verify the artifact can resolve those imports before treating a publish build as ready.