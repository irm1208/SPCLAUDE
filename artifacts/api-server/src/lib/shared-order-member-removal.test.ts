import { describe, expect, it } from "vitest";
import { buildSharedOrderMemberRemovalPlan } from "./shared-order-member-removal";

const member = (overrides: Partial<Parameters<typeof buildSharedOrderMemberRemovalPlan>[0]["members"][number]> = {}) => ({
  id: "member-a",
  username: "alice",
  isCreator: false,
  orderId: "order-a",
  items: [{ quantity: 1, unitPrice: 100 }],
  tip: 0,
  shippingShare: 10,
  organiserFee: 0,
  kitFees: 0,
  adminAdjustmentFee: 0,
  ...overrides,
});

const order = (overrides: Partial<Parameters<typeof buildSharedOrderMemberRemovalPlan>[0]["orders"][number]> = {}) => ({
  id: "order-a",
  paymentStatus: "unpaid",
  vendorShipping: 10,
  grandTotal: 110,
  amountDue: 0,
  ...overrides,
});

describe("shared-order member removal", () => {
  it("removes multiple members in one plan and recalculates the remaining roster", () => {
    const result = buildSharedOrderMemberRemovalPlan({
      members: [
        member({ id: "creator", username: "organiser", isCreator: true, orderId: "order-creator" }),
        member({ id: "remove-1", username: "alice", orderId: "order-a", shippingShare: 10 }),
        member({ id: "remove-2", username: "bob", orderId: "order-b", shippingShare: 10 }),
        member({ id: "keep", username: "carol", orderId: "order-c", shippingShare: 10 }),
      ],
      orders: [
        order({ id: "order-creator" }),
        order({ id: "order-a" }),
        order({ id: "order-b" }),
        order({ id: "order-c" }),
      ],
      usernames: ["@alice", "bob"],
      splitMode: "even",
      totalShipping: 10,
    });

    expect(result.removedMembers.map(item => item.username)).toEqual(["alice", "bob"]);
    expect(result.retainedMembers.map(item => item.username)).toEqual(["organiser", "carol"]);
    expect(result.removedOrders).toEqual([
      { orderId: "order-a", paymentStatus: "unpaid", requiresPaymentReview: false },
      { orderId: "order-b", paymentStatus: "unpaid", requiresPaymentReview: false },
    ]);
    expect(result.retainedOrderUpdates.find(item => item.orderId === "order-c")).toMatchObject({
      shippingShare: 5,
      vendorShipping: 5,
      grandTotal: 105,
      amountDue: 0,
      paymentProtected: false,
    });
  });

  it("preserves a paid member's total and adds only a positive recalculation delta to amount due", () => {
    const result = buildSharedOrderMemberRemovalPlan({
      members: [
        member({ id: "creator", username: "organiser", isCreator: true, orderId: "order-creator" }),
        member({ id: "paid", username: "carol", orderId: "order-paid", shippingShare: 5 }),
        member({ id: "unpaid", username: "dave", orderId: "order-unpaid", shippingShare: 15 }),
      ],
      orders: [
        order({ id: "order-creator", vendorShipping: 5, grandTotal: 105 }),
        order({ id: "order-paid", paymentStatus: "confirmed", vendorShipping: 5, grandTotal: 105, amountDue: 2 }),
        order({ id: "order-unpaid", vendorShipping: 15, grandTotal: 115 }),
      ],
      usernames: ["dave"],
      splitMode: "even",
      totalShipping: 20,
    });

    expect(result.retainedOrderUpdates.find(item => item.orderId === "order-paid")).toMatchObject({
      shippingShare: 10,
      vendorShipping: 10,
      grandTotal: 110,
      amountDue: 7,
      paymentProtected: true,
    });
  });

  it("requires at least two retained members and never permits removing the organiser", () => {
    expect(() => buildSharedOrderMemberRemovalPlan({
      members: [
        member({ id: "creator", username: "organiser", isCreator: true }),
        member({ id: "alice", username: "alice", orderId: "order-alice" }),
      ],
      orders: [order(), order({ id: "order-alice" })],
      usernames: ["alice"],
      splitMode: "even",
      totalShipping: 10,
    })).toThrow(/at least 2/i);

    expect(() => buildSharedOrderMemberRemovalPlan({
      members: [
        member({ id: "creator", username: "organiser", isCreator: true }),
        member({ id: "alice", username: "alice", orderId: "order-alice" }),
        member({ id: "bob", username: "bob", orderId: "order-bob" }),
      ],
      orders: [order(), order({ id: "order-alice" }), order({ id: "order-bob" })],
      usernames: ["organiser"],
      splitMode: "even",
      totalShipping: 10,
    })).toThrow("organiser");
  });

  it("marks pending and confirmed removed orders for payment review", () => {
    const result = buildSharedOrderMemberRemovalPlan({
      members: [
        member({ id: "creator", username: "organiser", isCreator: true, orderId: "order-creator" }),
        member({ id: "pending", username: "alice", orderId: "order-pending" }),
        member({ id: "paid", username: "bob", orderId: "order-paid" }),
        member({ id: "keep", username: "carol", orderId: "order-keep" }),
      ],
      orders: [
        order({ id: "order-creator" }),
        order({ id: "order-pending", paymentStatus: "pending_confirmation" }),
        order({ id: "order-paid", paymentStatus: "confirmed" }),
        order({ id: "order-keep" }),
      ],
      usernames: ["alice", "bob"],
      splitMode: "even",
      totalShipping: 10,
    });

    expect(result.removedOrders).toEqual([
      { orderId: "order-pending", paymentStatus: "pending_confirmation", requiresPaymentReview: true },
      { orderId: "order-paid", paymentStatus: "confirmed", requiresPaymentReview: true },
    ]);
  });
});