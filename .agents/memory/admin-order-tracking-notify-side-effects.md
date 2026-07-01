---
name: Admin order tracking write side-effects
description: PATCH /admin/orders/:id trackingNumbers has non-obvious auto-status + notify side-effects; any bulk/group tracking write must skip unchanged members.
---

Setting tracking via `PATCH /admin/orders/:id` (admin.ts) is NOT a plain field write — it has two side-effects, and it does NOT compare old-vs-new before firing them:

- **Auto-advance to Shipped**: if an incoming tracking value is present and status isn't already Shipped/Completed, status is forced to "Shipped".
- **Customer notification**: presence of `trackingNumbers`/`trackingNumber` in the update marks tracking "changed" and fires the per-order Telegram/customer notification whenever the new number is non-empty — even if the value is identical to what was already stored.

**Rule:** any code that writes tracking to MANY orders at once (e.g. the whole-order tracking field on the Admin → Shared Orders group header, which writes one number to every member of a `wholesale_shared` group) MUST first filter out members whose current first-tracking value already equals the desired value. Otherwise every re-save spams every member with a duplicate "shipped" notification and re-stamps status.

**Why:** shared/wholesale_shared orders ship as ONE parcel to ONE address (the recipient), so one tracking number legitimately covers the whole group — but the group is N separate order rows, so a naive Promise.all over all members re-notifies unchanged ones.

**How to apply:** compute `memberTracking(m) = (m.trackingNumbers?.[0] ?? m.trackingNumber ?? "").trim()`; PATCH only members where that differs from the trimmed draft; treat "0 targets" as a no-op ("already up to date"). Base any Save-disabled check on ALL members matching the draft (not just the first), so a partially-saved/inconsistent group stays saveable to re-sync. Clear the per-group draft only on full success so the header re-reads fresh data.
