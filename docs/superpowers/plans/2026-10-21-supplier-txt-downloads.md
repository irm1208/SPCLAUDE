# Supplier TXT downloads implementation plan

**Goal:** Download batch purchases grouped by reshipper and selected direct purchases in FS3 TXT format, using required saved supplier-delivery contacts.

**Architecture:** Store supplier contacts separately from login and member addresses in existing reshipper settings JSON. Admin-only export services reuse batch ownership, exceptions and locking; read immutable batch quantities and current assigned recipients. A pure formatter validates contacts, exact supplier costs and quantities before returning any file. Add compact dashboard contact form, batch TXT button and direct-order selection.

**Tech Stack:** Express, Drizzle, React, Vitest.

- [x] Write failing formatter/contact tests, including missing data and privacy.
- [x] Implement validated contacts, authenticated read/save routes and focused dashboard form.
- [x] Implement admin batch/direct TXT endpoints with access and payment/refund guards.
- [x] Wire batch TXT buttons and selected direct-order downloads.
- [x] Run targeted tests, build both artifacts, restart canonical workflow and check preview.

Pricing: supplier product costs come from FS3 cost settings, exact case-insensitive names only (never fuzzy/retail fallback). Retain FS3 reshipper $70/package convention; direct parcels use active wholesale vendor tiers where calculable, otherwise explicitly labelled $70 fallback. Exports never process orders or change payments. Missing recipient details or costs block the entire export.

Verification: 43 backend tests (including isolated development database batch/direct exports) and 7 component tests passed. Both production builds passed. Unauthenticated contact and export routes return 401. Running app starts ready; preview confirms sign-in works, but signed-in dashboard could not be visually checked by the capture browser. Existing unrelated typecheck errors remain; changed production code has no new reported errors.
