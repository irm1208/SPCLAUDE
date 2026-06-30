---
name: Wholesale public groups
description: Rules for the public (listed-as-cards) wholesale shared orders feature — publish flow, fee exemptions, and Telegram announcement gating.
---

# Wholesale public groups

A shared wholesale order can be made PUBLIC (instant, no approval) so it lists as a
card on the shared-orders page. Card fields: organiser (creatorUsername), country
(allowedCountries[0]), max people (maxMembers), max kits (maxTotalKits), max packages
(maxPackages), organiser flat fee (organiserFlatFee).

## First-publish announcement must be detected under the row lock
The Telegram announcement fires only on a real `false -> true` publish transition.
Read `isPublic` **inside the publish transaction under `.for("update")`**, not from
the pre-transaction loaded share.
**Why:** two concurrent publish requests both read stale `isPublic=false` before the
lock and both announce. Detecting under the lock makes it once-only.
**How to apply:** any "fire side-effect only on first transition" logic on a wholesale
share must read the gating column under the same row lock that guards the write.

## Telegram topic announcement requires BOTH envs
`announcePublicWholesaleGroup()` sends to `PUBLIC_GROUPS_CHAT_ID` with
`message_thread_id` = `PUBLIC_GROUPS_TOPIC_ID`. Skip (return `{ok:false}`) if EITHER
is missing, or if the topic id isn't a finite number. Best-effort — never throws,
never fails publishing.
**Why:** sending with chat id but no topic id posts to the base chat (wrong
destination). The requirement is "post to the topic, or skip entirely."

## Fee exemptions
The flat organiser fee is resolved onto each current member at publish (and onto
future joiners at join). Creator (receives the fee) and recipient (deliveryUsername)
are exempt → fee 0. `buildShareResponse` also masks the recipient's fee to 0.
Clearing/changing the amount resets `organiserFeePaid=false`, mirroring the fees route.
This fee is peer-to-peer — NEVER added to order totals (see wholesale-p2p-fees).
