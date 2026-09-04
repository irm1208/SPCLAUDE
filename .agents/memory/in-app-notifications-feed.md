---
name: In-app notifications feed
description: The customer bell feed is backed by telegram_message_logs; rules for keeping new notification paths visible in it.
---

# In-app notifications feed (bell dropdown)

The customer dashboard bell reads `GET /api/account/notifications`, which queries `telegram_message_logs` (recipientType='user', recipientUsername = normalized bare-lowercase username, newest first, HTML stripped server-side). There is NO separate notifications table.

**Rule:** by default, any new customer-facing notification path MUST end up in `telegram_message_logs` via `logTgMessage` (delivered sends do this automatically through `sendTelegramMessageFull` with a user logCtx). Skipped sends (bot token missing, Telegram not linked, per-event preference off) are deliberately logged too, with `delivered=false` and errorMessage `"skipped: ... (in-app only)"` — do the account lookup BEFORE the token early-return or token-less deployments get an empty feed.

**Strict opt-in exception:** if a product category is explicitly defined as creating no alert in any channel until the user enables it on the website, absent/false preference means the event must not be created in the bell feed either. Pre-check before `notifyUser`, then suppress only the notifier's preference-disabled skip-log on its second preference read so an opt-out race cannot leak a bell entry. Once enabled, missing-token/unlinked-channel cases still log in-app.

**Why:** conventional alerts should remain visible to unlinked users, but a strict website opt-in is consent for alert creation itself, not merely consent for Telegram delivery.

**How to apply:**
- New notify helpers: mirror `notifyUserFull`'s ordering (account lookup → token check w/ skip-log → chatId check w/ skip-log → pref check w/ skip-log → send).
- Apply the strict opt-in exception only when the product requirements explicitly say disabled users receive no in-app alert; preserve default skip logging for every other category.
- The admin Telegram-logs viewer shows these skipped rows; they're intentional and clearly labelled.
- Unread state is client-only: localStorage `sp_notif_seen` timestamp in DashboardShell; there is no server-side read receipt.
- Feed queries are covered by index `tg_logs_recipient_sent_idx` (recipient_type, recipient_username, sent_at desc) — keep it if the table is ever rebuilt.

## Action links in the feed

The endpoint extracts `<a href="...">` anchors from the stored Telegram HTML into a `links: [{href,label}]` array (max 3, http/https + relative only — javascript:/data: dropped) BEFORE stripping tags; the client renders them as chips (same-host/relative → SPA navigate, external → new tab noopener).

**Constraints:**
- Extraction regex only matches **double-quoted** hrefs — keep templates double-quoted (all of telegram-registry.ts is).
- `renderTemplate` does NOT auto-escape variables; any caller substituting user content into a message MUST escapeHtml it, or a user could inject a clickable chip into another user's feed (protocol allowlist limits blast radius, but don't rely on it).
- Bodies render with line breaks preserved (pre-line, 3-line clamp) — never join lines with " · " client-side; stripTelegramHtml trims dangling `·`/`•`/`|` at line edges left by anchor removal.
- Generic footer links (site root or bare `/account`, no query/hash) are suppressed — no chip, still stripped from the body (user asked "no button if not needed"; dropdown has its own orders footer). To give a notification a chip, deepen its template href (e.g. `/account?s=orders`) — don't weaken the heuristic.
- Templates are DB-overridable via site_config `tg_template:<eventKey>` (60s cache); registry default only applies when no DB row exists — check before assuming a registry edit takes effect.
