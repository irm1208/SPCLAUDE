---
name: Wholesale vendor access policy
description: User-defined visibility and submission boundaries for the wholesale vendor portal.
---

Vendors must see only their own wholesale orders and supplier cost prices, never customer sale prices. They can process orders, provide images and add tracking, with updates reflected on the member order.

**Why:** The user requested a restricted supplier fulfilment platform.

**How to apply:** Enforce ownership and field privacy server-side, not only through dashboard presentation.

Supplier payment receipts must retain the submitted supplier-cost breakdown as it
was when recorded. Never reconstruct missing historical receipt detail from a
current shipment, and never include Admin-only member identities in vendor history.

**Why:** A voided payment can be followed by a corrected or resubmitted shipment
using the same submission identity. Reusing its latest detail would rewrite the
meaning of an old receipt and can disclose other shared-order members to a vendor.

**How to apply:** Freeze new receipt details independently of shipment updates,
label older missing detail honestly, and explicitly project vendor-visible fields.
Bind payment review to the reviewed supplier-cost snapshot so resubmission cannot
silently change what an Admin records. Require a reviewed snapshot for every new
allocation; older Admin pages must refresh rather than bypass this financial guard.

Removing an order from Peps Anon Payment means recalling its supplier submission
from the vendor portal and payment list, not cancelling or deleting the customer order.

**Why:** The user explicitly chose “Remove from vendor and payment” while keeping
the customer order intact.

**How to apply:** Reuse supplier recall and its audit trail, retain historical
receipts, and never bypass active payment allocations. Admin may explicitly
override started fulfilment or vendor photos with a required reason and warning;
preserve customer status/tracking and retain the original supplier evidence in audit history.

**Why the override:** The user approved Admin removal of a shipped supplier
submission from the vendor portal and payment list without changing the customer order.

Admin product-profit estimates must use only sales attributable to that supplier,
not the whole total of every linked or mixed-supplier customer order. Product-only
profit must be labelled as an estimate before shipping, discounts, credits and fees.

**Why:** Shared and mixed-supplier orders can appear in several supplier submissions;
using their full totals repeatedly inflates profit. Product margin is not net profit.

**How to apply:** Keep profit Admin-only, use submitted supplier product costs,
show unavailable rather than inventing missing sales, and preserve negative margins.

Existing vendor accounts, sessions, Telegram events and message history must be
preserved when adding or publishing vendor features.

**Why:** The user explicitly said “Don't delete. I want to add these” when Publish
proposed removing existing vendor tables.

**How to apply:** If Publish proposes unexpected vendor-table deletions, compare
the applied development and production schemas. Restore missing development
definitions and verify the publish diff has no destructive statements; never
approve deletion or overwrite production data.

Telegram connection completion must prove that this attempt's one-time code was
used, rather than infer success from recent chat creation or chat counts.

**Why:** Reconnecting an existing chat preserves its original creation date;
unrelated chat changes can also produce false connection results.

**How to apply:** Scope connection status to the current vendor and account,
stop expired or cancelled attempts, and retain Telegram's required Start/add-bot consent.

Orders become visible to the vendor only when Admin submits them, not automatically when payment is confirmed.

**Why:** The user explicitly chose “When Admin submits them.”

**How to apply:** Keep payment confirmation separate from vendor submission and do not expose unsubmitted historical orders automatically.

Vendor sign-in has its own URL and uses the existing account credentials; the regular member login must not link to or automatically redirect vendors into the portal.

**Why:** The user explicitly requested a separate vendor login URL, then confirmed that it should use existing account credentials.

**How to apply:** Keep vendor entry and return-from-logout inside the dedicated vendor login flow. Enforce vendor access on the server after sign-in; do not add a second password system or expose vendor navigation on the regular member login.
