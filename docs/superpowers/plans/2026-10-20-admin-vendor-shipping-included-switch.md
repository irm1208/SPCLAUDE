# Admin Vendor Shipping Included Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only switch for marking group-buy vendor shipping as included, while retaining fixed-amount and TBD entry.

**Architecture:** Keep the current API and database contract: `vendorShippingAmount: 0` means included and `null` means TBD. Add a small tested form-state helper, then wire the admin Details → Shipping panel to it. The existing Save Vendor Shipping button remains responsible for persistence.

**Tech Stack:** React, TypeScript, Node test runner, Vite.

---

### Task 1: Test included-state form behavior

**Files:**
- Create: `artifacts/peps-anonymous/src/components/admin/group-buys/panels/vendor-shipping-state.test.ts`
- Create in Task 2: `artifacts/peps-anonymous/src/components/admin/group-buys/panels/vendor-shipping-state.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  isVendorShippingIncluded,
  setVendorShippingIncluded,
} from "./vendor-shipping-state.ts";

test("zero is included while blank and positive amounts are not", () => {
  assert.equal(isVendorShippingIncluded("0"), true);
  assert.equal(isVendorShippingIncluded("0.00"), true);
  assert.equal(isVendorShippingIncluded(0), true);
  assert.equal(isVendorShippingIncluded(""), false);
  assert.equal(isVendorShippingIncluded(null), false);
  assert.equal(isVendorShippingIncluded("5.25"), false);
});

test("the switch on sets zero and switch off returns to blank TBD", () => {
  assert.equal(setVendorShippingIncluded("5.25", true), "0");
  assert.equal(setVendorShippingIncluded("0", false), "");
});
```

- [ ] **Step 2: Run the test and confirm it fails because the helper module is missing**

Run: `cd artifacts/peps-anonymous && pnpm exec tsx --test src/components/admin/group-buys/panels/vendor-shipping-state.test.ts`

Expected: FAIL with module-not-found for `vendor-shipping-state.ts`.

- [ ] **Step 3: Add the minimal tested helper**

Create `vendor-shipping-state.ts`:

```ts
export function isVendorShippingIncluded(
  amount: string | number | null | undefined,
): boolean {
  if (amount === null || amount === undefined || String(amount).trim() === "") {
    return false;
  }
  return Number(amount) === 0;
}

export function setVendorShippingIncluded(
  amount: string,
  included: boolean,
): string {
  if (included) return "0";
  return isVendorShippingIncluded(amount) ? "" : amount;
}
```

- [ ] **Step 4: Run the focused test and confirm it passes**

Run: `cd artifacts/peps-anonymous && pnpm exec tsx --test src/components/admin/group-buys/panels/vendor-shipping-state.test.ts`

Expected: both tests PASS.

### Task 2: Wire the switch into the admin shipping panel

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/admin/group-buys/panels/DetailsPanel.tsx`
- Modify: `artifacts/peps-anonymous/src/components/admin/group-buys/panels/vendor-shipping-state.test.ts`

- [ ] **Step 1: Add the integration contract test**

Add a source-level test to the test file using Node `readFileSync` and `new URL("./DetailsPanel.tsx", import.meta.url)`. Assert that the component renders the **Vendor shipping included (0)** switch with `checked={isVendorShippingIncluded(vendorShippingAmount)}` and keeps the existing `vendorShippingAmount` save payload. The shared `Switch` has a zero-argument click handler, so the amount update must invert the current derived included state inside its handler. Also assert that the visible label is attached as the switch's accessible name.

- [ ] **Step 2: Run the focused test and confirm the new contract assertion fails**

Run: `cd artifacts/peps-anonymous && pnpm exec tsx --test src/components/admin/group-buys/panels/vendor-shipping-state.test.ts`

Expected: helper behavior tests pass; the integration assertion fails because the panel is not wired yet.

- [ ] **Step 3: Wire the switch without changing the API contract**

Import the tested helpers into `DetailsPanel.tsx`. Inside the existing `gb.vendorShippingEnabled` content, render a `SettingsRow` labelled **Vendor shipping included (0)** with an accessible `Switch`. Its checked state comes from `isVendorShippingIncluded(vendorShippingAmount)`. Its zero-argument click handler toggles local state using `setVendorShippingIncluded(current, !isVendorShippingIncluded(current))`. Extend the shared `Switch` with an optional `ariaLabel` prop. When included, show “No separate vendor-shipping charge”; otherwise show the existing numeric amount field. Keep the current notice message field and **Save Vendor Shipping** button unchanged.

- [ ] **Step 4: Run focused tests, typecheck, and production build**

Run: `cd artifacts/peps-anonymous && pnpm exec tsx --test src/components/admin/group-buys/panels/vendor-shipping-state.test.ts`

Expected: all focused tests PASS.

Run: `cd artifacts/peps-anonymous && pnpm run typecheck`

Expected: typecheck exits 0.

Run: `pnpm --filter @workspace/peps-anonymous run build`

Expected: Vite build exits 0.
