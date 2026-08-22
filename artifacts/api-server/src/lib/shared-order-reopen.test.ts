import { describe, expect, it } from "vitest";
import { buildSharedOrderReopenPlan } from "./shared-order-reopen";

describe("shared-order reopen plan", () => {
  it("preserves paid and pending orders, updates unpaid orders, and creates new ones", () => {
    expect(buildSharedOrderReopenPlan(
      [
        { id: "paid-member", orderId: "paid-order" },
        { id: "pending-member", orderId: "pending-order" },
        { id: "unpaid-member", orderId: "unpaid-order" },
        { id: "new-member", orderId: null },
      ],
      [
        { id: "paid-order", paymentStatus: "confirmed" },
        { id: "pending-order", paymentStatus: "pending_confirmation" },
        { id: "unpaid-order", paymentStatus: "unpaid" },
      ],
    )).toEqual({
      preserveOrderIds: ["paid-order", "pending-order"],
      updateUnpaidOrderIds: ["unpaid-order"],
      createOrderMemberIds: ["new-member"],
    });
  });

  it("treats a missing materialised order as a new order to create", () => {
    expect(buildSharedOrderReopenPlan(
      [{ id: "member", orderId: "stale-order" }],
      [],
    )).toEqual({
      preserveOrderIds: [],
      updateUnpaidOrderIds: [],
      createOrderMemberIds: ["member"],
    });
  });
});