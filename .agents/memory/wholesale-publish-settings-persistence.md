---
name: Wholesale publish vs settings persistence
description: How max-packages / organiser-flat-fee persist across the settings + publish endpoints, and the rule that flat-fee re-resolution must be transactional, isPublic-gated, and read the recipient under the row lock.
---

`maxPackages` and `organiserFlatFee` now live in the MAIN "Order Limits & Rules"
form (settingsForm), not a separate public-listing form. Both the settings endpoint
(PUT `/wholesale-shares/:id/settings`) and the publish endpoint persist them. The
old `publicForm`/`publicDirty`/`publicSeeded` state and the "Save public changes"
button were removed; the public block is now display-only + a public on/off toggle
wired to `savePublic(!isPublic)`, which sends the current settingsForm values.

The settings endpoint persists the FULL limits form (min/max-kits-per-person,
maxTotalKits, lockDeadline, allowedCountries, maxPackages, organiserFlatFee). The
publish endpoint persists only a SUBSET: country (as `allowedCountries:[country]`),
maxMembers, maxTotalKits, maxPackages, organiserFlatFee — NOT min/max-kits-per-person
or lockDeadline. "Make private" (public:false) persists no settings at all.

**Flat-fee re-resolution rule (money path):** The organiser flat fee is resolved
onto each member in BOTH the settings handler and the publish handler. Any handler
that writes `organiserFlatFee` MUST, when the order isPublic, do ALL of:
1. run inside a `db.transaction` with `.for("update")` on the share row;
2. reject non-open status (FEES_CONFLICT → 409) so lock/cancel wins the race;
3. exempt the organiser (creator) AND the delivery recipient, charge everyone else;
4. reset `organiserFeePaid=false` whenever a member's amount changes;
5. be idempotent — skip members whose target === prev (no needless paid-flag resets,
   so save-then-republish with the same fee doesn't churn);
6. read the recipient (`deliveryUsername`) from the LOCKED row inside the transaction,
   NOT from the pre-transaction preloaded `share`. A stale preload lets a concurrent
   `/delivery` change leave the old recipient exempt and the new one charged.
**Why:** this codebase treats wholesale fee edits as money-integrity-critical; loose
or non-transactional fee handling gets code-review rejected.

**Known pre-existing gap (out of scope, flag if asked):** `/wholesale-shares/:id/delivery`
does NOT re-resolve organiser fees when the recipient changes on a public share, so
stored member fees can drift from the share row until the next settings/publish save.
`buildShareResponse` masks the current recipient's fee to 0 for DISPLAY, but stored
fees/paid flags can be wrong for lock/payment/materialisation paths.

**settingsDirty rule:** `savePublic()` must NOT call `setSettingsDirty(false)`. Only
"Save limits & rules" fully persists the limits form. The seed effect is gated on
`!settingsDirty`; clearing the flag on publish lets a reseed silently overwrite
unsaved min/max-kits-per-person or lock-deadline edits.

**Stale-reseed race:** Do NOT reset the `settingsSeeded` ref to false inside
savePublic before `invalidate()`. The cached `share` is still stale until the refetch
lands, so a reset lets the seed effect re-run against old data, clobber the form back
to pre-save values, then set seeded=true and block the fresh result. The form already
holds exactly what was submitted — just clear the dirty flag and leave seeded=true.

**Other notes:** publishing truncates a multi-country allowedCountries list to the
single first country (backend overwrites it) — long-standing, not a regression.
organiserFlatFee > 100000 is CLAMPED (not rejected) in both handlers, on purpose, so
the two paths stay consistent.
