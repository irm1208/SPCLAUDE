import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const organiserSource = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");
const routeStart = organiserSource.indexOf(
  'router.delete("/organiser/group-buys/:gbId/orders/:orderId"',
);
const routeEnd = organiserSource.indexOf("\n});", routeStart);
const routeSource = organiserSource.slice(routeStart, routeEnd);

describe("organiser order deletion contract", () => {
  it("requires organiser authentication, owned GB access, and explicit delete permission", () => {
    expect(routeSource).toContain("requireOrganiser");
    expect(routeSource).toContain("gbOwner(req, gbId)");
    expect(routeSource).toContain("gb.organiserCanDeleteOrders");
  });

  it("only targets an active order in that GB", () => {
    expect(routeSource).toContain("eq(ordersTable.id, orderId)");
    expect(routeSource).toContain("eq(ordersTable.groupBuyId, gbId)");
    expect(routeSource).toContain("isNull(ordersTable.deletedAt)");
  });

  it("keeps refund protection and performs a recoverable soft delete", () => {
    expect(routeSource).toContain("refundMutableOrderWhere");
    expect(routeSource).toContain("deletedAt: new Date()");
    expect(routeSource).toContain('deletedBy: "organiser"');
    expect(routeSource).not.toContain(".delete(ordersTable)");
  });
});