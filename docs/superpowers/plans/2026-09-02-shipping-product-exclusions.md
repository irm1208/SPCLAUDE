# Shipping Product Exclusions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let organisers save products that already include vendor shipping, exclude their kit quantities from Shipping Split allocation and reporting, and see included kit quantities per product.

**Architecture:** Store the excluded product IDs on the Group Buy as a JSONB array and expose them through organiser-scoped GET/PUT endpoints. Keep allocation logic pure: each order contributes only non-excluded quantities, excluded-only orders receive zero, and single-vial adjustments operate only on included quantities. The Shipping Split UI loads and saves the selection, offers a multi-product exclusion control, and displays included kit totals by product.

**Tech Stack:** React + Vite, TypeScript, Express, Drizzle ORM, PostgreSQL JSONB, Node test runner.

---

### Task 1: Add the persisted Group Buy setting

**Files:**
- Modify: `lib/db/src/schema/group_buys.ts`
- Modify: `artifacts/api-server/src/index.ts`

- [ ] **Step 1: Write the failing schema/API test**

Add a focused route/model test proving a saved product exclusion can be read back for the same Group Buy and is scoped to the organiser owner.

- [ ] **Step 2: Run the test to verify it fails**

Run the focused organiser test and expect the setting endpoint or schema field to be missing.

- [ ] **Step 3: Add `vendorShippingExcludedProductIds` as a nullable JSONB string array**

Add the Drizzle field beside the existing vendor-shipping Group Buy settings and add an idempotent startup `ALTER TABLE group_buys ADD COLUMN IF NOT EXISTS vendor_shipping_excluded_product_ids jsonb`.

- [ ] **Step 4: Run the schema/type checks**

Run the focused test and library typecheck; expect the new field to be available.

### Task 2: Add organiser-scoped setting endpoints

**Files:**
- Modify: `artifacts/api-server/src/routes/organiser.ts`
- Test: `artifacts/api-server/src/routes/organiser-shipping-settings.test.ts`

- [ ] **Step 1: Write failing endpoint tests**

Cover:
- GET returns the saved product ID array.
- PUT accepts a de-duplicated array of non-empty product IDs.
- PUT rejects product IDs not belonging to the Group Buy.
- Non-owner access is rejected.

- [ ] **Step 2: Run the tests to verify they fail**

Run the focused route test and confirm the endpoints do not exist.

- [ ] **Step 3: Implement GET and PUT**

Use `gbOwner(req, gbId)` for access control, validate product membership through `group_buy_products`, and write only the validated product IDs to the Group Buy JSONB field.

- [ ] **Step 4: Run the focused endpoint tests**

Expect all endpoint cases to pass.

### Task 3: Update pure shipping allocation and kit summaries

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/shipping-split-model.ts`
- Test: `artifacts/peps-anonymous/src/pages/shipping-split-model.test.ts`

- [ ] **Step 1: Write failing model tests**

Cover:
- Excluded quantities do not contribute to an order’s eligible quantity.
- Mixed orders allocate only from included quantities.
- Orders containing only excluded products receive zero.
- Equal and quantity-weighted allocation uses only eligible orders and quantities.
- Single-vial calculations ignore excluded products.
- Product summaries return included kit totals by product.

- [ ] **Step 2: Run the tests to verify they fail**

Run the model test file and confirm the new options/helpers are missing or produce the old all-product allocation.

- [ ] **Step 3: Implement excluded-product-aware helpers**

Add an excluded-product set parameter to the allocator and breakdown helpers, preserve existing behavior when the set is empty, and add a product quantity summary helper. Keep all decimal normalization and rounding centralized.

- [ ] **Step 4: Run all model tests**

Expect existing single-vial tests and the new exclusion tests to pass.

### Task 4: Add the Shipping Split controls and per-product summary

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/ShippingSplitTab.tsx`

- [ ] **Step 1: Add loading and saving states**

Load the saved exclusion list when the Group Buy loads, and save changes through the organiser PUT endpoint with a visible saving/error state.

- [ ] **Step 2: Add the exclusion selector**

Add a clearly labelled multi-product control explaining that selected products already include vendor shipping and are excluded from this split.

- [ ] **Step 3: Show included kit quantities by product**

Render a compact summary table using the filtered, selected orders. Show included products and kit totals; do not include excluded products in the table.

- [ ] **Step 4: Wire all calculations**

Pass the excluded set into normal allocation, single-vial allocation, order breakdowns, and the automatic amount recalculation. Excluded-only orders should display zero allocated shipping and be clearly labelled.

- [ ] **Step 5: Verify interaction states**

Confirm reload restores saved exclusions, changing exclusions recalculates amounts, and Apply remains governed by the existing exact-total validation.

### Task 5: Verify the complete feature

**Files:**
- No new files.

- [ ] **Step 1: Run model and API tests**

Run the focused model and organiser shipping tests, plus the existing group-buy shipping integrity tests.

- [ ] **Step 2: Run the frontend production build**

Run `pnpm --filter @workspace/peps-anonymous run build`.

- [ ] **Step 3: Run diff and workflow checks**

Run `git diff --check`, restart the canonical `Start application` workflow, and inspect fresh logs for startup or runtime errors.