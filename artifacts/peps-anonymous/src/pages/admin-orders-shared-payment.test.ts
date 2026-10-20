import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const source = await readFile(new URL("./Admin.tsx", import.meta.url), "utf8");
const ordersTab = source.slice(source.indexOf("function OrdersTab("), source.indexOf("function BulkTrackingSection("));

test("Orders → Shared Order shows the organiser's platform-payment status separately from member payments", () => {
  assert.match(ordersTab, /\/admin\/wholesale-shares\?status=all/);
  assert.match(ordersTab, /organiserPaymentStatus/);
  assert.match(ordersTab, /Platform payment:/);
  assert.match(ordersTab, /\|\| orderView === "shared"/, "even a single visible member needs the shared-order payment card");
});

test("expanding a shared order exposes payment proof and the pending-only admin confirmation action", () => {
  assert.match(ordersTab, /\/admin\/wholesale-shares\/\$\{id\}/);
  assert.match(ordersTab, /Organiser → Platform Payment/);
  assert.match(ordersTab, /txHash/);
  assert.match(ordersTab, /\/admin\/wholesale-shares\/\$\{id\}\/confirm-organiser-payment/);
});

test("collapsed shared-order headers show fulfilment from the complete share summary", () => {
  const header = ordersTab.slice(ordersTab.indexOf("const renderSharedHeader"), ordersTab.indexOf("Platform payment:"));
  assert.match(header, /<SharedOrderFulfilmentPills/);
  assert.match(header, /statuses=\{paymentSummary\?\.orderStatusPills\}/);
  assert.match(header, /shareStatus=\{paymentSummary\?\.status\}/);
  assert.match(header, /unavailable=\{sharedPaymentSummaryError\}/);
});