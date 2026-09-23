import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const accountSource = await readFile(new URL("./account.ts", import.meta.url), "utf8");
const adminSource = await readFile(new URL("./admin-invoices.ts", import.meta.url), "utf8");
const invoiceServiceSource = await readFile(new URL("../lib/invoice-service.ts", import.meta.url), "utf8");
const accountOrderDetailSource = await readFile(
  new URL("../../../peps-anonymous/src/pages/AccountOrderDetail.tsx", import.meta.url),
  "utf8",
);

describe("member invoice API contract", () => {
  it("exposes authenticated invoice document routes to the owning member", () => {
    expect(accountSource).toMatch(/router\.get\("\/account\/orders\/:id\/invoice", requireAccount/);
    expect(accountSource).toMatch(/router\.put\("\/account\/orders\/:id\/invoice", requireAccount/);
    expect(accountSource).toMatch(/router\.post\("\/account\/orders\/:id\/invoice-pdf", requireAccount/);
    expect(accountSource).toMatch(/requireOwnedInvoiceOrder/);
  });

  it("shares isolated invoice persistence with member and admin routes", () => {
    expect(accountSource).toMatch(/\bloadOrSeedInvoice\b/);
    expect(accountSource).toMatch(/\bsaveInvoice\b/);
    expect(adminSource).toMatch(/from "\.\.\/lib\/invoice-service"/);
    expect(adminSource).toMatch(/\bsaveInvoice\b/);
  });

  it("allows members and admins to generate custom invoice PDFs", () => {
    expect(accountSource).toMatch(/\bbuildInvoicePdf\b/);
    expect(adminSource).toMatch(/\bbuildInvoicePdf\b/);
  });

  it("exposes the custom invoice editor for paid orders", () => {
    expect(accountOrderDetailSource).toMatch(/<InvoiceEditor/);
    expect(accountOrderDetailSource).toMatch(/Edit invoice/);
    expect(accountOrderDetailSource).toMatch(/setInvoiceEditing/);
    expect(accountOrderDetailSource).toMatch(/access=\{\{\s*kind:\s*"member"\s*\}\}/);
  });

  it("keeps invoice edits isolated from the underlying order", () => {
    expect(invoiceServiceSource).not.toMatch(/tx\.delete\(orderLineItemsTable\)/);
    expect(invoiceServiceSource).not.toMatch(/tx\.update\(ordersTable\)\.set/);
    expect(accountOrderDetailSource).not.toMatch(/productSubtotal:\s*Number\(saved\.subtotal\)/);
    expect(accountOrderDetailSource).not.toMatch(/grandTotal:\s*Number\(saved\.total\)/);
  });
});