import { beforeEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), assertRefunds: vi.fn() }));
vi.mock("@workspace/db", async () => ({ ...await import("../../../../lib/db/src/schema"), db: { transaction: mocks.transaction } }));
vi.mock("./refund-mutation-guard", () => ({
  assertNoActiveRefunds: mocks.assertRefunds,
  refundMutableOrderWhere: (condition: unknown) => condition,
}));
const { parseAnonPayStatus, pendingPaymentStatusWhere, confirmAnonPayOrder, anonPayAmountMatches } = await import("./anonpay-order");
const snapshot = {
  id: "order-example", paymentStatus: "unpaid", paymentTxHash: "anonpay:session-example",
  grandTotal: "153.00", creditsApplied: 0, paymentUsdAmount: "153.00",
};
const dialect = new PgDialect();
const sqlOf = (value: Parameters<typeof dialect.sqlToQuery>[0]) => dialect.sqlToQuery(value);
beforeEach(() => { vi.clearAllMocks(); });

describe("AnonPay recovery", () => {
  it("accepts the real provider fields and normalises finished statuses", () => {
    expect(parseAnonPayStatus({ Status: " FINISHED ", "Payment Transaction Hash": "0xabc" }))
      .toEqual({ status: "finished", finished: true, outgoingHash: "0xabc" });
    expect(parseAnonPayStatus({ status: "anonpayfinished", HashTo: "legacy-hash" }).outgoingHash).toBe("legacy-hash");
    expect(parseAnonPayStatus({ Status: "waiting", "Payment Transaction Hash": null }).finished).toBe(false);
    expect(parseAnonPayStatus(null)).toEqual({ status: "", finished: false, outgoingHash: "" });
  });

  it("only adds unpaid AnonPay sessions, not unpaid crypto/fiat or all historical paid orders", () => {
    const query = sqlOf(pendingPaymentStatusWhere());
    expect(query.sql).toContain('"payment_status"');
    expect(query.sql).toContain('"payment_tx_hash" like');
    expect(query.params).toEqual(["pending_confirmation", "awaiting_payment", "test_confirmed", "unpaid", "anonpay:%"]);
    expect(query.params).not.toContain("confirmed");
  });

  it("confirms once with session/status/price CAS and leaves independent balances alone", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: snapshot.id }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const tx = { update: vi.fn().mockReturnValue({ set }) };
    mocks.transaction.mockImplementation(async fn => fn(tx));
    expect(await confirmAnonPayOrder(snapshot, "anonpay:session-example|0xabc")).toBe(true);
    expect(mocks.assertRefunds).toHaveBeenCalledWith(tx, [snapshot.id]);
    expect(set.mock.calls[0][0]).toEqual({
      paymentStatus: "confirmed", paymentConfirmedAt: expect.any(Date), paymentTxHash: "anonpay:session-example|0xabc",
    });
    const query = sqlOf(where.mock.calls[0][0]);
    expect(query.params).toEqual(expect.arrayContaining([snapshot.id, "unpaid", snapshot.paymentTxHash, "153.00", "0"]));
    expect(query.sql).toContain('"grand_total"');
    expect(query.sql).toContain('"credits_applied"');
    expect(query.sql).toContain('"payment_usd_amount"');
    expect(query.sql).toContain('"deleted_at" is null');
    returning.mockResolvedValue([]);
    expect(await confirmAnonPayOrder(snapshot, "anonpay:session-example|0xabc")).toBe(false);
    mocks.assertRefunds.mockRejectedValue(new Error("refund_active"));
    await expect(confirmAnonPayOrder(snapshot, "anonpay:session-example|0xabc")).rejects.toThrow("refund_active");
  });

  it("refuses another session, a settled order, or a non-AnonPay snapshot", async () => {
    expect(await confirmAnonPayOrder(snapshot, "anonpay:another-session|0xabc")).toBe(false);
    expect(await confirmAnonPayOrder({ ...snapshot, paymentStatus: "confirmed" }, snapshot.paymentTxHash)).toBe(false);
    expect(await confirmAnonPayOrder({ ...snapshot, paymentTxHash: "0xcrypto" }, snapshot.paymentTxHash)).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("does not confirm an old lower-value session against a changed order total", () => {
    expect(anonPayAmountMatches({ AmountTo: 153 }, "153.00", 0)).toBe(true);
    expect(anonPayAmountMatches({ AmountTo: "143.00" }, "153.00", 10)).toBe(true);
    expect(anonPayAmountMatches({ AmountTo: 153 }, "200.00", 0)).toBe(false);
    for (const AmountTo of [undefined, "", "NaN", -1, {}, "153.001"]) {
      expect(anonPayAmountMatches({ AmountTo }, "153.00", 0)).toBe(false);
    }
  });
});
