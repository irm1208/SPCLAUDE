import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const paths = [
  "balance-crypto.ts", "account.ts", "admin.ts", "orders.ts", "organiser.ts",
  "group-buys-admin.ts", "gb-country-legs.ts", "wholesale-shares.ts", "../lib/half-kit-offers.ts",
];

describe("balance quote lifecycle", () => {
  it.each(paths)("invalidates quotes in direct amountDue writes in %s", path => {
    const text = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    let checked = 0;
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)
        && node.expression.name.text === "set" && node.arguments[0]) {
        const argument = node.arguments[0];
        const body = argument.getText(source);
        if (/\bamountDue\s*:/.test(body)) {
          checked++;
          expect(body, `${path}: ${body}`).toContain("balanceCryptoQuote: null");
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    // Half-kit writes use a variable update/balance object instead of a direct property.
    if (path !== "../lib/half-kit-offers.ts") expect(checked).toBeGreaterThan(0);
  });
  it("invalidates dynamically built admin updates, overrides and half-kit changes", () => {
    const admin = readFileSync(new URL("../admin.ts", import.meta.url), "utf8");
    expect(admin).toContain('if (updates.amountDue !== undefined || updates.balancePaymentStatus !== undefined) {\n    updates.balanceCryptoQuote = null;');
    expect(admin).toContain('if (Object.prototype.hasOwnProperty.call(patch, "amountDue")) {\n      patch.balanceCryptoQuote = null;');
    const offers = readFileSync(new URL("../../lib/half-kit-offers.ts", import.meta.url), "utf8");
    expect(offers).toContain("amountDue: numeric(number(order.amountDue) + amounts.cash),\n      balanceCryptoQuote: null,");
    expect(offers).toContain("...Object.fromEntries(Object.entries(balances).map(([key, value]) => [key, numeric(Math.max(0, value))])),\n        balanceCryptoQuote: null,");
    const wholesale = readFileSync(new URL("../wholesale-shares.ts", import.meta.url), "utf8");
    expect(wholesale).toContain("amountDue: update.amountDue.toFixed(2),\n      balanceCryptoQuote: null,");
  });
});
