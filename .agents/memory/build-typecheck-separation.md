---
name: Build vs typecheck separation
description: Why the build script was decoupled from typecheck, and the recurring type compatibility issues to be aware of.
---

# Build vs typecheck separation

## Rule
`pnpm run build` in `Product-Landing-Page/package.json` does NOT run typecheck.
Typecheck runs via `pnpm run check` (separate) or `pnpm run typecheck`.

**Why:** The codebase has accumulated pre-existing TypeScript errors in newer route files
(Express 5 `req.params` typing, drizzle-zod/zod v4 mismatch, Gemini shim types, etc.).
These do not affect runtime because vite and esbuild compile without tsc. Gating deploys
on typecheck meant the app couldn't be published.

**How to apply:** If you add new routes/files with type errors, the build will still succeed.
Run `pnpm run check` separately to audit type health. Do not re-add typecheck to the `build` script.

## Known recurring type issues

### drizzle-zod / zod v4 mismatch
`zod@3.25+` is Zod v4 internally; `drizzle-zod@0.7.1` was built against Zod v3.
`.extend({...})` on a `createInsertSchema` result requires `as any` cast on the object arg.
Fix: `.extend({ field: z.string() } as any)`.

### Express 5 req.params
`@types/express@5.x` types `req.params` as `Record<string, string | string[]>` in some contexts.
Use `req.params.id as string` for any param used in Drizzle `eq()` or passed to string-typed functions.
This is prevalent in newer route files; the global namespace augmentation in `src/types/express.d.ts`
does NOT suppress it (Express 5 uses module-based types, not the global `Express` namespace).

### api-zod duplicate exports
`lib/api-zod/src/generated/types/index.ts` must NOT re-export names that `api.ts` already exports
as Zod schemas (currently removed: adminAddLabTestBody, adminUpdateLabTestBody, adminUpdateTicketStatusBody).
If `pnpm codegen` is re-run, these 3 lines will be re-added — remove them again.

### Orval / Zod runtime compatibility
Orval 8.27 can emit Zod 4 root validators (`zod.int()` and `zod.url()`) even though the workspace
runtime is Zod 3.25; importing the generated API then throws before the server starts. Keep codegen
post-processing that converts them to `zod.number().int()` and `zod.string().url()`, and removes the
three duplicate type-barrel exports above.

**Why:** The mismatch only appears on a fresh API-server import after codegen, so a previously running
dev server can hide it.

**How to apply:** After changing the OpenAPI spec, run codegen and verify both the post-process checks
and a clean API-server startup before relying on generated schemas.
