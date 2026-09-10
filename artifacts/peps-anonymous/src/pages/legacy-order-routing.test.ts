import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const accountOrdersSource = readFileSync(new URL("./AccountOrders.tsx", import.meta.url), "utf8");

test("signed-in order management never routes through the disabled PIN lookup page", () => {
  assert.match(
    accountOrdersSource,
    /setLocation\(`\/account\/orders\/\$\{(?:orderId|id)\}`\)/,
  );
  assert.doesNotMatch(accountOrdersSource, /setLocation\(`\/lookup\?code=/);
});

test("legacy lookup URLs use the account-session compatibility redirect", () => {
  assert.match(appSource, /import LegacyOrderRedirect from "(?:@\/pages|\.\/*pages)\/LegacyOrderRedirect"/);
  assert.match(appSource, /<Route path="\/lookup" component=\{LegacyOrderRedirect\}/);
  assert.doesNotMatch(appSource, /<Route path="\/lookup" component=\{Lookup\}/);
});