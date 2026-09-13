import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../organiser.ts", import.meta.url), "utf8");

describe("organiser order edit refund atomicity", () => {
  it("locks and checks the owned order before any line-item or parent write", () => {
    const start = source.indexOf('router.patch("/organiser/group-buys/:gbId/orders/:orderId"');
    const end = source.indexOf("\n});", start);
    const route = source.slice(start, end);
    const transaction = route.indexOf("db.transaction(async tx");
    const lock = route.indexOf('.for("update")', transaction);
    const refundCheck = route.indexOf("assertNoActiveRefund(tx, orderId)", transaction);
    const firstWrite = Math.min(
      ...["tx.delete(orderLineItemsTable)", "tx.update(orderLineItemsTable)", "tx.insert(orderLineItemsTable)", "tx.update(ordersTable)"]
        .map(anchor => route.indexOf(anchor, transaction))
        .filter(index => index >= 0),
    );
    expect(transaction).toBeGreaterThanOrEqual(0);
    expect(lock).toBeGreaterThan(transaction);
    expect(refundCheck).toBeGreaterThan(lock);
    expect(firstWrite).toBeGreaterThan(refundCheck);
  });

  it("uses conditional RETURNING checks for every existing line-item and parent mutation", () => {
    const start = source.indexOf('router.patch("/organiser/group-buys/:gbId/orders/:orderId"');
    const end = source.indexOf("\n});", start);
    const route = source.slice(start, end);
    expect(route).toContain(".delete(orderLineItemsTable)");
    expect(route).toContain(".update(orderLineItemsTable)");
    expect(route).toContain(".returning({ id: orderLineItemsTable.id })");
    expect(route).toContain("if (deleted.length !== 1) throw new RefundMutationBlockedError(orderId)");
    expect(route).toContain("if (changed.length !== 1) throw new RefundMutationBlockedError(orderId)");
    expect(route).toContain("if (!updatedRow) throw new RefundMutationBlockedError(orderId)");
  });
});