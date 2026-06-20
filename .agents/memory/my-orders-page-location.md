---
name: My Orders page location
description: Which file renders the customer-facing "My Orders" with order filter tabs, vs the separate secondary orders page.
---

The customer-facing **My Orders** screen (the All / order-type filter pills plus the "GROUP BUY ORDERS" section, grouped GB cards with Tracking buttons) is rendered by `artifacts/peps-anonymous/src/pages/CustomerPortal.tsx` under `section === "orders"`, reached at `/account?s=orders`.

There is a SEPARATE, secondary orders page `AccountOrders.tsx` routed at `/my-orders`. It looks similar but is NOT the portal view customers normally see. Editing it does NOT change the portal's My Orders.

**Why:** Both files contain order-tab UI, so it's easy to edit the wrong one (this cost a wasted pass). `/account` (CustomerPortal) is the live customer surface; `/my-orders` is secondary.

**How to apply:** For any change to the customer "My Orders" tabs/sections, edit `CustomerPortal.tsx` (orders section), not `AccountOrders.tsx`.

Order categorization on that page: `filteredByGb` → group-buy orders go to `gbOrderGroups` (keyed by `groupBuyId`); non-GB `regularOrders` then split into wholesale (`orderType` is `wholesale` or `wholesale_shared`) vs shop (everything else). The historical single "Lonely Vial" / `regular` tab actually showed ALL non-GB orders (wholesale included).
