import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { annotateCompleteGbOrderCounts, isMultipleGbOrder } from "./gb-multiple-orders";

describe("original organiser multiple-order highlighting", () => {
  it("counts the complete GB before pagination and preserves financial values", () => {
    const orders = Array.from({ length: 36 }, (_, i) => ({
      id: String(i), telegramUsername: i === 0 ? "@ALICE" : i === 35 ? " alice " : `buyer${i}`,
      status: "Submitted", grandTotal: 10, lineItems: [{ quantity: 1 }],
    }));
    const result = annotateCompleteGbOrderCounts(orders);
    expect(result[0].multipleGbOrderCount).toBe(2);
    expect(result[35].multipleGbOrderCount).toBe(2);
    expect(result.filter(isMultipleGbOrder).map(o => o.id)).toEqual(["0", "35"]);
    expect(result.map(o => o.grandTotal)).toEqual(orders.map(o => o.grandTotal));
    expect(result[0].lineItems).toBe(orders[0].lineItems);
    expect(orders[0]).not.toHaveProperty("multipleGbOrderCount");
  });
  it("recalculates after cancellation or deletion and excludes additions, drafts and empty identities", () => {
    const orders = [
      { telegramUsername: "alice", status: "Submitted" },
      { telegramUsername: "alice", status: "Submitted" },
      { telegramUsername: "alice", status: "Cancelled" },
      { telegramUsername: "alice", status: "Draft" },
      { telegramUsername: "alice", status: "Submitted", additionOfOrderId: "parent" },
      { telegramUsername: "", status: "Submitted" },
      { telegramUsername: "", status: "Submitted" },
    ];
    expect(annotateCompleteGbOrderCounts(orders).filter(isMultipleGbOrder)).toHaveLength(2);
    expect(annotateCompleteGbOrderCounts(orders.filter((_, i) => i !== 1)).filter(isMultipleGbOrder)).toHaveLength(0);
    expect(annotateCompleteGbOrderCounts(orders.map((o, i) => i === 1 ? { ...o, status: "Cancelled" } : o)).filter(isMultipleGbOrder)).toHaveLength(0);
  });
  it("wires the warning, filter and badges into the original organiser Orders tab", () => {
    const source = readFileSync(new URL("../pages/GbOrganiser.tsx", import.meta.url), "utf8");
    const tab = source.split("function OrdersTab({ gb }")[1]?.split("\nfunction ")[0] ?? "";
    expect(tab).toContain("annotateCompleteGbOrderCounts(orders)");
    expect(tab).toContain("<GbMultipleOrderNotice");
    expect(tab).toContain("<GbMultipleOrderBadge order={o}");
    expect(tab).toContain("!multipleOnly || isMultipleGbOrder(o)");
  });
});
