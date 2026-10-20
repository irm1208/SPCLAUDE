import { beforeEach, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ returning: vi.fn(), set: vi.fn(), guard: vi.fn() }));
vi.mock("@workspace/db", async () => ({
  ...(await import("@workspace/db/schema")),
  db: { update: () => ({ set: mocks.set }) },
}));
vi.mock("./refund-mutation-guard", () => ({
  refundMutableOrderWhere: (where: unknown) => where,
  withRefundMutationGuard: async (db: unknown, ids: unknown, action: (db: unknown) => unknown) => { mocks.guard(ids); return action(db); },
}));
import { claimReshipperOrders, reshipperClaimWhere } from "./reshipper-order-claims";
const us = { country: "US", countries: ["US"], reshipperUsername: "us-a" };
beforeEach(() => {
  vi.clearAllMocks();
  mocks.set.mockReturnValue({ where: () => ({ returning: mocks.returning }) });
});
it("matches country snapshots without requiring a country leg and excludes ineligible orders", () => {
  const query = new PgDialect().sqlToQuery(reshipperClaimWhere("group", us, []));
  expect(query.params).toContain("us");
  expect(query.params).toContain("united states");
  expect(query.sql).toContain('"shipping_country"');
  expect(query.sql).toContain('"country_leg_id"');
  expect(query.sql).toContain('"reshipper_username" is null');
  expect(query.sql).toContain('"deleted_at" is null');
  expect(query.sql).toContain('"direct_shipping_requested" IS NOT TRUE');
  expect(query.params).toEqual(expect.arrayContaining(["Cancelled", "Shipped", "Delivered"]));
});
it("supports UK/GB and honours postage explicitly reserved for a different reshipper", () => {
  const query = new PgDialect().sqlToQuery(reshipperClaimWhere("group", { ...us, country: "UK", countries: ["UK"] }, [
    { id: "reserved", reshipperUsername: "another" }, { id: "open" },
  ]));
  expect(query.params).toEqual(expect.arrayContaining(["uk", "gb", "united kingdom", "reserved"]));
  expect(query.params).not.toContain("open");
});
it("updates ownership and route together, and only reports rows actually claimed", async () => {
  mocks.returning.mockResolvedValueOnce([{ id: "order", code: "123" }]).mockResolvedValueOnce([]);
  const won = await claimReshipperOrders("group", us, ["order", "order"], []);
  const lost = await claimReshipperOrders("group", { ...us, reshipperUsername: "us-b" }, ["order"], []);
  expect(won).toEqual([{ id: "order", code: "123" }]);
  expect(lost).toEqual([]);
  expect(mocks.set).toHaveBeenCalledWith({ reshipperUsername: "us-a", routingType: "reshipper" });
  expect(mocks.guard.mock.calls[0][0]).toEqual(["order"]);
});
