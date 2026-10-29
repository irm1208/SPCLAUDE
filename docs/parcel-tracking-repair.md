# Member parcel destination repair

## What this release changes

The existing organiser dashboards (`/gborganiser` and `/gborganiser-v2`, Incoming Parcels)
and Admin's group-buy Parcels panel now let staff choose a **Destination reshipper**.
It is the package recipient, not its creator. Choices come from that group's assigned
reshippers. Disabled historical assignments remain selectable for old parcels.

Create and edit persist this existing database field. Omitted destination fields on
unrelated edits retain the saved value. Changing only a destination does not change
the label, manifest, tracking history, tracking number, order status or payment.

Both member parcel endpoints now use the same projection. Only paid, active,
member-owned orders qualify. Explicit order reshipper assignments override stale
direct markers. Matching items must belong to an order routed to that parcel's
destination; items from a different route are not mixed into the response.
Shared parcel numbers and URLs are hidden, quantities are member-specific, and
event locations are country-only. Member event descriptions come from a fixed
set of generalized phrases; unknown carrier prose becomes “Tracking update”,
not partially redacted free text. Only valid numeric timestamps are returned.
The stored tracking history remains unchanged.

For older orders without a stamped reshipper, a saved country-leg route can
resolve through exactly one enabled, same-group reshipper covering that leg.
Missing/foreign legs, overlapping assignments and explicit direct orders never
use this fallback. This resolves the **order's route**, not the parcel destination;
the parcel still needs staff-confirmed assignment (or the exact legacy username
label convention). Explicit order usernames take precedence over this fallback.

Unresolved parcels are not shared based on product or country overlap.
An exact, case-insensitive username label (with optional `@`) remains supported
as a legacy convention, but `Package 1 - AJ` and `Ghost` are not usernames to infer.
Direct delivery uses tracking from that member's explicit direct-shipping order;
a null shared-parcel destination is never evidence of direct delivery.
Private supplier-batch shipments are unchanged.

## October parcels that still need staff action

The task's read-only production inspection reported **ten** legacy parcels in
**Uther GB - October - @ajer6130**, group **YR3P2**. All had tracking and nonempty
manifests, and all lacked an explicit destination. Labels included
**Package 1 - AJ** and other **AJ/Ghost** labels.

The group's reshipper accounts were **ajer6130** and **lh100498**.
**No mapping from AJ or Ghost to either account has been confirmed.**
This implementation did not re-inspect or modify production. Do not treat these
labels as account identities, run a backfill, or ask reshippers to recreate parcels.

## Application and confirmation checklist

1. Merge the reviewed code into the main app and include both frontend and API
   changes in its normal release process. This fork does not change the live app.
   No schema migration is required: `gb_parcels.reshipper_username` already exists.
   There is no startup repair or production-writing test hook.
2. An authorised organiser or Admin opens **YR3P2 → Incoming Parcels / Parcels**.
   The unassigned warning identifies each parcel requiring confirmation.
3. Confirm the actual recipient of **each of the ten parcels** with the organiser.
   Do not assume all AJ-labelled or Ghost-labelled parcels share a recipient.
4. Edit each existing parcel, select its confirmed **Destination reshipper**, and
   save. Keep its existing label, contents and tracking details.
5. Reopen each parcel to confirm that the destination persisted and that its
   manifest/history are unchanged.
6. Verify with a paid member routed to each reshipper that **Group Buys → Tracking**
   shows the appropriate parcels, masked events and only the member's matching
   items. Check that the other reshipper's packages are absent. Verify any genuine
   direct-shipping member separately using their own order's tracking.
7. Only after the mapping and member checks are complete should the live October
   incident be described as resolved.

## Regression checks

- API and projection:
  `pnpm --filter @workspace/api-server exec vitest run src/lib/member-gb-parcels.test.ts src/routes/__tests__/member-parcel-destinations.test.ts`
- Browser fixtures against the running development workflow:
  `PARCEL_BROWSER_TESTS=1 pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/member-parcel-destinations.browser.test.ts`
  Optional overrides: `PARCEL_BROWSER_BASE_URL` and
  `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`.
- The browser test visits the active V2 workspace using synthetic API responses,
  then renders the actual Admin form and member modal in browser-intercepted HTML.
  It checks destination persistence, untouched assignment omission, loading,
  empty/error separation, retry recovery and visible tracking events.
  It creates no real accounts and writes no real database records.
- Browser screenshots are local ignored output under
  `generated-artifacts/parcel-tracking/`; they are not production verification.

Both application builds passed during implementation. The repository-wide
frontend and API typechecks currently report pre-existing errors outside these
changes (including account audit-log types, organiser implicit-any callbacks,
CustomerPortal account casts and legacy component props). They are not evidence
that the live October mapping has been repaired.
