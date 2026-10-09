import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const admin = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
const sharedOrders = admin.split("function AdminWholesaleSharesTab(")[1].split("function AdminWholesaleTab(")[0];
const amountExpression = sharedOrders.match(/Amount due: <span[^>]*>\{([^}]+)\}/)[1];
const renderAmount = new Function("op", "money", `return ${amountExpression}`);
const money = value => `$${value.toFixed(2)}`;

test("admin shared-order payment displays Pending when shipping is not final", () => {
  assert.equal(renderAmount({ amountDue: null }, money), "Pending");
});

test("admin shared-order payment preserves known and zero amounts", () => {
  assert.equal(renderAmount({ amountDue: 480 }, money), "$480.00");
  assert.equal(renderAmount({ amountDue: 0 }, money), "$0.00");
});

test("admin shared-order payment contract and confirmation respect unknown amounts", () => {
  const paymentType = admin.split("type AdminShareOrganiserPayment = {")[1].split("};")[0];
  assert.match(paymentType, /amountDue: number \| null/);
  const confirmButton = admin.split("onClick={() => confirmOrgPayment(row.id)}")[1].split("</button>")[0];
  assert.match(confirmButton, /disabled=\{[^}]*op\.amountDue === null/);
});
