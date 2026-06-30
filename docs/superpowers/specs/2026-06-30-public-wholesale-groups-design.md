# Public Wholesale Groups — Design

**Date:** 2026-06-30
**Status:** Approved (design), pending spec review

## Summary

Today, wholesale shared orders (`wholesale_shares`) are private: the only way to
join is by entering the 6-character group code, and the listing endpoint returns
only shares you already belong to. There is no public marketplace.

This feature lets an organiser flip a shared order to **public**. Public groups
appear as browsable cards on the shared-orders page so other wholesale members
can discover and join them, and each newly published group is announced to a
Telegram topic.

Moderation: **none**. Any wholesale member can publish; the group appears in the
public list instantly (chosen over the group-buy-style approval flow).

## Card contents (exact fields)

Each public group card shows:

1. **Organizer Name** — `creator_username`
2. **Country** — destination country for the parcel
3. **Max Allowed People** — cap on group members
4. **Max Allowed Kits** — total quantity of kits/vials across the group
5. **Max Packages** — number of parcels the order will be split into (distinct
   from kits; this is parcel count, not quantity)
6. **Organizer Fee** — a flat fee per person, shown upfront

Cards also show **live availability** (e.g. "3/8 people · 40 kits left") and a
**Join** button, plus a trust warning (see below).

## Data model

Extend the existing `wholesale_shares` table (`lib/db/src/schema/wholesale_shares.ts`).
No new tables.

New columns:

- `is_public` — boolean, default `false`. Whether the group is listed publicly.
- `organiser_flat_fee` — numeric, nullable. Flat per-person organiser fee shown
  on the card and applied to each member who joins.
- `max_packages` — integer, nullable. Number of parcels the order will split
  into. **This is a new concept** — kits (quantity) and packages (parcel count)
  are separate caps.

Reused existing columns:

- `creator_username` → Organizer Name
- `allowed_countries` (JSONB array) → Country. When publishing, the organiser
  sets a single destination country here.
- `max_members` → Max Allowed People
- `max_total_kits` → Max Allowed Kits
- `status` → only `open` groups are listed publicly.

Startup migration: add the three new columns via the existing startup
`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` pattern in
`artifacts/api-server/src/index.ts`, consistent with how prior wholesale columns
were added. (`npm start` also runs `drizzle-kit push --force`.)

## Publishing flow (organiser only)

Location: the organiser management view, `WholesaleShared.tsx`.

- A **"Public group"** toggle reveals a small form: country, max people, max
  kits, max packages, flat fee.
- Saving validates that all required public fields are set (country, max people,
  max kits, max packages, flat fee), then flips `is_public = true`.
- Endpoint: `PUT /api/wholesale-shares/:id/publish` (organiser/creator only).
  Body carries the public fields + `public: true|false`.
  - Guarded so only the creator can publish/unpublish.
  - Only allowed while `status = 'open'`.
- Unpublishing (`public: false`) removes the group from the public list. No
  Telegram retraction is sent.

## Browse + join flow

- New endpoint: `GET /api/wholesale-shares/public` (requires wholesale role,
  same as create/join). Returns open public groups with:
  - the six card fields,
  - current member count and current total kits (for availability),
  - the group `id` (used to join).
  - **Excludes** any group that is full (member count ≥ max people, or total
    kits ≥ max kits) — or marks it as "Full" and disables joining. Decision:
    keep it listed but show "Full" and disable the Join button, so people can
    still see active groups.
- New section on `WholesaleShareEntry.tsx`: **"Public groups"**, rendering the
  cards. This sits alongside the existing "Join an existing order" and "Your
  shared orders" sections.
- **Join:** clicking Join on a card joins through the existing join flow using
  the group's `id` (the public id is the code). On joining a public group with
  `organiser_flat_fee` set, the new member's `organiser_fee` is resolved to that
  flat amount (consistent with the "store the resolved fee" rule used elsewhere).

## Trust warning

Display a clear warning on the public cards section and at the join step:

> "Only join shared orders with people you trust."

This is presentation-only copy; it does not change any logic.

## Telegram announcement

- On the **transition** from not-public → public (first publish), the app posts
  a card-style message with the six fields and a join link to a Telegram topic.
- Configured via two environment secrets, set once:
  - `PUBLIC_GROUPS_CHAT_ID` — target group chat id
  - `PUBLIC_GROUPS_TOPIC_ID` — the topic (thread) id
- Implementation reuses `sendTelegramMessageFull` in
  `artifacts/api-server/src/lib/telegram.ts`, passing `message_thread_id` via
  the existing `extraPayload` mechanism.
- **Best-effort and non-blocking:** if the secrets are missing or the send
  fails, the publish still succeeds; the failure is logged, nothing breaks.
- Only fires on the `false → true` transition, not on every save of an already
  public group (avoid duplicate announcements).

## Error handling & edge cases

- Publish requires `status = 'open'`; attempting on a locked/submitted/cancelled
  share returns a conflict/validation error.
- Publish validation rejects missing required public fields.
- Only the creator can publish/unpublish (auth-gated like other organiser
  actions on the share).
- Groups that lock, submit, cancel, or fill up drop off (or show "Full" on) the
  public list automatically — driven by the `status = 'open'` filter and the
  capacity check, no manual unpublish needed.
- Joining a full group is blocked server-side, not just hidden in the UI.
- Telegram send is best-effort; never blocks the publish response.

## Out of scope (YAGNI)

- Admin approval / moderation flow.
- Per-account visibility rules (allowed/excluded countries, blocked accounts)
  like group buys have — public groups are visible to all wholesale members.
- Percentage-based organiser fees (flat per-person only).
- Telegram message editing/deletion when a group unpublishes or fills.

## Testing (manual)

- Publish a share → appears in `GET /wholesale-shares/public` and on the browse
  section; Telegram topic receives one announcement.
- Unpublish → disappears from the list; no second Telegram message on re-toggle
  edits; re-publish after unpublish sends a fresh announcement.
- Join a public group from a card → becomes a member, organiser fee resolved to
  the flat fee.
- Fill the group to max people / max kits → shows "Full", join blocked
  server-side.
- Lock/cancel the group → drops off the public list.
- Missing Telegram secrets → publish still succeeds, no error surfaced to user.
