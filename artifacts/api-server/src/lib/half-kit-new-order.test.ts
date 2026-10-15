import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
// Schema-only import: no connection pool needed for transaction-contract tests.
vi.mock("@workspace/db", async () => ({ ...(await import("../../../../lib/db/src/schema")) }));
import { groupBuysTable, accountGroupBuysTable, gbHalfKitClaimsTable, gbHalfKitOffersTable } from "@workspace/db";
import { prepareNewOrderHalfKit, recordNewOrderHalfKit } from "./half-kit-offers";
import type { HalfKitCheckout } from "./half-kit-new-order-rules";

const intent: HalfKitCheckout = { offerId: "h1", productId: "p1", price: 30, version: 1, requestId: "12345678-1234-1234-1234-123456789abc" };
function fixture(status = "closed") {
  const group = { id: "g1", name: "GB", status, currency: "USDT", blockedAccounts: "[]", organiserId: "lead" };
  let published = true, version = 1;
  let held = Promise.resolve();
  const inserted: any[] = [], orders: string[] = [];
  async function transaction(username: string, checkout = intent, selectedCount = 1) {
    let release: (() => void) | undefined;
    const tx: any = {
      async execute(sql: any) {
        const query = new PgDialect().sqlToQuery(sql);
        if (query.params.includes("half-kit-money:g1")) {
          const previous = held; held = new Promise<void>(resolve => { release = resolve; }); await previous;
        }
        if (query.sql.includes('AS "productId"')) return { rows: [{
          productId: "p1", productName: "Ara-290 16mg", totalQuantity: published ? "0.5" : "1",
          defaultPrice: 40, maxPerCustomer: null,
          offerId: "h1", price: 30, deliveryCharge: 4, vendorShippingCharge: 7, published, version, currency: "USDT",
        }] };
        return { rows: [{ total: "0.5", own: "0", product: "0" }] };
      },
      select() {
        let table: any;
        const query: any = {
          from(value: any) { table = value; return query; }, where() { return query; }, for() { return query; }, limit() { return query; },
          then(resolve: any, reject: any) {
            const rows = table === groupBuysTable ? [group] : table === accountGroupBuysTable ? [{ id: "member" }]
              : table === gbHalfKitClaimsTable ? inserted.filter(claim => claim.offerVersion === checkout.version) : [];
            return Promise.resolve(rows).then(resolve, reject);
          },
        };
        return query;
      },
      update(table: any) {
        expect(table).toBe(gbHalfKitOffersTable);
        return { set: () => ({ where: () => ({ returning: async () => {
          if (!published || version !== checkout.version) return [];
          published = false; version++; return [{ id: "h1" }];
        } }) }) };
      },
      insert(table: any) {
        expect(table).toBe(gbHalfKitClaimsTable);
        return { values: async (claim: any) => { inserted.push({ ...claim, createdAt: new Date() }); } };
      },
    };
    try {
      const prepared = await prepareNewOrderHalfKit(tx, "g1", username, checkout, true, selectedCount);
      const order = { id: username, telegramUsername: username };
      await recordNewOrderHalfKit(tx, checkout, prepared.group, order, { id: `line-${username}`, productId: "p1", productName: "Ara-290 16mg" }, 0);
      orders.push(order.id);
      return order;
    } finally { release?.(); }
  }
  return { transaction, inserted, orders, group, isPublished: () => published };
}
describe("half-kit new-order transaction", () => {
  it("permits a published half after closing and records it against the new order", async () => {
    const f = fixture();
    await f.transaction("member");
    expect(f.orders).toEqual(["member"]);
    expect(f.inserted[0]).toMatchObject({ orderId: "member", lineItemId: "line-member", price: "30.00", deliveryCharge: "0.00", vendorShippingCharge: "0.00" });
    expect(f.isPublished()).toBe(false);
  });
  it("serializes competing members: one new order and one timed unavailable response", async () => {
    const f = fixture();
    const results = await Promise.allSettled([f.transaction("first"), f.transaction("second")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(f.orders).toEqual(["first"]);
    expect(f.inserted).toHaveLength(1);
    expect((results[1] as PromiseRejectedResult).reason.code).toBe("HALF_KIT_TAKEN");
  });
  it("rejects a changed quote before creating any order", async () => {
    const f = fixture();
    await expect(f.transaction("member", { ...intent, price: 29 })).rejects.toThrow("price changed");
    expect(f.orders).toHaveLength(0);
    expect(f.isPublished()).toBe(true);
  });
  it("checks the whole selected basket against group and customer limits", async () => {
    for (const field of ["maxKitsTotal", "maxKitsPerCustomer"]) {
      const f = fixture();
      (f.group as any)[field] = 0.5;
      await expect(f.transaction("member", intent, 2)).rejects.toThrow("kit limit");
      expect(f.orders).toHaveLength(0);
      expect(f.inserted).toHaveLength(0);
      expect(f.isPublished()).toBe(true);
    }
  });
  it("does not let a publication bypass archived or blocked group settings", async () => {
    const archived = fixture("archived");
    await expect(archived.transaction("member")).rejects.toThrow("no longer accepts");
    const blocked = fixture();
    blocked.group.blockedAccounts = '["member"]';
    await expect(blocked.transaction("member")).rejects.toThrow("not allowed");
  });
});
