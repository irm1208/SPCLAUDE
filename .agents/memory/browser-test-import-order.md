---
name: Browser test import order
description: Node JSX runtime and browser-global import ordering can cause test-only failures.
---

Related test-environment notes:
- [Chromium on Nix](browser-runner-environment.md)
- [API fixture routing](browser-api-fixture-routing.md)
- [Node 20 TypeScript runner](node20-tsx-test-runner.md)

In the node/tsx test harness, initialize the jsdom browser globals before importing browser-only routing and portal libraries.

Vitest's automatic jsdom environment cannot resolve the workspace's transitive jsdom installation even though the package exists.

**Why:** jsdom is available through pnpm's versioned package directory but not as a top-level resolvable dependency for the Vitest worker.

**How to apply:** Follow the existing browser tests' explicit JSDOM import and manual global setup; dynamically import browser-dependent modules afterwards. Do not add a production dependency just to enable a test environment.

**Why:** Radix captures document availability when its layout-effect module first loads; an early import permanently selects a no-op effect and its portal stays empty. Wouter likewise installs its history event patch only if the browser globals already exist.

**How to apply:** Dynamically import these libraries after DOM setup in node tests. A missing dialog without a render error can be a test initialization issue rather than an app defect. For Wouter links, also expose global location/history and bind global addEventListener/removeEventListener to the same jsdom window. Otherwise the page renders but crashes when its location subscription mounts.

Vitest’s built-in jsdom environment resolves its dependency from the root runner, not the frontend artifact.

**Why:** A browser test failed to start although the workspace had a usable jsdom dependency for its existing manual test harness.

**How to apply:** Reuse the manual DOM setup when the root runner cannot resolve jsdom. Supply location/history and global event listeners before importing Wouter, not just window/document.

Treat `React is not defined` in node/tsx JSX tests as a possible harness mismatch before changing production components.

**Why:** The test runner can emit classic JSX for the project's preserve setting while Vite uses the automatic runtime; a functioning browser UI can therefore fail only in tests.

**How to apply:** Supply the React namespace in the test process, following the existing JSX tests. Do not rewrite production imports, change Vite configuration, or install dependencies merely to fix that test-only mismatch.
