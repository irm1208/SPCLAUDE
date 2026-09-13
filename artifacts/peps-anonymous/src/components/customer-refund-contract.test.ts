import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(new URL("./CustomerRefundPanel.tsx", import.meta.url), "utf8");
const detail = readFileSync(new URL("../pages/AccountOrderDetail.tsx", import.meta.url), "utf8");
const hook = readFileSync(new URL("../hooks/use-account.ts", import.meta.url), "utf8");

test("customer refund copy and irreversible warning are present", () => {
  for (const copy of ["I want a refund", "Refund to account credits", "Refund in crypto", "Completed on-chain transfers cannot be reversed", "manually processes", "TXID"]) assert.match(panel, new RegExp(copy));
});
test("refund body excludes amount and response is authoritative", () => {
  assert.doesNotMatch(hook, /amountUsd.*body|body.*amountUsd/);
  assert.match(hook, /Promise<CustomerRefundView>/);
  assert.match(panel, /await onUpdated\?\.\(result\)/);
  assert.match(detail, /onUpdated=\{async \(view\)/);
});
test("active refund gates sensitive customer controls", () => {
  assert.match(detail, /disabled=\{refundActive\}/);
  assert.match(detail, /disabled=\{voteLoading \|\| !li\.productId \|\| refundActive\}/);
  assert.match(detail, /Refund request active/);
});