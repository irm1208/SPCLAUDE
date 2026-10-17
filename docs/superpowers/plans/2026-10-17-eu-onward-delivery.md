# EU onward-delivery estimates

## Approved scope
Per-group-buy, per-reshipper EU country rates for pickup or home delivery. Quantities are kits; halves count as 0.5. Bands are >0–5 and >5–25. Above 25 requires a quote. Blank cells are unavailable. Estimates are never vendor shipping or included in checkout totals; members pay the reshipper later.

## Implementation
- [x] Add tested rate validation, country normalization, quantity-band and estimate resolution.
- [x] Store matrices and per-order delivery preferences in the existing database-backed configuration store, using stable reshipper-assignment/order identities. Keep these values private behind scoped endpoints, as with existing group updates.
- [x] Add authenticated Admin/Organiser matrix settings and member preview/order preference endpoints. Reuse group ownership/membership guards, enforce reshipper assignment, and never trust submitted prices.
- [x] Persist delivery preferences transactionally with order creation/edits. Resolve displayed estimates against current order country, quantities and assigned reshipper, without changing money fields.
- [x] Integrate settings into both organiser routes and Admin reshippers; show selectable estimates on order/review and saved preferences to members, organiser/Admin and assigned reshipper.
- [x] Run focused unit/integration tests, compile frontend/API, restart canonical workflow once and verify public preview. Report any authenticated rendering not verified.

## Verification
23 onward API/rule/database tests, 6 frontend helper/contract tests, and 13 order-panel rendering/interaction tests passed. The wider half-kit edit regression set passed before the final estimate-display refinement. API compile and frontend production build passed. Canonical application restarted and reached ready state; public mobile order form rendered. Signed-in matrix/order screens were not browser-verified. Full typechecks still have unrelated existing errors; no new onward-delivery errors were reported.

## Storage decision
Use namespaced records in the existing PostgreSQL configuration store, matching group-progress and reshipper-preference conventions. This avoids unnecessary schema migration for optional settings. Matrix identity uses the stable reshipper assignment ID rather than a mutable username (accounts are username-keyed). Order preference keys use immutable order IDs; rates are derived on read, so reassignment or quantity changes cannot silently retain another reshipper's rate.
