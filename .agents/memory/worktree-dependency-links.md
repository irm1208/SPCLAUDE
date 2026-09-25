---
name: Worktree dependency links
description: Package resolution behavior when testing code from an isolated Git worktree.
---

**Rule:** A Git worktree may need both a root `node_modules` link (for pnpm's shared `.pnpm` store) and package-level `node_modules` links (for workspace package aliases). A package-only link can still leave `pnpm exec` unable to resolve its CLI.

**Why:** In one worktree, API tests resolved through package links while `tsx` failed because pnpm followed a CLI path into a missing worktree-root `.pnpm` store. Linking the root store as well fixed the test runner. Symlinks may not match directory-only ignore rules, so verify they are excluded locally and never staged.

**How to apply:** Before running package commands in a new worktree, verify both root-store and package-alias resolution, then check `git status` and local excludes so dependency links stay out of commits. A passing main-workspace command does not prove worktree resolution is configured.