---
name: Wholesale publish vs settings persistence
description: Why the shared-order management UI must not clear settingsDirty when publishing/unpublishing a public group.
---

The wholesale "publish to public groups" endpoint persists only a SUBSET of order
settings: country (written as `allowedCountries: [country]`), maxMembers,
maxTotalKits, plus the public-only maxPackages and organiserFlatFee. It does NOT
persist minKitsPerMember, maxKitsPerMember, or lockDeadline. "Make private"
(public:false) persists no settings at all.

**Rule:** In the organiser management page, `savePublic()` must NOT call
`setSettingsDirty(false)`. Only "Save limits & rules" (the settings endpoint) fully
persists the limits form. The seed effect is gated on `!settingsDirty`, so clearing
the flag on publish lets a reseed silently overwrite unsaved min/max-kits-per-person
or lock-deadline edits.

**Why:** When the public-listing block was merged into "Order Limits & Rules" and
publish was rewired to read maxMembers/maxTotalKits from settingsForm and country
from allowedCountriesList[0], clearing settingsDirty on publish became a silent
data-loss path for the non-persisted fields. Caught in code review.

**How to apply:** If you ever want publish to also save the full limits, sequence
saveSettings() before publish (or add a combined endpoint) rather than just clearing
the dirty flag. Also note: publishing truncates a multi-country allowedCountries list
to the single first country (backend overwrites it) — this is long-standing behavior,
not a regression; surface it in copy if it confuses organisers.

**Stale-reseed race:** Do NOT reset the `*Seeded` refs (publicSeeded/settingsSeeded)
to false inside savePublic before `invalidate()`. The cached `share` is still stale
until the refetch lands, so a reset lets the seed effect re-run against old data,
clobber the form back to pre-save values, then set seeded=true and block the fresh
result. The forms already hold exactly what was submitted, so just clear the dirty
flag and leave seeded=true — no reseed needed. (The public on/off control is a toggle
switch wired to savePublic(!isPublic); a separate "Save public changes" button shows
only when isPublic && publicDirty and must carry the same allowedCountries-nonempty
guard as publish so it can't send country:"".)
