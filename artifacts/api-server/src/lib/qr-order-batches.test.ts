import { expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { readFileSync } from "node:fs";
vi.mock("@workspace/db", async () => import("../../../../lib/db/src/schema/index"));
import { qrOrderBatches } from "./qr-order-batches";

it("returns minimal, group-scoped active batch membership using positive split allocations", async () => {
  const where = vi.fn(async (_condition: unknown) => [
    { id: "first", reference: "GB-TEST / 001", state: "ordered", snapshot: { supplierCost: 999, orders: [
      { id: "split", username: "private", items: [{ quantity: 2, unitPrice: 200 }] },
      { id: "zero", items: [{ quantity: 0 }] },
      { id: "deleted", items: [{ quantity: 5 }] },
    ] } },
    { id: "second", reference: "GB-TEST / 002", state: "prepared", snapshot: { orders: [
      { id: "split", items: [{ quantity: 10 }] }, { id: "split", items: [{ quantity: 10 }] },
    ] } },
    { id: "released", reference: "Old", state: "released", snapshot: { orders: [{ id: "split", items: [{ quantity: 12 }] }] } },
  ]);
  const db = { select: vi.fn(() => ({ from: () => ({ where }) })) };
  const batches = await qrOrderBatches(db, "current-group", ["split", "zero"]);
  expect(batches).toEqual([
    { id: "first", reference: "GB-TEST / 001", orderIds: ["split"] },
    { id: "second", reference: "GB-TEST / 002", orderIds: ["split"] },
  ]);
  const query = new PgDialect().sqlToQuery(where.mock.calls[0][0]);
  expect(query.params).toContain("current-group");
  expect(query.params).toContain("released");
  expect(JSON.stringify(batches)).not.toMatch(/supplierCost|unitPrice|username|snapshot|deleted/);
});

it("adds the same minimal batch projection only inside both existing authorised QR endpoints", () => {
  for (const route of ["admin", "organiser"]) {
    const source = readFileSync(new URL(`../routes/${route}.ts`, import.meta.url), "utf8");
    const handler = source.slice(source.indexOf(`router.get("/${route}/group-buys/:id/all-orders-qr"`));
    const endpoint = handler.slice(0, handler.indexOf("\n});") + 4);
    expect(endpoint).toContain("qrOrderBatches(db, id,");
    expect(endpoint).toContain("gbName: gb.name, orders, batches");
    expect(endpoint.indexOf(route === "admin" ? "requireAdmin(req, res)" : 'res.status(403)')).toBeLessThan(endpoint.indexOf("qrOrderBatches("));
  }
});
