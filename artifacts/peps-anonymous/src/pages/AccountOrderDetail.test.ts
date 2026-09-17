import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AccountOrderDetail.tsx", import.meta.url), "utf8");

test("member order detail exposes invoice editing for paid orders", () => {
  assert.match(source, /InvoiceEditor/);
  assert.match(source, /invoiceEditing/);
  assert.match(source, /Edit invoice/);
  assert.match(source, /access=\{\{\s*kind:\s*"member"\s*\}\}/);
});

test("invoice editing is blocked while a refund is active", () => {
  const actions = source.slice(source.indexOf("{\/\* Actions \*\/}"), source.indexOf("{\/\* Delete order"));
  assert.match(actions, /refundActive/);
  assert.match(actions, /Refund request active/);
});