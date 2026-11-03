# Own-stock unpaid-order revisions

**Approved scope:** Optional, disabled by default per group buy. Only organisers' own products may be revised. Paid orders never change. Members accept or decline a before/after proposal; unchanged orders remain payable on their original terms.

**Architecture:** Separate settings and revision records; immutable original/proposed snapshots. Authorise every request against the selected group or member. Accept under the existing group money and stock locks, order row lock, and a current financial snapshot check. Block supplier-committed orders, refunds, partial payments and claimed half kits. Prices may change and quantities may decrease; no added products or automatic stock allocation.

## Implementation sequence
- [x] Add pure eligibility, snapshot and money planning tests; observe failures, then implement.
- [x] Add Drizzle settings/revision tables and create matching tables in development only. Publish owns production schema migration.
- [x] Add authenticated organiser settings/list/proposal endpoints and member review/decision endpoints, with transactional ownership and money safeguards.
- [x] Add one reusable organiser control in both dashboards, with bulk product pricing and individual quantity editing; add member review on account order details and a discoverable order-card link.
- [x] Test proposals, acceptance/decline, stale orders, payment changes before acceptance, cross-account/group denial, disabled defaults, own-product scope and preservation of financial extras.
- [x] Build both affected artifacts, restart the canonical workflow once, inspect logs and screenshot the public authentication boundary. Do not bypass authentication.

**Financial policy:** Preserve existing shipping, tips, testing contributions and fixed monetary coupon/credit allocations. Re-resolve an existing percentage admin fee against the proposed subtotal, without introducing a fee to previously fee-free orders. Refuse a proposal whose total cannot cover already applied credits/discounts. Clear all order crypto quote fields when an accepted revision changes money. Repeated decisions are idempotent; changing or disabling settings never changes historical decisions.

**Verification:** 31 backend tests and 7 component tests passed; API and frontend production builds passed. Anonymous endpoint returned 401. Screenshot confirmed the normal mobile sign-in boundary; signed-in UI was not visually verified. Repository-wide API type checking still reports pre-existing errors outside the new revision files.
