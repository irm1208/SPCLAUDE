import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../pages/Admin.tsx", import.meta.url), "utf8");
const fs3 = source.slice(source.indexOf("function Fs3Content("), source.indexOf("function Fs3Content(") + 160000);
const row = fs3.slice(fs3.indexOf("const renderWsRow"), fs3.indexOf("if (loading)"));

test("FS3 wholesale rows show credit amount and the total after credits", () => {
  assert.match(row, /CreditPaymentPill creditsApplied=\{o\.creditsApplied\}/);
  assert.match(row, /getCreditAdjustedTotal\(o\.grandTotal, o\.creditsApplied\)/);
  assert.match(row, /Order total/);
  assert.match(row, /After credits/);
});

test("FS3 shared headers use the server's platform receipts, not combined order value", () => {
  assert.match(fs3, /Platform received/);
  assert.match(fs3, /meta\?\.platformPaymentReceived == null/);
  assert.match(fs3, /Not recorded/);
  assert.match(fs3, /meta\.platformPaymentReceived\.toFixed\(2\)/);
});

test("FS3 platform confirmation reloads authoritative receipt metadata", () => {
  const confirm = fs3.slice(fs3.indexOf("const confirmSharedOrganiserPayment"), fs3.indexOf("const confirmSharedOrganiserPayment") + 4000);
  assert.match(confirm, /receivedAmountUsd/);
  assert.match(confirm, /JSON\.stringify\(\{ receivedAmountUsd \}\)/);
  assert.match(confirm, /await fetch\(apiUrl\("\/admin\/wholesale-shares\?status=all"\)/);
});
