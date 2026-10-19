# Country-Scoped Group-Buy Shipping Options Implementation Plan

> **For agentic workers:** Inline execution in the current session; follow each task in order and use TDD.

**Goal:** Let group-buy managers restrict existing custom postage options to one destination country without changing the EU onward-delivery matrix.

**Architecture:** Extend the existing `shippingOptions` JSON entries with an optional ISO country code; no database migration is needed. Admin and organiser editors will select a country, and order creation will show and validate only options matching the member's destination (or an unscoped option). Existing address and QR-upload flags, prices, and upload behavior remain intact.

**Tech Stack:** React, TypeScript, Express, Drizzle/PostgreSQL JSON configuration, Vitest.

---

### Task 1: Add country-scoping to option types, editor, and country matching

**Files:**
- Modify `artifacts/peps-anonymous/src/components/admin/group-buys/shared/core.tsx`
- Modify `artifacts/peps-anonymous/src/pages/GbOrganiser.tsx`
- Add/update tests for the country matcher and `ShippingOptionsEditor`

- [ ] Add an optional country-code field to custom shipping options and allow selecting “All countries” or a specific country in both admin and organiser editors.
- [ ] Test that an unscoped option is available everywhere, a UK option matches UK, and a UK option does not match Germany.
- [ ] Keep QR-upload and delivery-address requirements attached to the selected option.

### Task 2: Enforce destination-country scope in group-buy orders

**Files:**
- Modify `artifacts/peps-anonymous/src/pages/OrderForm.tsx`
- Modify `artifacts/api-server/src/routes/organiser.ts`
- Modify relevant create/edit order validation in `artifacts/api-server/src/routes/orders.ts`
- Modify order-detail QR/address metadata resolution in `artifacts/api-server/src/routes/account.ts` and `artifacts/api-server/src/routes/admin.ts`
- Add/update focused frontend and API tests

- [ ] Resolve the destination country from the member's shipping country/account country and expose only global or matching-country options; when no custom option matches, retain the existing global delivery methods.
- [ ] Reject a submitted country-specific option when the order country does not match it.
- [ ] Confirm an order using a QR-required country option still exposes the existing member label/QR upload to that order and its managers.
- [ ] Run the focused tests, relevant artifact build, and `git diff --check`.
