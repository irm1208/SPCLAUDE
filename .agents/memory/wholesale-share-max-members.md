---
name: Wholesale share max-people cap
description: How the optional max_members cap on shared wholesale orders behaves and why its bounds are what they are.
---

# Wholesale share max-people cap

`wholesale_shares.max_members` is **nullable** — `null` means **no limit**.

- New shares are created with **no cap** (insert omits `maxMembers` → null).
- Existing shares keep whatever value they had (historically 10). They were
  **not** mass-migrated; organisers edit or clear the cap themselves.
- PUT `/settings` validates the cap: integer **>= 2**, **<= 1000**, and **>=
  current member count**. Blank/empty clears it back to null.
- Join cap is enforced only when `share.maxMembers != null && count >= maxMembers`.

**Why min 2:** locking a share requires at least 2 members, so a cap below 2
would make a share un-lockable. **Why >= current count:** you must not set a
cap below the people already in the share.

**How to apply:** any new code that reads the cap must treat null as "no
limit" (never compare/divide against it) and any UI showing `N/cap` must omit
the `/cap` when null. There is no longer a `MAX_WHOLESALE_SHARE_MEMBERS`
constant.

**Known gap (pre-existing, out of scope):** the join cap uses a
count-before-insert, so concurrent joins can race past a configured cap; PUT
`/settings` also treats an omitted `maxMembers` as "clear" (fine because the
UI always sends the full settings payload).
