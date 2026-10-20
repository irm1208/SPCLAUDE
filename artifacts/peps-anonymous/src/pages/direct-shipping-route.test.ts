import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const source = readFileSync(new URL("./OrderForm.tsx", import.meta.url), "utf8");
test("both direct-shipping entry points use kit eligibility rather than enabled alone", () => {
  assert.match(source, /countKits\(draft\.lineItems\) >= Number\(directShippingInfo\.minKits \?\? 30\)/);
  assert.match(source, /\.\.\.\(directShippingEligible \? \[/);
  assert.match(source, /gbId && directShippingEligible && directShippingInfo\?\.enabled/);
});
test("falling below the minimum clears only new order drafts, not previews or existing orders", () => {
  assert.match(source, /isPreview \|\| draft\.additionOfOrderId \|\| draft\.orderId \|\| !directShippingInfo/);
  assert.match(source, /draft\.directShippingRequested && !directShippingEligible/);
  assert.match(source, /draft\.setDirectShippingRequested\(false\)/);
});
