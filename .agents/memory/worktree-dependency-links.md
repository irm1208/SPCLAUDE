---
name: Worktree dependency links
description: Package resolution behavior when testing code from an isolated Git worktree.
---

**Rule:** Do not assume the main workspace's `node_modules` makes package-level workspace links available inside a Git worktree. Confirm that the worktree's package dependencies and workspace aliases resolve before interpreting API-test import failures as code failures.

**Why:** A route test from an isolated worktree could not resolve a workspace database subpath even though the same test launched from the main workspace. A frontend package test did run successfully from the worktree, so resolution can differ by package.

**How to apply:** Before API verification in a new worktree, set up or verify that worktree's package dependencies using the package-management guidance. A main-workspace baseline can confirm unchanged source behavior, but it does not prove the worktree's module links are configured.