import { beforeEach, expect, it, vi } from "vitest";
const { route } = vi.hoisted(() => ({ route: vi.fn() }));
vi.mock("@workspace/db", async () => ({
  ...await import("@workspace/db/schema"), db: {},
}));
vi.mock("./group-buy-delivery-routing-service", () => ({ resolveGroupOrderRoute: route }));
import { moveOrderGroup } from "./move-order-group";

const order = {
  id: "o", groupBuyId: null, telegramUsername: "@member", deliveryMethodId: "royal-mail",
  shippingCountry: "United Kingdom", reshipperUsername: null,
};
function database() {
  const reads = [[order], [{ id: "target" }], [{ quantity: "2.00" }]];
  const set = vi.fn(() => ({ where: () => ({ returning: async () => [{ id: "o" }] }) }));
  const insert = vi.fn(() => ({ values: () => ({ onConflictDoNothing: async () => {} }) }));
  const tx: any = {
    select: () => ({ from: () => ({ where: () => {
      const result = Promise.resolve(reads.shift());
      return Object.assign(result, { for: () => result });
    } }) }),
    update: () => ({ set }), insert,
  };
  return { transaction: (callback: any) => callback(tx), set, insert, tx };
}
beforeEach(() => { route.mockReset(); });
it("moves the group and saves its resolved reshipper in one transaction", async () => {
  const db = database();
  route.mockResolvedValue({ routingType: "reshipper", reshipperUsername: "@hub" });
  await expect(moveOrderGroup(db, "o", "target")).resolves.toMatchObject({ previousGbId: null });
  expect(db.set).toHaveBeenCalledWith({
    groupBuyId: "target", reshipperUsername: "@hub", routingType: "reshipper",
    reshipperCleared: false, countryLegId: null,
  });
  expect(route).toHaveBeenCalledWith(expect.objectContaining({
    gbId: "target", preferred: null, items: [{ quantity: 2 }],
  }), db.tx);
});
it("does not write the group or membership when the target cannot route the order", async () => {
  const db = database();
  route.mockRejectedValue(new Error("No enabled reshipper covers this country"));
  await expect(moveOrderGroup(db, "o", "target")).rejects.toThrow(/No enabled reshipper/);
  expect(db.set).not.toHaveBeenCalled();
  expect(db.insert).not.toHaveBeenCalled();
});
it.each([
  { routingType: "unrouted", reshipperUsername: null },
  { routingType: "direct", reshipperUsername: null },
])("preserves supported routing outcomes: %j", async resolved => {
  const db = database(); route.mockResolvedValue(resolved);
  await moveOrderGroup(db, "o", "target");
  expect(db.set).toHaveBeenCalledWith(expect.objectContaining(resolved));
});
