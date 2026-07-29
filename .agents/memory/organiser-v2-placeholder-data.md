---
name: Organiser V2 placeholder data traps
description: GB Organiser V2 (/gborganiser-v2) mapApiGroupBuy has fake fallback values; real data must be passed via explicit props.
---

# Organiser V2 placeholder data traps

The rule: in `artifacts/peps-anonymous/src/pages/organiser-v2/`, `mapApiGroupBuy` (organiser-api.ts) still fills several SampleGB fields with placeholders — `maxMembers` falls back to 1, and members/revenue/pendingLabs stay 0. Only `status`, `closeDate`, `name`, `currency` are real from the API.

**Why:** the V2 UI started as a static mockup; an earlier pass fixed the Overview tab and sidebar by threading real values (memberCount, memberLimit, gbStatus, gbCloseDate) as explicit props from Workspace.tsx (reading raw `apiGroupBuy.memberLimit` with a `typeof === "number" && > 0` guard), bypassing the mapper. Trusting `SampleGB.maxMembers` produced the "0/1 capacity bar" bug on a 159-member GB.

**How to apply:** when wiring any other V2 tab to real data, do not read counts/limits/money from the mapped SampleGB object — read from the raw API group buy (or dedicated endpoints) and pass down as props, or fix the mapper itself. Also: deep-linking exists (`?gb=` in GbOrganiserV2.tsx, `?tab=` in Workspace.tsx via replaceState, no popstate handling); `?gb` is not written back when switching GBs in-app.
