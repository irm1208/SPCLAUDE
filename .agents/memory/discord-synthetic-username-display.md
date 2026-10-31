---
name: Discord synthetic username display
description: How Discord-only accounts' identifiers are stored and why raw display must be avoided.
---

Discord-only signups (no prior Telegram account) are stored with a synthetic
`telegramUsername = "discord:<id>"` (the accounts table's primary identifier
column, reused rather than adding a new PK). The real Discord username lives
in a separate `discordUsername` column.

**Why:** several own-account display surfaces (header, sidebar, mobile nav,
profile page, order page) read `account.telegramUsername` directly and would
otherwise show the raw synthetic id like `@discord:804011274190848003` to the
user.

**How to apply:** use the `isDiscordOnlyAccount()` / `getAccountHandle()`
helpers in `artifacts/peps-anonymous/src/hooks/use-account.ts` for any new
user-facing display of the logged-in user's own handle. Do NOT change
`telegramUsername`-derived values used purely as localStorage key scoping
(those must stay stable/raw to avoid breaking existing stored keys) — only
swap *display* strings.

Admin-facing account and order labels should also resolve synthetic Discord
identities to their linked Discord username. Keep real Telegram handles
unchanged, even when those accounts also link Discord.

This includes the main Customers cards, not just the separate Accounts table.
The user repeated that they need actual usernames, never `discord:<id>` labels.

**Why:** the user explicitly requested readable Discord names for other members;
numeric synthetic identifiers were confusing in staff views.

**How to apply:** resolve display labels only through Admin-authenticated name
metadata. Preserve raw identity in action requests, ownership comparisons,
exports and storage keys. Never expose the Admin name directory to public users.
