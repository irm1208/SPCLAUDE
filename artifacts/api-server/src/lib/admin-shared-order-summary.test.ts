import { describe, expect, it } from "vitest";
import { buildAdminSharedOrderSummary } from "./admin-shared-order-summary";

const share = { status: "submitted", organiserPaymentStatus: "confirmed", organiserPaymentReceivedUsd: "102.00" };
const order = { status: "Processed", deletedAt: null, grandTotal: "130.00" };

describe("admin shared-order summaries", () => {
  it("keeps the received platform amount separate from member order totals", () => {
    expect(buildAdminSharedOrderSummary(share, [order])).toMatchObject({
      sharedOrderTotal: 130, platformPaymentReceived: 102,
      orderStatusPills: ["Paid", "Processed"],
    });
  });
  it("does not invent a received amount for historical confirmed payments", () => {
    expect(buildAdminSharedOrderSummary({ ...share, organiserPaymentReceivedUsd: null }, [order]).platformPaymentReceived).toBeNull();
  });
  it("does not count pending platform payments as received or member payments as platform paid", () => {
    expect(buildAdminSharedOrderSummary({ ...share, organiserPaymentStatus: "pending" }, [{ ...order, status: "Submitted" }])).toMatchObject({
      platformPaymentReceived: 0, orderStatusPills: [],
    });
  });
  it("uses real shipping states, excluding cancelled and deleted orders", () => {
    expect(buildAdminSharedOrderSummary(share, [
      { ...order, status: "Shipped" }, { ...order, status: "Delivered" },
      { ...order, status: "Cancelled" }, { ...order, deletedAt: new Date() },
    ])).toMatchObject({ sharedOrderTotal: 260, orderStatusPills: ["Paid", "Shipped"] });
  });
  it("does not claim every order shipped when only some have shipped", () => {
    expect(buildAdminSharedOrderSummary(share, [order, { ...order, status: "Shipped" }]).orderStatusPills).toEqual(["Paid", "Part shipped (1/2)"]);
  });
  it("marks cancellation without claiming paid/processed/shipped", () => {
    expect(buildAdminSharedOrderSummary({ ...share, status: "cancelled" }, [order]).orderStatusPills).toEqual(["Cancelled"]);
  });
  it("handles open shares without orders and invalid recorded amounts safely", () => {
    expect(buildAdminSharedOrderSummary({ ...share, status: "open", organiserPaymentReceivedUsd: "bad" }, [])).toMatchObject({
      sharedOrderTotal: 0, platformPaymentReceived: null, orderStatusPills: [],
    });
  });
  it("counts direct platform payments separately when members do not pay an organiser wallet", () => {
    expect(buildAdminSharedOrderSummary({ ...share, organiserHasWallet: false, organiserPaymentStatus: "unpaid" }, [
      { ...order, grandTotal: "110", paymentStatus: "confirmed" },
      { ...order, grandTotal: "20", paymentStatus: "pending" },
      { ...order, grandTotal: "50", paymentStatus: "test_confirmed", paymentTestAmount: "1.50" },
    ])).toMatchObject({ sharedOrderTotal: 180, platformPaymentReceived: 111.50, orderStatusPills: ["Processed"] });
  });
  it("marks direct payment paid only when every active order is fully confirmed", () => {
    expect(buildAdminSharedOrderSummary({ ...share, organiserHasWallet: false, organiserPaymentStatus: "unpaid" }, [
      { ...order, paymentStatus: "confirmed" }, { ...order, paymentStatus: "confirmed" },
    ]).orderStatusPills).toEqual(["Paid", "Processed"]);
  });
  it("does not erase a recorded direct receipt when an order is cancelled", () => {
    expect(buildAdminSharedOrderSummary({ ...share, status: "cancelled", organiserHasWallet: false }, [
      { ...order, status: "Cancelled", paymentStatus: "confirmed" },
    ])).toMatchObject({ platformPaymentReceived: 130, sharedOrderTotal: 130, orderStatusPills: ["Cancelled"] });
  });
  it("only counts additional balances once they are confirmed", () => {
    expect(buildAdminSharedOrderSummary({ ...share, organiserHasWallet: false, organiserPaymentStatus: "unpaid" }, [
      { ...order, paymentStatus: "confirmed", amountDue: "10", balancePaymentStatus: "pending" },
    ])).toMatchObject({ sharedOrderTotal: 140, platformPaymentReceived: 130, orderStatusPills: ["Processed"] });
  });
});
