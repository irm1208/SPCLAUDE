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
  assert.match(source, /description: freeDirectHomeShipping \? "Free direct-to-home shipping" : directShippingMessage \|\| "Shipped directly by the vendor\."/);
  assert.match(source, /directShippingMessage \|\| "Contact us for quote"/);
  assert.match(source, /directShippingMessage \|\| "Shipped direct by the vendor"/);
});
test("free HGH direct shipping is not treated as a pending quote", () => {
  assert.match(source, /freeDirectHomeShipping = hasFreeDirectHomeShipping\(gbId\)/);
  assert.match(source, /const shippingPending = !isTopUp && !selectedFreeDirectHome/);
  assert.match(source, /freeDirectHomeShipping \? "FREE" : "TBD"/);
});
test("direct-to-home checkout does not apply the EU onward-postage 25-kit cap", () => {
  assert.match(source, /if \(customEuPostage && !draft\.directShippingRequested && countKits\(draft\.lineItems\) > 25\)/);
});
test("Review action accepts 93 direct kits while retaining the onward-postage limit", () => {
  // Execute the actual click-handler body, not a duplicate of its validation rules.
  const body = source.match(/const handleReview = \(\) => \{([\s\S]*?)\n  \};/)?.[1];
  assert.ok(body, "Review click handler must be found");
  for (const [direct, quantity, shouldProceed] of [[true, 93, true], [false, 93, false], [false, 25, true]] as const) {
    let destination = "";
    let error = "";
    const context = {
      isPreview: false, gbId: "UAJBM", isTopUp: false,
      countryRulesLoaded: true, deliveryCountryAllowed: true, customEuPostage: true,
      draft: {
        orderId: null, directShippingRequested: direct,
        deliveryMethodId: direct ? "direct-shipping" : "eu-postage-DE",
        lineItems: [{ id: "item", productId: "hgh", quantity }],
        removeLineItem: () => assert.fail("Filled items must remain in the draft"),
      },
      countKits: (items: { quantity: number }[]) => items.reduce((sum, item) => sum + item.quantity, 0),
      setError: (message: string) => { error = message; },
      setLocation: (path: string) => { destination = path; },
    };
    new Function(...Object.keys(context), body)(...Object.values(context));
    assert.equal(destination, shouldProceed ? "/review" : "", `direct=${direct}, quantity=${quantity}`);
    assert.equal(error.includes("over 25 kits"), !shouldProceed);
  }
});
