---
name: Wholesale vendor access policy
description: User-defined visibility and submission boundaries for the wholesale vendor portal.
---

Vendors must see only their own wholesale orders and supplier cost prices, never customer sale prices. They can process orders, provide images and add tracking, with updates reflected on the member order.

**Why:** The user requested a restricted supplier fulfilment platform.

**How to apply:** Enforce ownership and field privacy server-side, not only through dashboard presentation.

Orders become visible to the vendor only when Admin submits them, not automatically when payment is confirmed.

**Why:** The user explicitly chose “When Admin submits them.”

**How to apply:** Keep payment confirmation separate from vendor submission and do not expose unsubmitted historical orders automatically.

Vendor sign-in has its own URL and uses the existing account credentials; the regular member login must not link to or automatically redirect vendors into the portal.

**Why:** The user explicitly requested a separate vendor login URL, then confirmed that it should use existing account credentials.

**How to apply:** Keep vendor entry and return-from-logout inside the dedicated vendor login flow. Enforce vendor access on the server after sign-in; do not add a second password system or expose vendor navigation on the regular member login.
