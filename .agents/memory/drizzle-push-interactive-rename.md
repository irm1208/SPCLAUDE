---
name: Drizzle push interactive rename prompt
description: Why drizzle-kit push can hang in the agent shell, and how to add a single new table deterministically.
---

# drizzle-kit push interactive create-vs-rename prompt

`pnpm --filter @workspace/db run push-force` (drizzle-kit push --force) can drop into an
**interactive** prompt asking "Is <newtable> created or renamed from another table?" listing
unrelated tables as rename candidates.

**Why:** `--force` only auto-accepts data-loss; it does NOT skip the create-vs-rename heuristic.
That heuristic triggers whenever the live DB contains **orphan tables** that no longer exist in
the schema (the dev DB has drifted), so drizzle guesses your new table might be a rename of one of
them. In the non-TTY agent shell the prompt has no stdin, so the command stalls / exits without
applying anything — the table never gets created.

**How to apply:** When you only need to add ONE new table in dev, skip push and create it directly
with SQL that mirrors the Drizzle definition exactly, e.g.:

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
CREATE TABLE IF NOT EXISTS <name> ( ... CONSTRAINT <c> UNIQUE (...) );
CREATE INDEX IF NOT EXISTS <idx> ON <name> (...);
SQL
```

Match drizzle's output shape: `unique("name").on(...)` → a named `UNIQUE CONSTRAINT` (not a unique
index); `index("name").on(...)` → a plain `CREATE INDEX`. Once the table matches the schema, a later
`push` sees no diff and won't prompt. Production startup runs its own `drizzle-kit push --force`; the
same orphan-table drift could make it hang there too — clean up orphan tables if prod ever stalls.
