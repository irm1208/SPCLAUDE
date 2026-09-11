# Vial Seller Admin Password Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated admin securely replace a Vial Shop seller password from the seller detail panel.

**Architecture:** Add one admin endpoint beside the existing seller tracking routes. It validates an eight-character minimum, verifies the vendor has a seller dashboard, replaces the stored hash, clears reset-code state, and writes an audit event. Because seller authentication tokens are the password hash itself, replacing the hash immediately invalidates every existing seller session. Add a small controlled form to the existing Profile tab.

**Tech Stack:** Express, Drizzle ORM, React, TypeScript, Vitest, Vite.

---

### Task 1: Admin password-reset API

**Files:**
- Create: `artifacts/api-server/src/routes/vial-seller-admin-password.test.ts`
- Modify: `artifacts/api-server/src/routes/vial-shop.ts`

- [ ] **Step 1: Write the failing API contract test**

Assert that `PUT /admin/vial/sellers/:id/password` uses `requireAdmin`, rejects passwords shorter than eight characters, looks up the target vendor, rejects a missing/non-dashboard seller, stores `hashPassword(newPassword)`, clears `resetCode` and `resetCodeExpiresAt`, and writes `seller_password_reset_by_admin` without including the password.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/vial-seller-admin-password.test.ts
```

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the endpoint**

Add the route immediately after the admin seller list/detail routes. Use:

```ts
router.put("/admin/vial/sellers/:id/password", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { newPassword } = req.body;
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }
  const [seller] = await db.select().from(vialVendorsTable)
    .where(eq(vialVendorsTable.id, req.params.id));
  if (!seller || !seller.sellerPasswordHash) {
    res.status(404).json({ error: "Seller account not found" });
    return;
  }
  await db.update(vialVendorsTable).set({
    sellerPasswordHash: hashPassword(newPassword),
    resetCode: null,
    resetCodeExpiresAt: null,
  }).where(eq(vialVendorsTable.id, seller.id));
  writeLog("seller", "warn", "seller_password_reset_by_admin",
    `Seller password reset by admin: ${seller.name}`,
    { vendorId: seller.id, vendorName: seller.name }, req.ip).catch(() => {});
  res.json({ ok: true, message: "Seller password updated successfully." });
});
```

- [ ] **Step 4: Run the API test and verify GREEN**

Run the command from Step 2. Expected: PASS.

### Task 2: Seller detail password form

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/VialShopTab.test.ts`
- Modify: `artifacts/peps-anonymous/src/components/VialShopTab.tsx`

- [ ] **Step 1: Add a failing frontend contract test**

Assert the seller detail component has two password inputs, validates matching values and eight-character minimum, sends `{ newPassword }` to `/admin/vial/sellers/${seller.id}/password`, clears both fields after success, and surfaces the API error message.

- [ ] **Step 2: Run the test and verify RED**

```bash
pnpm --filter @workspace/peps-anonymous exec vitest run src/components/VialShopTab.test.ts
```

Expected: FAIL because the password form is absent.

- [ ] **Step 3: Implement the controlled form**

Add local state for password, confirmation, saving, success, and error. Add a submit handler that performs client validation and the authenticated API request. Render the form in the Profile tab with masked, autocomplete-disabled fields and a disabled submit button while saving.

- [ ] **Step 4: Run frontend tests and verify GREEN**

Run the command from Step 2. Expected: PASS.

### Task 3: Full verification

**Files:**
- Verify all files above without additional feature scope.

- [ ] **Step 1: Run targeted tests**

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/vial-seller-admin-password.test.ts
pnpm --filter @workspace/peps-anonymous exec vitest run src/components/VialShopTab.test.ts
```

- [ ] **Step 2: Run production builds**

```bash
pnpm --filter @workspace/api-server run build:compile
pnpm --filter @workspace/peps-anonymous run build
```

- [ ] **Step 3: Restart the canonical workflow and inspect logs**

Restart only `Start application`, verify application readiness, and inspect the relevant preview.
