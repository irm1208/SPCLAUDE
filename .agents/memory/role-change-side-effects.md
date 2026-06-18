---
name: Role change side-effect parity
description: Any new path that changes account roles must replicate the side-effects of the single-account handlers.
---

Account roles live on `accounts`: `isWholesale` (bool), `poolLeaderStatus` (text lifecycle), `organiserStatus` (text lifecycle) + `organiserApprovedAt`.

**Rule:** any alternate path that mutates a role (e.g. bulk endpoints) must mirror the single-account handler's side-effects, not just the status column.

**Why:** organiser approval is not a single field — the single-account approve also writes `organiserAuditLogTable` and sends an applicant notification. Granting/revoking elsewhere without those leaves an inconsistent audit trail and silent users.

**How to apply:**
- Organiser grant: set `organiserStatus="approved"` AND `organiserApprovedAt=now`, insert an `organiserAuditLogTable` row per account, notify applicant.
- Organiser revoke: clear BOTH `organiserStatus=null` AND `organiserApprovedAt=null` (timestamp left behind makes accounts look historically approved).
- Pool leader grant/revoke: `poolLeaderStatus` "approved"/null + bump `updatedAt`.
- Privilege-changing endpoints must strictly validate `action` (grant|revoke) and `role` — never coerce unknown input to "grant".
