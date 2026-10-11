import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const organiserSource = await readFile(new URL("./organiser.ts", import.meta.url), "utf8");
const adminSource = await readFile(new URL("./admin.ts", import.meta.url), "utf8");
const ordersSource = await readFile(new URL("./orders.ts", import.meta.url), "utf8");
const accountSource = await readFile(new URL("./account.ts", import.meta.url), "utf8");

describe("organiser credit payment data contract", () => {
  it("returns creditsApplied with organiser order rows", () => {
    expect(organiserSource).toMatch(/creditsApplied:\s*ordersTable\.creditsApplied/);
  });

  it("filters both admin order endpoints by applied credit", () => {
    expect(adminSource).toMatch(/creditsApplied:\s*creditsAppliedQ/);
    expect(adminSource).toMatch(/sql`\$\{ordersTable\.creditsApplied\} > 0`/);
    expect(adminSource).toMatch(/\/admin\/orders\/ids/);
  });
});

describe("group-buy credit policy entry points", () => {
  it("rejects disabled credits before order creation and rechecks both credit-spend transactions", () => {
    expect(ordersSource).toMatch(/gb\.allowCredits === false/);
    expect(ordersSource).toMatch(/groupBuyCreditsAllowed\(lockedParent\.groupBuyId/);
    expect(ordersSource).toMatch(/groupBuyCreditsAllowed\(normalizedGroupBuyId/);
    expect(ordersSource).toMatch(/creditPolicyBlocked = true;\s*return;/);
  });
  it("checks existing-order spends after idempotent replay and before any deduction", () => {
    const route = accountSource.slice(accountSource.indexOf('router.post("/account/use-credits"'));
    const guard = route.indexOf("groupBuyCreditsAllowed(orderRow.groupBuyId");
    expect(guard).toBeGreaterThan(route.indexOf("idempotent: true"));
    expect(guard).toBeLessThan(route.indexOf(".update(accountsTable)"));
    expect(route).toMatch(/result\.kind === "credits_disabled".*res\.status\(403\)/);
  });
  it("exposes the flag to payment views and preserves the flag when cloning", () => {
    expect(accountSource).toMatch(/groupBuyAllowCredits = gb\?\.allowCredits \?\? false/);
    expect(organiserSource).toMatch(/allowCredits: source\.allowCredits \?\? true/);
  });
});