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
  it("requires account authentication for member invoice routes", () => {
    expect(accountSource).toMatch(/router\.get\("\/account\/orders\/:id\/invoice", requireAccount/);
    expect(accountSource).toMatch(/router\.put\("\/account\/orders\/:id\/invoice", requireAccount/);
    expect(accountSource).toMatch(/router\.get\("\/account\/orders\/:id\/invoice-pdf", requireAccount/);
    expect(accountSource).toMatch(/router\.post\("\/account\/orders\/:id\/invoice-pdf", requireAccount/);
  });

  it("uses the same shared persistence service as admin", () => {
    expect(accountSource).toMatch(/loadOrSeedInvoice/);
    expect(accountSource).toMatch(/saveInvoice/);
    expect(adminSource).toMatch(/from "\.\.\/lib\/invoice-service"/);
  });

  it("checks legacy username forms and deleted-order filtering", () => {
    expect(accountSource).toMatch(/ordersTable\.telegramUsername/);
    expect(accountSource).toMatch(/ordersTable\.deletedAt/);
    expect(accountSource).toMatch(/tgBare/);
    expect(accountSource).toMatch(/tgWithAt/);
  });

  it("validates the invoice document before saving", () => {
    expect(accountSource).toMatch(/invoiceDocumentSchema\.safeParse\(req\.body\)/);
  });

  it("builds a PDF from the member invoice route", () => {
    expect(accountSource).toMatch(/buildInvoicePdf/);
    expect(accountSource).toMatch(/Content-Type", "application\/pdf"/);
  });

  it("keeps invoice edits isolated from the underlying order", () => {
    expect(invoiceServiceSource).not.toMatch(/tx\.delete\(orderLineItemsTable\)/);
    expect(invoiceServiceSource).not.toMatch(/tx\.update\(ordersTable\)\.set/);
    expect(accountOrderDetailSource).not.toMatch(/productSubtotal:\s*Number\(saved\.subtotal\)/);
    expect(accountOrderDetailSource).not.toMatch(/grandTotal:\s*Number\(saved\.total\)/);
  });
});