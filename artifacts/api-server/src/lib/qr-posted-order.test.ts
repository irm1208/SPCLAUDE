import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { readFileSync } from "node:fs";
import { qrPostedOrderUpdate } from "./qr-posted-order";

describe("QR posted order status", () => {
  it("atomically advances submitted and processing orders to Shipped when posted", () => {
    const update = qrPostedOrderUpdate(true);
    expect(update.qrPosted).toBe(true);
    expect(update.status).toBeDefined();
    const query = new PgDialect().sqlToQuery(update.status!);
    expect(query.sql).toBe(
      'case when "orders"."status" in ($1, $2) then $3 else "orders"."status" end',
    );
    expect(query.params).toEqual(["Submitted", "Processing", "Shipped"]);
  });

  it("does not reverse shipment when unmarking posted", () => {
    expect(qrPostedOrderUpdate(false)).toEqual({ qrPosted: false });
  });

  it.each(["admin", "organiser"])("uses the status update in the %s QR action and returns the resulting status", route => {
    const source = readFileSync(new URL(`../routes/${route}.ts`, import.meta.url), "utf8");
    const handler = source.slice(source.indexOf('router.patch("', source.indexOf("// ─── PATCH /api/admin/orders/:id/qr-posted") >= 0
      ? source.indexOf("// ─── PATCH /api/admin/orders/:id/qr-posted")
      : source.indexOf("// PATCH /api/organiser/group-buys/:id/orders/:orderId/qr-posted")));
    const body = handler.slice(0, handler.indexOf("\n});"));
    expect(body).toContain(".set(qrPostedOrderUpdate(posted))");
    expect(body).toContain("status: ordersTable.status");
    expect(body).toContain("status: updated.status");
    expect(body).toContain("refundMutableOrderWhere");
  });
});
