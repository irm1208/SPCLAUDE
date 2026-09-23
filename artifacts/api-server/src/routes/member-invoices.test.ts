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
  it("does not expose invoice document routes to members", () => {
    expect(accountSource).not.toMatch(/router\.(?:get|put|post)\("\/account\/orders\/:id\/invoice/);
  });

  it("reserves invoice persistence for admin routes", () => {
    expect(accountSource).not.toMatch(/\bloadOrSeedInvoice\b/);
    expect(accountSource).not.toMatch(/\bsaveInvoice\b/);
    expect(adminSource).toMatch(/from "\.\.\/lib\/invoice-service"/);
    expect(adminSource).toMatch(/\bsaveInvoice\b/);
  });

  it("reserves invoice PDF generation for admin routes", () => {
    expect(accountSource).not.toMatch(/\bbuildInvoicePdf\b/);
    expect(adminSource).toMatch(/\bbuildInvoicePdf\b/);
  });

  it("does not expose an invoice editor to members", () => {
    expect(accountOrderDetailSource).not.toMatch(/<InvoiceEditor/);
    expect(accountOrderDetailSource).not.toMatch(/Edit invoice/);
    expect(accountOrderDetailSource).not.toMatch(/setInvoiceEditing/);
  });

  it("keeps invoice edits isolated from the underlying order", () => {
    expect(invoiceServiceSource).not.toMatch(/tx\.delete\(orderLineItemsTable\)/);
    expect(invoiceServiceSource).not.toMatch(/tx\.update\(ordersTable\)\.set/);
    expect(accountOrderDetailSource).not.toMatch(/productSubtotal:\s*Number\(saved\.subtotal\)/);
    expect(accountOrderDetailSource).not.toMatch(/grandTotal:\s*Number\(saved\.total\)/);
  });
});