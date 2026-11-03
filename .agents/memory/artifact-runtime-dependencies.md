---
name: Artifact runtime dependencies
description: Why a successful production build can still fail when the artifact server starts.
---

New server dependencies imported at startup should be bundled into the production API output unless their availability in the published artifact has been verified. A manifest dependency and a successful local compile are not sufficient proof.

**Why:** In artifact-mode publishing, a build succeeded and the image was pushed, but the API failed its startup health check because an externalized package could not be resolved at runtime. The development workspace had the package installed, hiding the issue. Native modules have a second trap: bundling their JavaScript does not include platform-specific `.node` and shared-library files, while broad `node_modules/` deployment excludes can strip copied runtime assets even under `dist`.

**How to apply:** When adding a startup import, inspect the server bundler's external-dependency rules and the compiled output for bare runtime imports. For native packages, package the matching platform binaries outside ignored `node_modules` directories and supply a runtime module lookup path; test the compiled bundle in a fresh subprocess. Verify the published artifact can resolve those assets before treating a publish build as ready.

A fresh subprocess launched inside the workspace is not an isolated packaging
check: Node can still resolve dependencies from parent `node_modules` folders.
Load the compiled bundle outside the workspace and permit only explicitly
shipped runtime assets.

**Why:** A production API compiled and ran in development but failed its publish
startup check because an externalized crypto dependency was absent from the
artifact. Moving the unchanged bundle outside the workspace reproduced the exact
missing-module error and stack location.

**How to apply:** Keep a standalone-bundle import check alongside build checks.
Stop before database bootstrap so this verification cannot change application
data or trigger production integrations.