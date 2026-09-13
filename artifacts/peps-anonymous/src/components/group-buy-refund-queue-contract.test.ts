import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const queue = readFileSync(new URL("./GroupBuyRefundQueue.tsx", import.meta.url), "utf8");
const adminDetail = readFileSync(new URL("./admin/group-buys/GbDetailShell.tsx", import.meta.url), "utf8");
const organiser = readFileSync(new URL("../pages/GbOrganiser.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("./admin/group-buys/panels/DetailsPanel.tsx", import.meta.url), "utf8");

test("refund queue preserves exact manual-processing labels and endpoints", () => {
  for (const label of ["Customer", "Order", "Group buy", "Asset", "Network", "Refund amount", "Destination wallet", "Request date", "Processing attempts", "Complete credit refund", "Verify outgoing transfer", "Irreversible warning"]) {
    assert.match(queue, new RegExp(label));
  }
  assert.match(queue, /\/api\/admin\/group-buy-refunds/);
  assert.match(queue, /\/api\/organiser\/group-buy-refunds/);
  assert.match(queue, /credentials: role === "organiser" \? "include" : "omit"/);
  assert.match(queue, /body: JSON\.stringify\(\{ txid \}\)/);
  assert.match(queue, /setInterval/);
});

test("queue is navigable from admin detail and selected organiser group buy", () => {
  assert.match(adminDetail, /label: "Refunds"/);
  assert.match(adminDetail, /GroupBuyRefundQueue/);
  assert.match(organiser, /id: "refunds", label: "Refunds"/);
  assert.match(organiser, /<GroupBuyRefundQueue role="organiser" groupBuyId=\{selectedGb\.id\}/);
});

test("crypto refunds setting is admin-only and uses the exact PATCH field", () => {
  assert.match(settings, /Refunds are disabled by default/);
  assert.match(settings, /cryptoRefundsEnabled/);
  assert.match(settings, /PATCH/);
});