# Admin Product Bulk Deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins select multiple products in the backend Products tab and delete the selection atomically.

**Architecture:** Keep the existing per-product delete route and row action. Add an authenticated `DELETE /admin/products` route that deletes the requested IDs in one Drizzle transaction and rejects stale IDs before commit; add a small pure selection helper for visible-row and individual toggles; wire it into the existing product list, with a confirmation showing every selected product.

**Tech Stack:** React, TypeScript, Express, Drizzle ORM, Vitest, Node test runner.

---

## File map

- Modify `artifacts/api-server/src/routes/admin.ts` to add the atomic bulk-delete endpoint beside the existing single-product endpoint.
- Create `artifacts/api-server/src/routes/__tests__/admin-products-bulk-delete.test.ts` using the route-level Express/Vitest mocking pattern in `admin-bulk-tracking.test.ts`.
- Create `artifacts/peps-anonymous/src/pages/admin-product-selection.ts` for pure selection operations used by the UI.
- Create `artifacts/peps-anonymous/src/pages/admin-product-selection.test.ts` for selection behavior.
- Modify `artifacts/peps-anonymous/src/pages/Admin.tsx` to add row checkboxes, visible-row selection controls, selected count and clear action, and the confirmation dialog.
- Create `artifacts/peps-anonymous/src/pages/admin-products-bulk-delete-contract.test.ts` to assert the admin page wires the selector and confirmation to the endpoint.

## Task 1: Add the atomic admin bulk-delete endpoint

**Files:**
- Modify: `artifacts/api-server/src/routes/admin.ts` near the existing `DELETE /admin/products/:id` route
- Create: `artifacts/api-server/src/routes/__tests__/admin-products-bulk-delete.test.ts`

- [ ] **Step 1: Write route tests first**

Create a route test using the established `vi.hoisted` state, `vi.mock("@workspace/db")`, `require-admin` mock, `express.json()`, and ephemeral-server helper from `admin-bulk-tracking.test.ts`. The fake transaction records whether it committed or rolled back and returns configured rows from `returning()`. Add these cases:

```ts
it("deletes all requested products in one transaction", async () => {
  mockState.returnedRows = [{ id: "product-1" }, { id: "product-2" }];
  const response = await request("/admin/products", "DELETE", {
    ids: ["product-1", "product-2"],
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    deletedIds: ["product-1", "product-2"],
  });
  expect(mockState.transactionCalls).toBe(1);
  expect(mockState.transactionCommits).toBe(1);
});

it("rejects stale selections and rolls the transaction back", async () => {
  mockState.returnedRows = [{ id: "product-1" }];
  const response = await request("/admin/products", "DELETE", {
    ids: ["product-1", "product-2"],
  });
  expect(response.status).toBe(409);
  expect(mockState.transactionRollbacks).toBe(1);
  expect(mockState.transactionCommits).toBe(0);
});

it("rejects an empty or malformed list before opening a transaction", async () => {
  const response = await request("/admin/products", "DELETE", { ids: [" "] });
  expect(response.status).toBe(400);
  expect(mockState.transactionCalls).toBe(0);
});

it("rejects unauthenticated requests before opening a transaction", async () => {
  mockState.adminAuthorized = false;
  const response = await request("/admin/products", "DELETE", {
    ids: ["product-1"],
  });
  expect(response.status).toBe(403);
  expect(mockState.transactionCalls).toBe(0);
});

it("deduplicates repeated IDs before comparing deleted rows", async () => {
  mockState.returnedRows = [{ id: "product-1" }];
  const response = await request("/admin/products", "DELETE", {
    ids: ["product-1", "product-1"],
  });
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    ok: true,
    deletedIds: ["product-1"],
  });
});
```

Also assert that the existing `DELETE /admin/products/:id` route still succeeds with the same database mock.

- [ ] **Step 2: Run the route test and confirm the missing endpoint fails**

Run from the workspace root:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/admin-products-bulk-delete.test.ts
```

Expected before implementation: the successful bulk request receives 404 because only the `/:id` delete route exists.

- [ ] **Step 3: Implement the route**

Add an exact-path `router.delete("/admin/products", ...)` handler. Use `requireAdmin` before reading or mutating data. Validate that `req.body.ids` is a non-empty array of non-empty strings, trim and deduplicate the IDs, and return 400 for invalid input. Delete with `tx.delete(productsTable).where(inArray(productsTable.id, ids)).returning({ id: productsTable.id })` inside `db.transaction`. If the number of returned IDs differs from the normalized request, throw a stale-selection error inside the transaction so the entire delete rolls back; translate that error to 409. Return `{ ok: true, deletedIds }` after commit. Return a clear 500 response for other database failures. Do not alter the existing single-delete route.

- [ ] **Step 4: Run the route tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/admin-products-bulk-delete.test.ts
```

Expected: all bulk endpoint, authorization, validation, stale-selection, and single-delete tests pass.

- [ ] **Step 5: Commit the API change**

```bash
git add artifacts/api-server/src/routes/admin.ts artifacts/api-server/src/routes/__tests__/admin-products-bulk-delete.test.ts
git commit -m "feat: add atomic admin product bulk delete"
```

## Task 2: Add and test the selection model

**Files:**
- Create: `artifacts/peps-anonymous/src/pages/admin-product-selection.ts`
- Create: `artifacts/peps-anonymous/src/pages/admin-product-selection.test.ts`

- [ ] **Step 1: Write failing selection tests**

Use `node:test` and `node:assert/strict`. Cover selecting and deselecting one ID, selecting all visible IDs, clearing visible IDs without clearing hidden selections, and resolving selected product records in catalogue order:

```ts
test("visible selection preserves products hidden by the current filter", () => {
  const all = toggleVisibleSelection(new Set<string>(), ["one", "two"]);
  const afterChangingFilter = toggleVisibleSelection(all, ["three"]);
  assert.deepEqual([...afterChangingFilter], ["one", "two", "three"]);
  assert.deepEqual(
    [...toggleVisibleSelection(afterChangingFilter, ["three"])],
    ["one", "two"],
  );
});
```

- [ ] **Step 2: Run the focused helper test and confirm it fails**

Run from `artifacts/peps-anonymous`:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/admin-product-selection.test.ts
```

Expected before implementation: module import fails because the selection helper does not exist.

- [ ] **Step 3: Implement the pure helpers**

Export `toggleProductSelection(selectedIds, id)`, `toggleVisibleSelection(selectedIds, visibleIds)`, and `getSelectedProducts(products, selectedIds)`. Each helper returns a new `Set` or array and never mutates the input. `toggleVisibleSelection` removes every visible ID only when all visible IDs are already selected; otherwise it adds all visible IDs. It leaves IDs that are not visible unchanged. `getSelectedProducts` filters the full catalogue list, not the currently visible list, so confirmation includes selections hidden by filters.

- [ ] **Step 4: Run the focused helper tests**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/admin-product-selection.test.ts
```

Expected: all selection-model tests pass.

- [ ] **Step 5: Commit the selection model**

```bash
git add artifacts/peps-anonymous/src/pages/admin-product-selection.ts artifacts/peps-anonymous/src/pages/admin-product-selection.test.ts
git commit -m "feat: add admin product selection model"
```

## Task 3: Wire selection and confirmation into the Products tab

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx` (`DraggableProductRow` and `ProductsTab`)
- Create: `artifacts/peps-anonymous/src/pages/admin-products-bulk-delete-contract.test.ts`

- [ ] **Step 1: Write the failing page contract test**

Add a Node test that reads `Admin.tsx` and asserts that the product row renders a controlled checkbox, the Products tab exposes “Select visible” and a selected count, and the confirmation shows the selected product names and vendors and sends `DELETE /admin/products`. Follow the source-contract test convention in `src/pages/admin-wholesale-shares-contract.test.ts`.

- [ ] **Step 2: Run the focused page test and confirm it fails**

Run from `artifacts/peps-anonymous`:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/admin-products-bulk-delete-contract.test.ts
```

Expected before implementation: the expected checkbox, selection action, and bulk endpoint wiring are absent.

- [ ] **Step 3: Add controlled row checkboxes and visible selection controls**

In `ProductsTab`, add `selectedProductIds` state as a `Set<string>` and use `getSelectedProducts(products, selectedProductIds)` to derive the full confirmation selection. When `load()` refreshes the catalogue, prune IDs that no longer exist. Pass `isSelected` and an `onSelect` callback to `DraggableProductRow`.

- [ ] **Step 4: Add row checkboxes**

In `DraggableProductRow`, render a controlled checkbox with an accessible product-specific label. Call `onSelect(product.id)` on change and prevent checkbox interaction from starting a drag. Do not alter the existing trash button.

- [ ] **Step 5: Add visible-row selection controls**

Derive `visibleIds` from the existing `filtered` array. Add a “Select visible” action that calls `toggleVisibleSelection(selectedProductIds, visibleIds)`, a selected count, and a clear-selection action when the set is non-empty. Keep IDs selected across search/vendor-filter changes; the count includes products hidden by the current filter. Disable the visible-select action when no products are visible.

- [ ] **Step 6: Add the confirmation dialog and send one bulk request**

Open the dialog from the selected-count action. Render exact selected product names and vendors by using the full catalogue selection, not `filtered`. Cancel closes the dialog without a request. Confirm sends one `DELETE /admin/products` request with `{ ids: [...selectedProductIds] }`; do not loop over the single-delete route. Disable confirmation while the request is pending.

- [ ] **Step 7: Reconcile success and failure**

On success, remove only the response's `deletedIds` from local products, clear selection, close the dialog, and show a success message. On HTTP or network failure, keep the selection and dialog open and show the server error or a network-error message.

- [ ] **Step 8: Run the focused UI tests**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/admin-product-selection.test.ts src/pages/admin-products-bulk-delete-contract.test.ts
```

Expected: selection behavior and page wiring tests pass.

- [ ] **Step 9: Commit the UI change**

```bash
git add artifacts/peps-anonymous/src/pages/Admin.tsx artifacts/peps-anonymous/src/pages/admin-products-bulk-delete-contract.test.ts
git commit -m "feat: add product bulk selection to admin"
```

## Task 4: Verify the complete feature

**Files:** No additional files; verify the API route, selection helper, and Products tab together.

- [ ] **Step 1: Run the focused API and UI tests**

Run from the workspace root:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/__tests__/admin-products-bulk-delete.test.ts
pnpm --filter @workspace/peps-anonymous exec tsx --test src/pages/admin-product-selection.test.ts src/pages/admin-products-bulk-delete-contract.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run package checks**

Run:

```bash
pnpm --filter @workspace/api-server run build:compile
pnpm --filter @workspace/peps-anonymous test
pnpm --filter @workspace/peps-anonymous run build
```

Expected: API compile, web package tests, and production build pass.

- [ ] **Step 3: Review the diff and commit any remaining test fixes**

Run `git diff --check` and `git status --short`. Correct only feature-related failures, rerun the relevant focused tests and checks, then commit the fixes.

- [ ] **Step 4: Integrate and verify the running app**

After the feature branch is clean and verified, merge it into `main`, restart only the `Start application` workflow, inspect workflow/browser logs, and verify that selecting filtered rows, confirming their names, and deleting them updates the list. Do not perform a real product deletion during preview verification.