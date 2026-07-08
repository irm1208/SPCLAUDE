---
name: Discord synthetic username display
description: How Discord-only accounts' identifiers are stored and why raw display must be avoided.
---

Discord-only signups (no prior Telegram account) are stored with a synthetic
`telegramUsername = "discord:<id>"` (the accounts table's primary identifier
column, reused rather than adding a new PK). The real Discord username lives
in a separate `discordUsername` column and is NOT returned by `/account/me`
by default.

**Why:** several own-account display surfaces (header, sidebar, mobile nav,
profile page, order page) read `account.telegramUsername` directly and would
otherwise show the raw synthetic id like `@discord:804011274190848003` to the
user.

**How to apply:** use the `isDiscordOnlyAccount()` / `getAccountHandle()`
helpers in `artifacts/peps-anonymous/src/hooks/use-account.ts` for any new
user-facing display of the logged-in user's own handle. Do NOT change
`telegramUsername`-derived values used purely as localStorage key scoping
(those must stay stable/raw to avoid breaking existing stored keys) — only
swap *display* strings. Admin-facing views of *other* customers'
`telegramUsername` are out of scope and must stay as real Telegram handles
(used for support/contact), never swapped to Discord display logic.
