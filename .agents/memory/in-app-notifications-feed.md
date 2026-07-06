---
name: In-app notifications feed
description: The customer bell feed is backed by telegram_message_logs; rules for keeping new notification paths visible in it.
---

# In-app notifications feed (bell dropdown)

The customer dashboard bell reads `GET /api/account/notifications`, which queries `telegram_message_logs` (recipientType='user', recipientUsername = normalized bare-lowercase username, newest first, HTML stripped server-side). There is NO separate notifications table.

**Rule:** any new customer-facing notification path MUST end up in `telegram_message_logs` via `logTgMessage` (delivered sends do this automatically through `sendTelegramMessageFull` with a user logCtx). Skipped sends (bot token missing, Telegram not linked, per-event preference off) are deliberately logged too, with `delivered=false` and errorMessage `"skipped: ... (in-app only)"` — do the account lookup BEFORE the token early-return or token-less deployments get an empty feed.

**Why:** the feed's empty state promises "order updates and support replies"; a notification path that returns early without logging silently vanishes for unlinked users (this bug existed in `notifyUserTicket`).

**How to apply:**
- New notify helpers: mirror `notifyUserFull`'s ordering (account lookup → token check w/ skip-log → chatId check w/ skip-log → pref check w/ skip-log → send).
- The admin Telegram-logs viewer shows these skipped rows; they're intentional and clearly labelled.
- Unread state is client-only: localStorage `sp_notif_seen` timestamp in DashboardShell; there is no server-side read receipt.
- Feed queries are covered by index `tg_logs_recipient_sent_idx` (recipient_type, recipient_username, sent_at desc) — keep it if the table is ever rebuilt.
