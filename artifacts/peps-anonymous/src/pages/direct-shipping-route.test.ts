import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const source = readFileSync(new URL("./OrderForm.tsx", import.meta.url), "utf8");
test("the order draft is initialized before any render-time draft access", () => {
  const body = source.slice(source.indexOf("export default function OrderForm()"));
  assert.ok(body.indexOf("const draft = useDraftStore()") < body.indexOf("draft."), "reading the draft before initialization crashes even before the user can choose a country");
});
test("the delivery dropdown is country-restricted and stale destinations cannot proceed", () => {
  assert.match(source, /groupBuyCountryOptions\(/);
  assert.match(source, /availableDeliveryCountries\.map/);
  assert.doesNotMatch(source, /COUNTRIES\.map/);
  assert.match(source, /!deliveryCountryAllowed/);
});
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
test("custom direct-shipping messages reach both picker views without replacing price or eligibility", () => {
  assert.match(source, /description: directShippingMessage \|\| "Shipped directly by the vendor\."/);
  assert.match(source, /directShippingMessage \|\| "Contact us for quote"/);
  assert.match(source, /directShippingMessage \|\| "Shipped direct by the vendor"/);
});
