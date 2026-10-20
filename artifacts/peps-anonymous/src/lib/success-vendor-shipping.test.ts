import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { shouldShowSuccessVendorShippingWarning } from "./success-vendor-shipping.ts";

const oldReceipt = { vendorShippingIsTbd: true };

test("switching the group-buy notice off overrides an older TBD receipt", () => {
  assert.equal(shouldShowSuccessVendorShippingWarning(oldReceipt, {
    vendorShippingEnabled: false, vendorShippingAmount: null,
  }), false);
});

test("included or fixed vendor shipping no longer shows the TBD warning", () => {
  for (const amount of [0, 5]) {
    assert.equal(shouldShowSuccessVendorShippingWarning(oldReceipt, {
      vendorShippingEnabled: true, vendorShippingAmount: amount,
    }), false);
  }
});

test("an outstanding TBD notice stays visible while unrelated orders stay clear", () => {
  const currentGroup = { vendorShippingEnabled: true, vendorShippingAmount: null };
  assert.equal(shouldShowSuccessVendorShippingWarning(oldReceipt, currentGroup), true);
  assert.equal(shouldShowSuccessVendorShippingWarning({ vendorShippingIsTbd: false }, currentGroup), false);
  assert.equal(shouldShowSuccessVendorShippingWarning({ ...oldReceipt, isWholesale: true }, currentGroup), false);
  assert.equal(shouldShowSuccessVendorShippingWarning(null, currentGroup), false);
  assert.equal(shouldShowSuccessVendorShippingWarning(oldReceipt, undefined), true);
});

test("confirmation uses current group settings and refreshes them when returning to the page", () => {
  const source = readFileSync(new URL("../pages/Success.tsx", import.meta.url), "utf8");
  assert.match(source, /useMyGroupBuys/);
  assert.match(source, /shouldShowSuccessVendorShippingWarning\(receipt,\s*currentGroupBuy\)/);
  assert.match(source, /addEventListener\("focus", refreshVendorShipping\)/);
  assert.doesNotMatch(source, /globalVendorWarning/);
});
