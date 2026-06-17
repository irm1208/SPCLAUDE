---
name: Group-buy visibility gate
description: Server rule preventing organisers from publishing unapproved group buys to public lists.
---

# Group-buy visibility gate

When an organiser un-hides a group buy (sets `hiddenFromList=false`) via
`PATCH /organiser/group-buys/:id`, the server must reject it with 403 unless the
group buy's `approvalStatus === 'approved'` OR the actor is an admin
(`req.organiser.isAdmin`).

**Why:** Public visibility in this app is the product of several independent flags
(`status='active'`, `not(hiddenFromList)`, approval state). Without a server-side
gate, an organiser could combine `public_requested` + `active` + un-hide to surface
a group buy that an admin never approved — a broken-access-control hole. The admin
approval workflow is the single authority for what becomes public; the visibility
toggle must defer to it.

**How to apply:** Any new code path that can clear `hiddenFromList`, or otherwise
make a group buy appear in `/group-buys/active` (which itself requires
`status='active'` AND `not(hiddenFromList)`), must re-check approval server-side.
Client-side guards (e.g. the GbOrganiser toggle) are UX only — never the
enforcement point. Joining a hidden/preview GB is intentionally allowed by id via
`/account/join-gb` (invite-PIN enforced when `invitePinHash` is set); hidden only
means "excluded from public lists", not "unjoinable".
