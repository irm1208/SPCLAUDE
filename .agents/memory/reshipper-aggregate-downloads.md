---
name: Reshipper fulfilment download format
description: User distinction between combined reshipper orders and member-by-member exports.
---

Organiser fulfilment downloads are one combined total order per reshipper: reshipper handle, aggregated item quantities, total and kit count. Do not include member names or individual order breakdowns.

**Why:** The user explicitly corrected the proposed member-by-member format: “Not members name, So it'll just be the total order.”

**How to apply:** Keep this aggregate download distinct from supplier batch audit exports and member parcel manifests. Search must not accidentally omit assigned orders from a total-order download.

Keep exact product totals and flag unmatched halves for review; never automatically round supplier quantities up or change customer charges. State that supplier orders require full kits.

**Why:** The user explicitly selected “Keep exact totals and flag unmatched halves for review” after reporting that manually added half-kits were missing.

**How to apply:** Check fractions after aggregating each product across the reshipper's orders, not across all products together. Download from fresh saved orders, not the fulfilment tab's potentially old snapshot; fail rather than fall back to stale data.
