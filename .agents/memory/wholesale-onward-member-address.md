---
name: Wholesale per-member onward shipping address
description: Privacy gating + write rules for the participant onward-address feature on wholesale shared orders
---

Each wholesale-share member can store their OWN onward delivery address (where the
chosen parcel recipient forwards their items after the combined parcel lands).
Columns live on `wholesale_share_members` (`onward_name/phone/email/address/country`).

**Privacy rule (the whole point):** an onward address is readable ONLY by (a) the
nominated parcel recipient (`share.deliveryUsername`) and (b) the member who owns it.
Never the organiser, never other members.

**How to apply:**
- Visibility is centralized in `buildShareResponse`: per member it returns
  `onward` (full object) only when `canSeeOnward = isRecipientViewer || isOwn`, else
  `null`; plus a safe-for-all `hasOnwardAddress` boolean (presence signal only, no
  content) and `canEditOnward = isOwn && !isRecipient && status!=='cancelled'`.
- Write endpoint `PUT /wholesale-shares/:id/my-onward-address` is self-service: a
  member updates only their own row. The chosen recipient is blocked from setting one
  (they receive the parcel directly — no onward leg).
- The write is NOT vendor-priced: do NOT validate the onward country against vendor
  regions or the organiser country allow-list (the recipient forwards it themselves).
- Like every wholesale-share status-sensitive write, the update must be a CONDITIONAL
  SQL update (gated on `status<>'cancelled'` AND caller still not the recipient via an
  EXISTS subquery on `wholesale_shares`) and check affected-row count → 409 on race.
  See the `wholesale-share-status-races` memory.

**Why:** parcel forwarding happens after lock/submit, so onward addresses must stay
editable until cancellation; and the address is genuinely private shipping PII that
only the forwarder needs — leaking it to the organiser/other members was the explicit
thing to avoid.
