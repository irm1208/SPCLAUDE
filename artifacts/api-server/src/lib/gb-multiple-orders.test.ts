import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db, groupBuysTable, ordersTable } from "@workspace/db";
import { gbOrderPersonKey, getGbOrderCounts, multipleGbOrdersWhere, countMultipleGbOrderPeople } from "./gb-multiple-orders";
import { readFileSync } from "node:fs";

it("matches canonical handles, not display names, and keeps group buys separate", () => {
  expect(gbOrderPersonKey("one", "@Alice")).toBe(gbOrderPersonKey("one", "alice"));
  expect(gbOrderPersonKey("one", "alice")).not.toBe(gbOrderPersonKey("two", "alice"));
});

it("includes add-on metadata on the actual organiser group-buy order endpoint", () => {
  const source = readFileSync(new URL("../routes/organiser.ts", import.meta.url), "utf8");
  const endpoint = source.split('router.get("/organiser/group-buys/:id/orders",')[1]?.split('// GET /api/organiser/group-buys/:gbId/orders/:orderId/screenshot')[0] ?? "";
  expect(endpoint).toContain("additionOfOrderId: ordersTable.additionOfOrderId");
  expect(endpoint).toContain("multipleGbOrderCount:");
});

describe.skipIf(process.env.GB_MULTIPLE_DB_TESTS !== "1")("database multiple-order detection", () => {
  const groups = [randomUUID(), randomUUID()];
  const ids = Array.from({ length: 10 }, () => randomUUID());
  beforeAll(async () => {
    await db.insert(groupBuysTable).values(groups.map(id => ({ id, name: "Multiple-order test", status: "draft" })));
    await db.insert(ordersTable).values(ids.map((id, index) => ({
      id, code: `test-${id}`, groupBuyId: index === 6 ? groups[1] : groups[0],
      telegramUsername: index === 0 ? "@ALICE" : index < 7 ? "alice" : index === 7 ? "bob" : "",
      shippingName: "Same display name",
      deliveryMethod: "test", productSubtotal: "10", grandTotal: "10",
      status: index === 2 ? "Cancelled" : index === 3 ? "Draft" : "Submitted",
      deletedAt: index === 4 ? new Date() : null,
      additionOfOrderId: index === 5 ? ids[0] : null,
    })));
  });
  afterAll(async () => {
    await db.delete(ordersTable).where(inArray(ordersTable.id, ids));
    await db.delete(groupBuysTable).where(inArray(groupBuysTable.id, groups));
  });
  it("counts separate active orders, excluding add-ons, cancelled, drafts and deleted orders", async () => {
    const counts = await getGbOrderCounts(groups);
    expect(counts.get(gbOrderPersonKey(groups[0], "alice"))).toBe(2);
    expect(counts.get(gbOrderPersonKey(groups[1], "alice"))).toBe(1);
    expect(counts.has(gbOrderPersonKey(groups[0], ""))).toBe(false);
  });
  it("filters before pagination and reports people across the complete group buy", async () => {
    const where = and(eq(ordersTable.groupBuyId, groups[0]), multipleGbOrdersWhere());
    const rows = await db.select({ id: ordersTable.id, total: ordersTable.grandTotal }).from(ordersTable).where(where);
    expect(rows.map(row => row.id).sort()).toEqual(ids.slice(0, 2).sort());
    expect(rows.every(row => row.total === "10.00")).toBe(true);
    expect(await countMultipleGbOrderPeople(eq(ordersTable.groupBuyId, groups[0]))).toBe(1);
    expect(await countMultipleGbOrderPeople(eq(ordersTable.groupBuyId, groups[1]))).toBe(0);
  });
});
