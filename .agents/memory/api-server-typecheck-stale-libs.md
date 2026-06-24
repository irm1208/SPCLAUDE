---
name: api-server typecheck reads stale lib declarations
description: Why per-artifact typecheck reports phantom "property does not exist" on schema columns that actually exist, and how to fix it.
---

# Artifact typecheck uses stale lib/db (lib/api-zod) declarations

Artifacts (e.g. `@workspace/api-server`) typecheck via TS project `references` to
`lib/db` and `lib/api-zod`. Those lib tsconfigs are `composite` + `emitDeclarationOnly`,
emitting `dist/*.d.ts`. A per-artifact `tsc -p tsconfig.json --noEmit` reads the
referenced project's **emitted `dist/*.d.ts`**, NOT the lib's live `src`.

**Symptom:** after adding/changing a column in `lib/db/src/schema/*.ts`, the artifact
typecheck reports `Property 'X' does not exist on type` for that column — even though
the code is correct.

**Why runtime still works:** `@workspace/db` package `exports` map points at
`./src/index.ts`, and dev runs under `tsx`, so the running server reads live source and
the column exists at runtime. Only the *type-level* `dist/*.d.ts` is stale.

**Fix:** regenerate lib declarations before per-artifact typecheck:
- `pnpm run typecheck:libs` (root) which runs `tsc --build`, OR `tsc --build` directly.
- Then `pnpm --filter @workspace/<artifact> run typecheck` is clean.

**How to apply:** any time you edit `lib/db` or `lib/api-zod` source and then see a
"does not exist" type error in an artifact for something you just added, run
`typecheck:libs` first before assuming your change is wrong.
