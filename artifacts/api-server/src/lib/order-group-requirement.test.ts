import { expect, it, vi } from "vitest";
vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"),
  db: {},
}));
import { assertOrderGroupContext } from "./order-group-requirement";

function database(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  return { select: vi.fn(() => ({ from: () => ({ where: () => ({ limit }) }) })) };
}
it("rejects missing context for a product assigned to a group buy", async () => {
  await expect(assertOrderGroupContext(database([{ productId: "p" }]), {
    groupBuyId: null, isWholesale: false, productIds: ["p"],
  })).rejects.toThrow(/select.*group buy/i);
});
it("preserves genuine standalone ordering without group-specific products", async () => {
  await expect(assertOrderGroupContext(database([]), {
    groupBuyId: null, isWholesale: false, productIds: ["retail"],
  })).resolves.toBeUndefined();
});
it.each([
  { groupBuyId: "selected", isWholesale: false, productIds: ["p"] },
  { groupBuyId: null, isWholesale: true, productIds: ["p"] },
])("does not infer or override explicit group and wholesale contexts: %j", async input => {
  const db = database([{ productId: "p" }]);
  await expect(assertOrderGroupContext(db, input)).resolves.toBeUndefined();
  expect(db.select).not.toHaveBeenCalled();
});
