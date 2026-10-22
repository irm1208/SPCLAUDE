import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../orders.ts", import.meta.url), "utf8");
const start = source.indexOf('router.post("/orders",');
const checkout = source.slice(start, source.indexOf("const tgError = validateTg(tg)", start));
describe("checkout account identity", () => {
  it("derives the order owner from the validated session before trusting the submitted username", () => {
    expect(checkout).toContain("resolveOrderUsername(req.account?.telegramUsername, submittedUsername)");
    expect(checkout).toContain("telegramUsername: submittedUsername");
    expect(checkout).not.toContain("const tg = normalizeTg(telegramUsername)");
    expect(checkout.indexOf("await requireAccount(req, res, next)"))
      .toBeLessThan(checkout.indexOf("resolveOrderUsername(req.account?.telegramUsername, submittedUsername)"));
  });
  it("keeps the wholesale form tied to the account and prevents editing its owner", () => {
    const page = readFileSync(new URL("../../../../peps-anonymous/src/pages/WholesaleOrder.tsx", import.meta.url), "utf8");
    expect(page).toContain('telegramUsername: `@${account.telegramUsername.trim().replace(/^@/, "")}`');
    const username = page.slice(page.indexOf("value={telegramUsername}"), page.indexOf('placeholder="username"'));
    expect(username).toContain("readOnly");
    expect(username).not.toContain("onChange");
  });
  it("uses account identity on review and the saved identity on the receipt", () => {
    const page = readFileSync(new URL("../../../../peps-anonymous/src/pages/Review.tsx", import.meta.url), "utf8");
    expect(page.includes("telegramUsername: checkoutUsername")).toBe(true);
    expect(page.includes("telegramUsername: data.telegramUsername ?? checkoutUsername")).toBe(true);
  });
});
