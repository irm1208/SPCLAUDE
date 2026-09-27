import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildBalanceAnonPayUrl } from "../../pages/balance-anonpay-url";

const source = readFileSync(new URL("./GroupTracker.tsx", import.meta.url), "utf8");

test("organiser transaction details link AnonPay codes to the top-level session", () => {
  assert.match(source, /transaction\?\.id\.startsWith\("anonpay:"\)/);
  assert.match(source, /buildBalanceAnonPayUrl\(transaction\.id\.slice\("anonpay:"\.length\)\)/);
  assert.match(source, /<a href=\{anonPayUrl\}[^>]*target="_blank"[^>]*rel="noopener noreferrer"/);
  assert.match(source, /anonPayUrl \?[\s\S]*?<a[\s\S]*?<\/a>[\s\S]*?: transaction\.id/);
});

test("a completed AnonPay payment still opens its session, not the outgoing hash", () => {
  assert.equal(
    buildBalanceAnonPayUrl("SOTFnrYiVC|0xabcdef"),
    "https://trocador.app/en/anonpay/SOTFnrYiVC",
  );
});