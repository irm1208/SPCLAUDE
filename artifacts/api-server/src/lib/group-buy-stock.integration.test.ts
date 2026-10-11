import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq, sql } from "drizzle-orm";
import { assertGroupStock, lockGroupStock, updateGroupStock } from "./group-buy-stock";

describe.skipIf(process.env.GROUP_STOCK_DB_TESTS !== "1")("group stock database isolation", () => {
  let store: typeof import("@workspace/db");
  const suffix = randomUUID();
  const a = `stock-a-${suffix}`, b = `stock-b-${suffix}`;
  const shared = `stock-shared-${suffix}`, foreign = `stock-foreign-${suffix}`;
  beforeAll(async () => {
    store = await import("@workspace/db");
    await store.db.insert(store.groupBuysTable).values([
      { id: a, name: "Temporary stock test A", status: "draft" },
      { id: b, name: "Temporary stock test B", status: "draft" },
    ]);
    await store.db.insert(store.productsTable).values([
      { id: shared, name: "Temporary shared stock test", price: "10.00", stock: 20, active: false },
      { id: foreign, name: "Temporary foreign stock test", price: "10.00", stock: 20, active: false },
    ]);
    await store.db.insert(store.groupBuyProductsTable).values([
      { id: randomUUID(), groupBuyId: a, productId: shared },
      { id: randomUUID(), groupBuyId: b, productId: shared },
      { id: randomUUID(), groupBuyId: b, productId: foreign },
    ]);
  });
  afterAll(async () => {
    if (!store) return;
    for (const id of [a, b]) await store.db.delete(store.groupBuysTable).where(eq(store.groupBuysTable.id, id));
    for (const id of [shared, foreign]) await store.db.delete(store.productsTable).where(eq(store.productsTable.id, id));
  });
  it("changes only this group's allocation, not the shared catalogue or another group", async () => {
    const result = await store.db.transaction(async tx => {
      await lockGroupStock(tx, a);
      return updateGroupStock(tx, a, [shared], "set", 3);
    });
    expect(result[0].stock).toBe(3);
    const [product] = await store.db.select().from(store.productsTable).where(eq(store.productsTable.id, shared));
    expect(product.stock).toBe(20);
    const other = await store.db.select().from(store.groupBuyProductsTable).where(eq(store.groupBuyProductsTable.groupBuyId, b));
    expect(other.every(row => row.stockOverride === null)).toBe(true);
  });
  it("rejects mixed-group IDs before updating anything", async () => {
    await expect(store.db.transaction(async tx => {
      await lockGroupStock(tx, a);
      return updateGroupStock(tx, a, [shared, foreign], "set", 100);
    })).rejects.toThrow("not part");
    const rows = await store.db.execute(sql`SELECT stock_override FROM group_buy_products WHERE group_buy_id = ${a}`);
    expect(Number(rows.rows[0].stock_override)).toBe(3);
  });
  it("blocks purchases above the limit but permits an available quantity", async () => {
    await expect(store.db.transaction(tx => assertGroupStock(tx, a, [{ productId: shared, quantity: 4 }]))).rejects.toThrow("Only 3 kits");
    await expect(store.db.transaction(tx => assertGroupStock(tx, a, [{ productId: shared, quantity: 3 }]))).resolves.toBeUndefined();
  });
  it("select-all stays group scoped and setting zero blocks purchases", async () => {
    const result = await store.db.transaction(async tx => {
      await lockGroupStock(tx, a);
      return updateGroupStock(tx, a, "all", "set", 0);
    });
    expect(result.map(row => row.id)).toEqual([shared]);
    await expect(store.db.transaction(tx => assertGroupStock(tx, a, [{ productId: shared, quantity: 1 }]))).rejects.toThrow("Only 0 kits");
  });
  it("serializes simultaneous updates without losing either increase", async () => {
    await Promise.all([2, 3].map(quantity => store.db.transaction(async tx => {
      await lockGroupStock(tx, a);
      await updateGroupStock(tx, a, "all", "increase", quantity);
    })));
    const rows = await store.db.execute(sql`SELECT stock_override FROM group_buy_products WHERE group_buy_id = ${a}`);
    expect(Number(rows.rows[0].stock_override)).toBe(5);
  });
});
