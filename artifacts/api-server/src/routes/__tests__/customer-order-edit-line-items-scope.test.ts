import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../orders.ts", import.meta.url), "utf8");

describe("customer order edit line-item scope", () => {
  it("returns the prepared line items from the transaction for post-update side effects", () => {
    const start = source.indexOf('router.put("/orders/:orderId"');
    const end = source.indexOf('router.post("/orders/:orderId/shipping-address"', start);
    const route = source.slice(start, end);

    expect(route).toContain(
      "const { updatedOrder, insertedLineItems, lineItemsToInsert } = await db.transaction",
    );
    expect(route).toContain(
      "return { updatedOrder, insertedLineItems, lineItemsToInsert };",
    );
  });
});