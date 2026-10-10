---
name: Username rename migration gaps
description: Non-FK username text columns that /account/change-username must migrate explicitly, and the self-heal pattern for rows that were already missed.
---

Any column storing `telegramUsername` as plain text (no FK + `onUpdate: cascade` to `accounts.telegramUsername`) is invisible to the accounts-table rename cascade and must be added explicitly to the `UPDATE` list in `/account/change-username` (`artifacts/api-server/src/routes/account.ts`).

**Why:** `wholesale_shares.creatorUsername`/`deliveryUsername` and `wholesale_share_members`/`wholesale_share_messages.username` were all missed this way — a renamed organiser/recipient/member silently lost their role or got stranded out of their own shared order, with no error surfaced anywhere.

**How to apply:**
- When adding any new text column that stores a username, either give it a real FK with `onUpdate: cascade` to `accounts.telegramUsername`, or add it to the explicit migration list in the change-username route (match the existing `lower(x) IN (bare, @bare)` pattern).
- For columns with a `UNIQUE(other_id, username)` constraint (e.g. `wholesale_share_members`), guard the migration UPDATE with a `NOT EXISTS` check so a rename never aborts on a hypothetical conflict — it just leaves that one row unmigrated instead.
- For already-corrupted production rows from before the fix shipped: prefer a **self-healing read path** over a manual production UPDATE. If another already-migrated column on the same entity (e.g. `orders.telegramUsername`) still reflects the current username, join through it to find and repair stranded rows lazily on next access — this needs no direct production write (which is disallowed via `executeSql`) and fixes every past occurrence, not just the one reported.
- Self-heal writes must be set-based (single `UPDATE ... FROM ... RETURNING`, not a per-row loop) and must only report success from confirmed `RETURNING` rows — never synthesize an in-memory "healed" object, or a failed/blocked write can be mistaken for authorization.

Financial-history retention must not make the mutable login username permanently immutable. Keep account ownership references renameable while keeping deletion restricted and money snapshots unchanged.

**Why:** A completed refund prevented a Discord member from choosing a site username: the rename reached the accounts update but a restrictive refund ownership foreign key rejected it. Completed financial history is not an active-refund mutation.

**How to apply:** Keep active-refund checks in rename transactions. When introducing financial ownership relationships, distinguish renaming the same account from changing refund ownership, deleting history, or modifying money; verify completed history survives a rename unchanged.
