# Admin Invoice Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only invoice editor for every existing order with persisted invoice snapshots, server-authoritative totals, live preview, and A4 PDF download.

**Architecture:** Extend the existing Express/React/Drizzle application. A one-to-one `order_invoices` row stores seller/customer snapshots and editable invoice line items; admin routes lazily seed missing rows, validate and recalculate updates transactionally, and serve PDFs. A focused React editor is opened from the admin order detail workflow and uses the same invoice calculation model as the API.

**Tech Stack:** TypeScript, Drizzle ORM/PostgreSQL, Express 5, Zod, React, react-hook-form, Tailwind/shadcn-style local UI components, jsPDF.

---

### Task 1: Invoice domain model and calculations

**Files:**
- Create: `artifacts/api-server/src/lib/invoice.ts`
- Create: `artifacts/api-server/src/lib/invoice.test.ts`
- Create: `lib/db/src/schema/order-invoices.ts`
- Modify: `lib/db/src/schema/index.ts`

- [ ] **Step 1: Write failing calculation tests**

Test that a line with quantity `2`, unit price `12.50`, tax `20%`, and discount `5%` produces a net line subtotal of `23.75`, tax of `4.75`, and that shipping is included in the grand total. Test GBP/EUR/USD formatting and negative input rejection.

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run `pnpm --filter @workspace/api-server exec vitest run src/lib/invoice.test.ts`.
Expected: FAIL because the invoice calculation module does not exist.

- [ ] **Step 3: Implement the schema and domain module**

Define `InvoiceStatus`, `InvoiceCurrency`, `InvoiceParty`, `InvoiceLineItem`, `InvoiceDocument`, `calculateInvoiceTotals`, `formatInvoiceMoney`, `seedInvoiceFromOrder`, and Zod schemas. Use integer cents internally, round tax per line, clamp no values, and return decimal strings for persistence. Define the `order_invoices` table with `orderId` primary key, JSONB seller/customer/lineItems, metadata, notes/terms, shipping, totals, and timestamps.

- [ ] **Step 4: Export the schema and rerun tests**

Export `order-invoices` from `lib/db/src/schema/index.ts`, then run the focused test again. Expected: PASS.

### Task 2: Admin invoice API and PDF route

**Files:**
- Create: `artifacts/api-server/src/routes/admin-invoices.ts`
- Create: `artifacts/api-server/src/lib/invoice-pdf.ts`
- Create: `artifacts/api-server/src/routes/admin-invoices.test.ts`
- Modify: `artifacts/api-server/src/routes/index.ts`

- [ ] **Step 1: Write failing route contract tests**

Cover missing admin credentials (`401`/`403` according to the existing guard), lazy invoice creation from an order, invalid empty line item (`400`), and a valid update whose response totals are recalculated despite forged client totals. Cover PDF response headers (`application/pdf`, attachment filename).

- [ ] **Step 2: Run the route tests and verify the expected failure**

Run `pnpm --filter @workspace/api-server exec vitest run src/routes/admin-invoices.test.ts`.
Expected: FAIL because the router and handlers do not exist.

- [ ] **Step 3: Implement the read and update handlers**

Use `requireAdmin` from the existing admin route helpers. Load the order and line items, lazily insert a seeded invoice when absent, and return a normalized document. On `PUT`, validate bounded fields, call `calculateInvoiceTotals`, update `order_invoices`, replace `order_line_items`, and update `orders.productSubtotal`, `orders.grandTotal`, and `orders.notes` in one transaction after `assertNoActiveRefund`.

- [ ] **Step 4: Implement A4 PDF rendering**

Render the normalized invoice with jsPDF using A4 dimensions, seller/customer blocks, invoice metadata, item columns, tax/discount values, totals, notes, and terms. Return bytes with `Content-Type: application/pdf` and `Content-Disposition: attachment; filename="invoice-<safe-number>.pdf"`.

- [ ] **Step 5: Mount the router and rerun tests**

Mount `adminInvoicesRouter` after the existing admin authorization boundary. Rerun the focused route test. Expected: PASS.

### Task 3: Browser editor and preview

**Files:**
- Create: `artifacts/peps-anonymous/src/lib/invoice.ts`
- Create: `artifacts/peps-anonymous/src/components/invoice/InvoicePreview.tsx`
- Create: `artifacts/peps-anonymous/src/components/invoice/InvoiceLineItems.tsx`
- Create: `artifacts/peps-anonymous/src/components/invoice/InvoiceEditor.tsx`
- Create: `artifacts/peps-anonymous/src/components/invoice/InvoiceEditor.test.tsx`

- [ ] **Step 1: Write the component contract test**

Render an invoice with one line item, change its quantity, assert the preview total changes, click Add item and Remove, and assert row counts. Mock only the network boundary; exercise the real form and calculation code.

- [ ] **Step 2: Run the component test and verify the expected failure**

Run `pnpm --dir artifacts/peps-anonymous exec vitest run src/components/invoice/InvoiceEditor.test.tsx`.
Expected: FAIL because the components do not exist.

- [ ] **Step 3: Implement shared client types and preview**

Mirror the server invoice types and calculations in the client-safe module. Build an A4-like preview with a restrained admin palette, semantic headings, seller/customer columns, metadata, item table, totals, and notes/terms. Keep layout stable and responsive.

- [ ] **Step 4: Implement line-item editing and form sections**

Use `useFieldArray` for add/remove rows. Add seller, customer, metadata, shipping, notes, and terms sections using existing local `Input`, `Label`, `Button`, `Card`, and `Textarea` components. Show computed totals from watched values. Disable editing while saving and show validation messages.

- [ ] **Step 5: Implement save and download actions**

Fetch `GET /api/admin/orders/:id/invoice` on open, submit complete payload to `PUT`, then request `GET .../invoice-pdf`, create a blob URL, and download `invoice-<number>.pdf`. Invalidate/refetch the admin order query after save.

- [ ] **Step 6: Rerun the component test**

Run the focused component test. Expected: PASS.

### Task 4: Integrate with the admin order workflow

**Files:**
- Modify: `artifacts/peps-anonymous/src/pages/Admin.tsx`

- [ ] **Step 1: Identify the existing order detail action and add an invoice editor state**

Add `invoiceOrderId` state beside the existing selected order/detail state and an `Edit invoice` action on the order detail surface. Preserve the existing `x-admin-secret`/cookie auth behavior used by Admin.tsx.

- [ ] **Step 2: Render the editor in the existing dialog/sheet layer**

Render `InvoiceEditor` in a responsive dialog or full-width detail panel, pass `orderId`, `adminSecret`, and an `onSaved` callback that refreshes the order list/detail. Ensure the action is visible for every order and does not depend on order status.

- [ ] **Step 3: Run frontend typecheck and focused tests**

Run `pnpm --dir artifacts/peps-anonymous exec tsc -p tsconfig.json --noEmit` and the component test. Expected: exit 0 and PASS.

### Task 5: Database migration and end-to-end verification

**Files:**
- Create: `lib/db/drizzle/<generated-migration>.sql` (generated by Drizzle)
- Modify: `lib/db/drizzle/meta/*` (generated only)

- [ ] **Step 1: Generate the Drizzle migration**

Run the repository’s normal Drizzle migration command from `lib/db` after confirming the generated SQL creates `order_invoices` with the order foreign key and cascade delete.

- [ ] **Step 2: Run all focused verification**

Run `pnpm --filter @workspace/api-server exec vitest run src/lib/invoice.test.ts src/routes/admin-invoices.test.ts`, `pnpm --dir artifacts/peps-anonymous exec vitest run src/components/invoice/InvoiceEditor.test.tsx`, and `pnpm run typecheck`.

- [ ] **Step 3: Inspect the final diff and report limitations**

Run `git diff --check` and `git status --short`. Confirm unrelated pre-existing worktree changes are untouched. Report any inability to run DB-backed route tests when no database is configured.
