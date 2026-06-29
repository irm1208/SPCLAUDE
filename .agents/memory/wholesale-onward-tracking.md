---
name: Wholesale onward tracking (masked)
description: Rules for the per-participant onward shipping/tracking feature on shared wholesale orders.
---

The dispatching recipient records a per-participant onward tracking number; participants
see MASKED 17track updates for their own forwarded parcel.

**Masking is a money/privacy-integrity boundary — enforce SERVER-SIDE in buildShareResponse, not just in the UI.**
- Raw tracking number + carrier go ONLY to the recipient viewer; participants get a fully-opaque masked number (bullets) and `carrier: null`.
- Event `status` from 17track is free carrier text and can embed exact cities/addresses. For a NON-recipient viewer, replace each event status with a coarse phase enum (classifyOnwardEvent) and keep only the country-level location (already country-masked at fetch). Recipient keeps full text.
- **Why:** the API payload itself is the leak surface — display-side hiding is bypassable via devtools. The architect rejects participant payloads that carry raw descriptions.

**UI editability must be driven by the server flag `member.canEditTracking`, never by client creator-status flags.**
- The dispatching recipient may not be the GB creator. Gating the tracking controls behind `canDispatch (=isCreator && everyonePaid && isRecipient)` hides them from a legitimate non-creator recipient.
- Render the tracking control in BOTH the dispatch view and the recipient onward-roster view via one shared helper, gated per-member by `canEditTracking || hasTracking`.

**Race-safety (same family as other wholesale share writes):**
- The set/clear tracking writes use a conditional WHERE guard (EXISTS share still submitted AND delivery_username still = me AND target != recipient) with `.returning()`, → 409 on no-op.
- The async post-save 17track fetch result must also be written conditionally on `onward_tracking_number = trackingNumber` (the number changes per save), or a slow stale fetch overwrites a newer tracking number's status/events.
