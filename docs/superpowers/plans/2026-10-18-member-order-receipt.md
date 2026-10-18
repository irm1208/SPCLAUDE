# Member order receipt

**Goal:** Members can confirm receipt of their own shipped orders, across group buys, wholesale and shared orders.

**Approved scope:** Shipped orders only, with a confirmation prompt. Complete only the selected member order; do not alter payments, tracking or shared-parent/member records. Record a server timestamp.

**Implementation:** A dedicated authenticated account route locks the owned, non-deleted order and accepts only Shipped → Completed. Previously confirmed retries return the original timestamp. A member action on order details submits confirmation, shows errors, records the successful result locally and refreshes account order/group caches. Active refunds remain protected.

**Verification:**
- API tests cover all order types, wrong ownership, missing authentication, soft deletion, non-shipped statuses, duplicate requests and serialized simultaneous requests.
- Component interaction test covers confirmation/cancellation, rejected requests, retry, persisted receipt and hiding the button for non-shipped orders.
- Page wiring regression checks the member-only guard and cache refresh.
- Build frontend and API without invoking production schema push; restart the canonical development workflow so the additive startup migration runs.
- Check logs and preview. Authenticated UI is tested with isolated components rather than bypassing login.
