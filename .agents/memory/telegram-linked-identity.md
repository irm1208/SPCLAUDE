---
name: Linked Telegram identity
description: Website account handles can differ from the Telegram account connected to the bot.
---

Website account usernames may differ from the actual Telegram username linked to
the notification bot. Display these separately in Admin; never assume one is
the other or rename an account to match a Telegram lookup.

**Why:** the user explicitly reported that some website usernames differ from
the Telegram accounts connected to the bot and needs to identify the latter.

**How to apply:** resolve the bot identity using the stored private-chat ID,
not a username search. An absent public Telegram username and a failed lookup
are different states. Keep this contact lookup Admin-only and do not expose
bot credentials or alter account/order ownership.
