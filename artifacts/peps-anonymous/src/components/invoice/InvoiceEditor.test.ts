import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./InvoiceEditor.tsx", import.meta.url), "utf8");
const invoiceLib = readFileSync(new URL("../../lib/invoice.ts", import.meta.url), "utf8");

test("invoice editor supports a member access mode", () => {
  assert.match(source, /kind:\s*"member"/);
  assert.match(source, /\/api\/account\/orders/);
  assert.match(source, /credentials:\s*"include"/);
  assert.match(source, /resolvedAccess\.kind === "admin" && effectiveAdminSecret !== "__admin_session__"/);
});

test("invoice editor keeps the shared currency selector", () => {
  assert.match(source, /INVOICE_CURRENCIES\.map/);
  assert.match(source, /register\("currency"\)/);
  assert.match(invoiceLib, /INVOICE_CURRENCIES = \["GBP", "EUR", "USD"\]/);
});

test("admin invoice editor transport remains supported", () => {
  assert.match(source, /\/api\/admin\/orders/);
  assert.match(source, /x-admin-secret/);
});