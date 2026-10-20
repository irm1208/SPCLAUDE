---
name: Node 20 TypeScript test runner
description: Running TypeScript tests in this Replit runtime.
---

**Rule:** In this workspace, use `pnpm exec tsx --test` rather than native `node --experimental-strip-types`; the Replit runtime is Node 20 and rejects that flag.

**Why:** A worktree baseline test failed before execution because Node 20 does not support the flag.

**How to apply:** For TypeScript test commands in the workspace or a worktree, use the package's `tsx` runner after ensuring the pnpm workspace module links are present.
