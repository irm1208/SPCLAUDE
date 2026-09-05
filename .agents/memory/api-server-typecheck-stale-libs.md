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

## Same trap with lib/api-client-react (frontend artifact)

`@workspace/api-client-react` is also `composite` + `emitDeclarationOnly` and is
referenced by the frontend artifact (`peps-anonymous`). When its `dist/*.d.ts` is
stale/missing, the artifact typecheck shows a distinctive **cascade**:
- `TS6305: Output file '.../lib/api-client-react/dist/index.d.ts' has not been built
  from source file ...` on the import line, PLUS
- `TS7006 implicitly has an 'any' type` on every `.map/.find/.filter` callback over
  data returned by the generated query hooks (e.g. `products`, `deliveryMethods`) —
  because the hooks lose their types, their array elements become `any`.

These are NOT bugs in the component; they vanish once the lib is built.

**Gotcha:** root `tsc --build` (`typecheck:libs`) may report exit 0 yet leave
`api-client-react/dist` stale (stale/incorrect `.tsbuildinfo` → build thinks it's
up to date). Force it:
`pnpm exec tsc --build lib/api-client-react/tsconfig.json --force`, then re-run the
artifact `tsc --noEmit`. **Why:** this cost real debugging time — the TS7006s look
like they were introduced by an edit but are pure stale-dist cascade.

This incremental-output trap also affects the API's DB declarations. If a normal
library build succeeds but artifact checks still cascade with missing declaration
outputs, use `pnpm exec tsc --build --force` before classifying the errors as
pre-existing or changing application types.
