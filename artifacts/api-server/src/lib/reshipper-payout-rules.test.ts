import { describe, expect, it } from "vitest";
import {
  moneyToMinor, emptyPayoutLedger, reviewEntitlements, applyPayout, reversePayout, buildPayoutView, parsePayoutLedger,
  type FeeOrder,
} from "./reshipper-payout-rules";

const recipient = { id: "account-a", username: "reshipper-a" };
const now = "2026-10-20T12:00:00.000Z";
const order = (id = "order-1", extra: Partial<FeeOrder> = {}): FeeOrder => ({
  id, code: id, telegramUsername: "member", reshipperAccountId: recipient.id,
  paymentStatus: "confirmed", amountDue: "0.00", adminFee: "10.00", deliveryPrice: "20.00",
  status: "Submitted", deletedAt: null, refundStatus: null, routingType: "reshipper", paymentTxHash: "incoming-tx", ...extra,
});
const review = (ids = ["order-1"]) => ({
  reason: "Confirmed Admin collected these fees", orders: ids.map(orderId => ({ orderId, collector: "admin", adminFee: "10.00", postage: "20.00" })),
});
const payout = (extra: Record<string, unknown> = {}) => ({
  operationId: "11111111-1111-4111-8111-111111111111", amount: "15.00", currency: "USD",
  paidAt: "2026-10-20", method: "Crypto", reference: "outgoing-tx-1", destination: "Reshipper confirmed destination",
  confirmedDestination: true, note: "", allocations: [{ orderId: "order-1", adminFee: "10.00", postage: "5.00" }], ...extra,
});
describe("reshipper payout integrity", () => {
  it("uses exact integer money and rejects ambiguous or unsafe amounts", () => {
    expect(moneyToMinor("17.30")).toBe(1730);
    for (const invalid of ["NaN", "Infinity", "-1", "1.001", "1e3", "999999999.00", "", 2]) {
      expect(() => moneyToMinor(invalid)).toThrow();
    }
  });
  it("requires an explicit review rather than trusting current payment routing", () => {
    const ledger = emptyPayoutLedger();
    expect(buildPayoutView(ledger, [order()], "USD", recipient).orders[0].status).toBe("needs_review");
    expect(() => applyPayout(ledger, [order()], "USD", recipient, payout(), "Admin", now)).toThrow(/review/i);
    reviewEntitlements(ledger, [order()], "USD", recipient, review(), "Admin", now);
    expect(buildPayoutView(ledger, [order()], "USD", recipient).totals[0].owedMinor).toBe(3000);
  });
  it("supports component and partial payouts, idempotent retries and audited reversal", () => {
    const ledger = emptyPayoutLedger();
    reviewEntitlements(ledger, [order()], "USD", recipient, review(), "Admin", now);
    const receipt = applyPayout(ledger, [order()], "USD", recipient, payout(), "Admin", now);
    expect(applyPayout(ledger, [order()], "USD", recipient, payout(), "Admin", now).id).toBe(receipt.id);
    expect(ledger.payouts).toHaveLength(1);
    const view = buildPayoutView(ledger, [order()], "USD", recipient);
    expect(view.orders[0]).toMatchObject({ status: "part_paid", remainingAdminMinor: 0, remainingPostageMinor: 1500 });
    expect(view.totals[0]).toMatchObject({ entitledMinor: 3000, paidMinor: 1500, owedMinor: 1500 });
    expect(() => applyPayout(ledger, [order()], "USD", recipient, payout({ amount: "20.00" }), "Admin", now)).toThrow();
    expect(() => applyPayout(ledger, [order()], "USD", recipient, payout({ operationId: "22222222-2222-4222-8222-222222222222", reference: "different-transfer" }), "Admin", now)).toThrow();
    reversePayout(ledger, recipient.id, receipt.id, "Incorrect allocation", "Admin", now);
    reversePayout(ledger, recipient.id, receipt.id, "Retry", "Admin", now);
    expect(buildPayoutView(ledger, [order()], "USD", recipient).totals[0].owedMinor).toBe(3000);
    expect(ledger.payouts[0].voidReason).toBe("Incorrect allocation");
  });
  it("does not owe directly received fees again, or include vendor/postage-ledger receipts", () => {
    const ledger = emptyPayoutLedger();
    reviewEntitlements(ledger, [order()], "USD", recipient, {
      reason: "Reshipper already collected directly",
      orders: [{ orderId: "order-1", collector: "reshipper", adminFee: "10.00", postage: "20.00" }],
    }, "Admin", now);
    expect(buildPayoutView(ledger, [order()], "USD", recipient).orders[0].status).toBe("not_owed");
    expect(buildPayoutView(ledger, [order()], "USD", recipient).totals[0].owedMinor).toBe(0);
  });
  it("excludes unsettled/test/cancelled/deleted orders and freezes changed snapshots without erasing payment history", () => {
    for (const extra of [{ paymentStatus: "test_confirmed" }, { amountDue: "0.01" }, { status: "Cancelled" }, { deletedAt: now }, { refundStatus: "requested" }]) {
      const ledger = emptyPayoutLedger();
      expect(buildPayoutView(ledger, [order("order-1", extra)], "USD", recipient).orders).toHaveLength(0);
      expect(() => reviewEntitlements(ledger, [order("order-1", extra)], "USD", recipient, review(), "Admin", now)).toThrow();
    }
    const ledger = emptyPayoutLedger();
    reviewEntitlements(ledger, [order()], "USD", recipient, review(), "Admin", now);
    applyPayout(ledger, [order()], "USD", recipient, payout(), "Admin", now);
    const changed = order("order-1", { deliveryPrice: "25.00" });
    expect(buildPayoutView(ledger, [changed], "USD", recipient).orders[0]).toMatchObject({ status: "needs_review", paidAdminMinor: 1000, paidPostageMinor: 500 });
    expect(() => applyPayout(ledger, [changed], "USD", recipient, payout({ operationId: "33333333-3333-4333-8333-333333333333" }), "Admin", now)).toThrow();
    expect(ledger.payouts[0].amountMinor).toBe(1500);
  });
  it("protects ownership, allocation totals, currency and destination confirmation", () => {
    const ledger = emptyPayoutLedger();
    reviewEntitlements(ledger, [order()], "USD", recipient, review(), "Admin", now);
    for (const extra of [{ currency: "EUR" }, { amount: "15.01" }, { confirmedDestination: false }, { destination: "" }, { allocations: [] }]) {
      expect(() => applyPayout(ledger, [order()], "USD", recipient, payout(extra), "Admin", now)).toThrow();
    }
    const stranger = { id: "other-account", username: "other" };
    expect(buildPayoutView(ledger, [order()], "USD", stranger).payouts).toHaveLength(0);
    expect(() => reviewEntitlements(ledger, [order("order-1", { reshipperAccountId: stranger.id })], "USD", stranger, review(), "Admin", now)).toThrow(/owner|reshipper/i);
    expect(() => parsePayoutLedger('{"version":99}')).toThrow();
    expect(() => parsePayoutLedger("{broken")).toThrow();
  });
});
