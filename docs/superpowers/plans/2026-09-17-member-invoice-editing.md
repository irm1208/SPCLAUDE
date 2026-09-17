# Member Invoice Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an authenticated member open an order invoice from the order summary, edit the complete invoice—including currency and paid-order prices—and save or download it through member-scoped APIs.

**Architecture:** Extract the existing admin invoice load/save logic into a shared API service. Add account-session invoice routes that first verify the order belongs to the current account, then call that service. Make `InvoiceEditor` accept an endpoint/auth configuration so the existing admin UI and the new member flow share one form and preview.

**Tech Stack:** Express, Drizzle ORM, Zod, Vitest, React, Vite, React Hook Form, Wouter, Tailwind utility classes.

---

## File map

- Create: `artifacts/api-server/src/lib/invoice-service.ts` — shared invoice loading/seeding and transactional save operations.
- Modify: `artifacts/api-server/src/routes/admin-invoices.ts` — keep admin auth and PDF routes, delegate invoice work to the shared service.
- Modify: `artifacts/api-server/src/routes/account.ts` — add member invoice GET/PUT/PDF routes with account ownership checks.
- Create: `artifacts/api-server/src/routes/member-invoices.test.ts` — route-source and service-contract tests for authentication, ownership, currency, and PDF behavior.
- Modify: `artifacts/peps-anonymous/src/components/invoice/InvoiceEditor.tsx` — support admin and member endpoint configurations without duplicating the editor.
- Modify: `artifacts/peps-anonymous/src/pages/AccountOrderDetail.tsx` — add member invoice editor state, entry action, save refresh, and member PDF flow.
- Create or modify: `artifacts/peps-anonymous/src/components/invoice/InvoiceEditor.test.tsx` — verify member requests use account routes and currency remains editable.
- Modify: `artifacts/peps-anonymous/src/App.tsx` only if the chosen editor presentation needs a dedicated route; prefer rendering the editor from the existing order-detail page to avoid a second order fetch.

### Task 1: Extract shared invoice persistence

**Files:**
- Create: `artifacts/api-server/src/lib/invoice-service.ts`
- Modify: `artifacts/api-server/src/routes/admin-invoices.ts`
- Test: `artifacts/api-server/src/routes/member-invoices.test.ts`

- [ ] **Step 1: Write failing service contract tests**

Create tests that mock the database transaction boundary and assert the service contract:

```ts
it("loads or seeds an invoice from the order and maps a group-buy currency to USD", async () => {
  const invoice = await loadOrSeedInvoice("order-1");
  expect(invoice?.orderId).toBe("order-1");
  expect(invoice?.currency).toBe("USD");
});

it("saves invoice totals, line items, shipping, and order totals atomically", async () => {
  const result = await saveInvoice("order-1", validInvoice);
  expect(result.total).toBe("123.45");
  expect(db.transaction).toHaveBeenCalled();
});
```

Use the existing schema-only database mock pattern so importing `@workspace/db` does not create a real pool. Keep test data representative: at least one item with tax and discount, one shipping amount, and a USD group-buy.

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/member-invoices.test.ts
```

Expected: FAIL because `invoice-service.ts` and its exported operations do not exist.

- [ ] **Step 3: Implement the shared service**

Move the current `asDocument`, `loadOrSeedInvoice`, and PUT transaction logic from `admin-invoices.ts` into `invoice-service.ts`. Export:

```ts
export async function loadOrSeedInvoice(orderId: string): Promise<InvoiceDocument | null>;
export async function saveInvoice(orderId: string, invoice: InvoiceDocument): Promise<InvoiceDocument | null>;
export function invoiceFilename(invoiceNumber: string): string;
```

Keep the existing behavior exactly:

- Seed from `ordersTable` and `orderLineItemsTable`.
- Override a seeded group-buy invoice currency with `invoiceCurrencyForGroupBuy`.
- Calculate totals with `calculateInvoiceTotals`.
- Guard the transaction with `assertNoActiveRefund`.
- Replace `orderLineItemsTable` rows using `calculateInvoiceLineItemTotal`.
- Update `productSubtotal`, `grandTotal`, `deliveryPrice`, `vendorShipping: "0.00"`, and nullable notes.
- Return the persisted invoice with calculated totals.

Do not put authentication or account ownership in this service; route middleware and route-level ownership checks must remain explicit.

- [ ] **Step 4: Switch admin routes to the service**

Leave `requireAdmin` and all current response/error status behavior in `admin-invoices.ts`. Replace local persistence implementations with calls to `loadOrSeedInvoice` and `saveInvoice`, and use `invoiceFilename` for the PDF attachment name. Remove now-unused Drizzle/table and calculation imports.

- [ ] **Step 5: Run service and admin regression tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/member-invoices.test.ts src/routes/admin-auth.test.ts
pnpm --filter @workspace/api-server run typecheck
```

Expected: PASS with no type errors and admin routes still requiring admin authentication.

### Task 2: Add member invoice API routes

**Files:**
- Modify: `artifacts/api-server/src/routes/account.ts`
- Test: `artifacts/api-server/src/routes/member-invoices.test.ts`

- [ ] **Step 1: Write failing route tests**

Cover all three member endpoints:

```ts
it("requires account authentication for member invoice routes", () => {
  expect(accountSource).toContain('router.get("/account/orders/:id/invoice", requireAccount');
  expect(accountSource).toContain('router.put("/account/orders/:id/invoice", requireAccount');
  expect(accountSource).toContain('router.get("/account/orders/:id/invoice-pdf", requireAccount');
});

it("checks ownership using both bare and @-prefixed usernames", () => {
  expect(accountSource).toContain("ordersTable.telegramUsername");
  expect(accountSource).toContain("ordersTable.deletedAt");
});

it("validates the invoice body before saving", () => {
  expect(accountSource).toContain("invoiceDocumentSchema.safeParse(req.body)");
});
```

Add handler-level tests with a fake `req.account.telegramUsername` and mocked rows proving that a different member receives 404 and the owner can GET, PUT, and download a PDF.

- [ ] **Step 2: Run the route tests and confirm they fail**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/member-invoices.test.ts
```

Expected: FAIL because the member routes do not exist.

- [ ] **Step 3: Implement ownership lookup and routes**

Import `invoiceDocumentSchema`, `buildInvoicePdf`, `loadOrSeedInvoice`, `saveInvoice`, and `invoiceFilename`. Add the routes near the existing `/account/orders/:id` handlers:

```ts
router.get("/account/orders/:id/invoice", requireAccount, async (req, res) => {
  const order = await findOwnedAccountOrder(req.account!.telegramUsername, String(req.params.id));
  if (!order) { res.status(404).json({ error: "Order not found" }); return; }
  const invoice = await loadOrSeedInvoice(order.id);
  if (!invoice) { res.status(404).json({ error: "Order not found" }); return; }
  res.json(invoice);
});
```

Use a local helper that matches the existing account order ownership query: normalize the session username to bare and `@` forms, require `deletedAt IS NULL`, and compare the requested order ID. Reuse that helper in GET, PUT, and PDF routes so no route accidentally omits the ownership gate.

For PUT:

```ts
const parsed = invoiceDocumentSchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid invoice" });
  return;
}
const saved = await saveInvoice(order.id, parsed.data);
if (!saved) { res.status(404).json({ error: "Order not found" }); return; }
res.json(saved);
```

Catch active-refund errors as 409 and validation/database errors as 400, matching the admin route. For PDF, load the owned invoice, set `Content-Type: application/pdf` and a sanitized `Content-Disposition`, then send `buildInvoicePdf(invoice)`.

- [ ] **Step 4: Run the member route tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/member-invoices.test.ts
```

Expected: PASS for auth, ownership, body validation, save delegation, currency preservation, PDF content type, and refund conflict mapping.

### Task 3: Make the invoice editor transport-configurable

**Files:**
- Modify: `artifacts/peps-anonymous/src/components/invoice/InvoiceEditor.tsx`
- Test: `artifacts/peps-anonymous/src/components/invoice/InvoiceEditor.test.tsx`

- [ ] **Step 1: Write failing component contract tests**

Add a member-mode render test that mocks `fetch`, renders:

```tsx
<InvoiceEditor
  orderId="order-1"
  access={{ kind: "member" }}
/>
```

Assert the initial request is `/api/account/orders/order-1/invoice` with `credentials: "include"` and no `x-admin-secret` header. Assert the currency `<select>` contains GBP, EUR, and USD and remains enabled.

Keep an admin-mode test proving `adminSecret="__admin_session__"` continues to use `/api/admin/orders/order-1/invoice` with credentials and does not send an admin-secret header.

- [ ] **Step 2: Run the component test and confirm it fails**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec vitest run src/components/invoice/InvoiceEditor.test.tsx
```

Expected: FAIL because `InvoiceEditor` only accepts `adminSecret`.

- [ ] **Step 3: Add an access configuration**

Use a discriminated union so the component cannot silently mix auth modes:

```ts
type InvoiceEditorAccess =
  | { kind: "admin"; adminSecret: string }
  | { kind: "member" };

type InvoiceEditorProps = {
  orderId: string;
  access?: InvoiceEditorAccess;
  adminSecret?: string;
  onSaved?: (invoice: InvoiceDocument) => void;
};
```

Preserve the existing `adminSecret` prop as a compatibility alias for the current admin caller, but normalize it internally to admin access. Default the component to admin only when `adminSecret` is supplied; member callers must pass `{ kind: "member" }`.

Build the three paths from access:

```ts
const basePath = access.kind === "member"
  ? `/api/account/orders/${encodeURIComponent(orderId)}/invoice`
  : `/api/admin/orders/${encodeURIComponent(orderId)}/invoice`;
const requestHeaders = (json = false): HeadersInit => ({
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...(access.kind === "admin" && access.adminSecret !== "__admin_session__"
    ? { "x-admin-secret": access.adminSecret }
    : {}),
});
```

Use `${basePath}-pdf` for download. Keep the existing form fields, including the currency select backed by `INVOICE_CURRENCIES`, and pass the saved invoice to `onSaved`.

- [ ] **Step 4: Run frontend component and type checks**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec vitest run src/components/invoice/InvoiceEditor.test.tsx
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: PASS, with admin and member request contracts verified.

### Task 4: Add the member order-summary entry point

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/AccountOrderDetail.tsx`
- Test: `artifacts/peps-anonymous/src/pages/AccountOrderDetail.test.tsx` or an existing page contract test if the artifact uses source-contract tests.

- [ ] **Step 1: Write the failing UI contract test**

Assert the page includes an invoice editor state and renders an **Edit invoice** action in the Actions card for an authenticated member order. The test should also assert the action is not available in `adminPreview` mode and that an active refund displays the existing locked-actions message instead.

- [ ] **Step 2: Run the page test and confirm it fails**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec vitest run src/pages/AccountOrderDetail.test.tsx
```

Expected: FAIL because no member invoice state or action exists.

- [ ] **Step 3: Add inline member invoice editing**

Import `InvoiceEditor`. Add:

```ts
const [invoiceEditing, setInvoiceEditing] = useState(false);
```

Render a full-width invoice editor panel from the existing detail page when `invoiceEditing` is true. Use `access={{ kind: "member" }}` and provide:

```tsx
onSaved={(saved) => {
  setInvoiceEditing(false);
  setOrder(prev => prev ? {
    ...prev,
    productSubtotal: Number(saved.subtotal),
    grandTotal: Number(saved.total),
    deliveryPrice: Number(saved.shippingCost),
    notes: saved.notes || null,
  } : prev);
  window.scrollTo({ top: 0, behavior: "smooth" });
}}
```

Add a back/close control that returns to the unchanged order detail view without losing the order fetch state. The editor itself owns invoice loading and save errors.

In the Actions card, add an **Edit invoice** button for all non-admin-preview member orders when `refundActive` is false. Do not reuse `EDITABLE_STATUSES` or `isPaidOrder`; the selected requirement explicitly includes paid orders. Keep the existing order-edit and receipt actions unchanged.

- [ ] **Step 4: Run the page test and frontend typecheck**

Run:

```bash
pnpm --filter @workspace/peps-anonymous exec vitest run src/pages/AccountOrderDetail.test.tsx
pnpm --filter @workspace/peps-anonymous run typecheck
```

Expected: PASS, including paid-order visibility and post-save summary refresh.

### Task 5: Verify the complete feature

**Files:**
- No new production files.
- Modify tests only if verification exposes a contract mismatch.

- [ ] **Step 1: Run all focused tests**

Run:

```bash
pnpm --filter @workspace/api-server exec vitest run src/routes/member-invoices.test.ts
pnpm --filter @workspace/peps-anonymous exec vitest run src/components/invoice/InvoiceEditor.test.tsx src/pages/AccountOrderDetail.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 2: Build both artifacts**

Run:

```bash
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/peps-anonymous run build
```

Expected: both builds complete without TypeScript or bundler errors.

- [ ] **Step 3: Restart the canonical workflow and inspect logs**

Restart only the configured `Start application` workflow, then refresh logs. Confirm the API and frontend start without invoice-route or module-import errors.

- [ ] **Step 4: Verify the member path in the running preview**

Open an authenticated member order detail in the preview and verify:

1. **Edit invoice** is visible on a paid order.
2. The editor loads through `/api/account/orders/:id/invoice`.
3. GBP/EUR/USD are selectable.
4. Changing currency changes the preview denomination.
5. Saving updates the order summary totals and closes the editor.
6. PDF download uses the member endpoint.
7. An order belonging to another member returns 404.

- [ ] **Step 5: Review the final diff**

Run:

```bash
git diff --check
git status --short
```

Confirm only the invoice service/routes/editor/member order-detail/test files and the design/plan documents are changed.