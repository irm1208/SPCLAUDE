import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  rows: [] as any[], allocations: [] as any[], payments: [] as any[], written: [] as any[],
  identities: [{ id: "o1", code: "12656", telegramUsername: "member" }], images: [] as any[],
}));
vi.mock("@workspace/db", async () => ({
  ...(await import("../../../../../lib/db/src/schema/index")), db: {},
}));
vi.mock("../vendor-portal-service", () => ({
  auditVendor: vi.fn(async () => {}),
  loadVendorSource: vi.fn(async () => ({ fingerprint: "original", vendorIds: ["v1"], orders: state.identities })),
  inspectVendorSubmission: vi.fn(async (_: any, row: any) => ({
    stale: !!row.changed, source: { fingerprint: "original", vendorIds: ["v1"], items: [{ vendorId: "v1", lineTotal: "30.30" }] },
  })),
}));
import {
  ordersTable, vendorSubmissionsTable, vendorPaymentsTable, vendorPaymentAllocationsTable, vendorWalletsTable, vendorImagesTable,
} from "@workspace/db";
import { vendorPaymentDashboard, recordVendorPayment } from "../vendor-payments";
import { paymentReviewToken } from "../vendor-payment-ledger";

const wallet = { id: "w1", vendorId: "v1", currency: "USDC", network: "ERC-20", address: "0x" + "1".repeat(40) };
const snapshot = () => ({ currency: "USD", productCost: "20.20", shippingCost: "5", totalCost: "25.20",
  items: [{ productName: "Sample", quantity: 2, unitCost: "10.10", lineTotal: "20.20" }] });
const body = () => ({ vendorId: "v1", walletId: "w1", walletSnapshot: wallet,
  orderSnapshots: [{ submissionId: "s1", reviewToken: paymentReviewToken(state.rows[0]) }],
  submissionIds: ["s1"], txid: "0x" + "a".repeat(64), cryptoAmount: "25.20" });
const tx: any = {
  execute: async () => ({ rows: [] }),
  select: () => ({ from: (table: any) => {
    const rows = () => table === vendorSubmissionsTable ? state.rows
      : table === vendorPaymentAllocationsTable ? state.allocations
        : table === vendorPaymentsTable ? state.payments
          : table === vendorWalletsTable ? [wallet] : table === ordersTable ? state.identities : table === vendorImagesTable ? state.images : [];
    const query: any = { then: (ok: any, err: any) => Promise.resolve(rows()).then(ok, err) };
    for (const method of ["where", "orderBy", "for"]) query[method] = () => query;
    return query;
  } }),
  insert: (table: any) => ({ values: (value: any) => {
    state.written.push({ table, value });
    return { returning: async () => [{ ...value, paidAt: new Date(), recordedAt: new Date() }] };
  } }),
};
const database: any = { transaction: (fn: any) => fn(tx) };
beforeEach(() => {
  state.rows = [{ id: "s1", sourceKey: "order:o1", orderIds: ["o1"], vendorId: "v1", reference: "12656",
    status: "Submitted", sourceFingerprint: "original", submittedAt: new Date("2026-11-01"), snapshot: snapshot() }];
  state.allocations = []; state.payments = []; state.written = []; state.images = [];
});
describe("Admin supplier ledger integration without a database", () => {
  it("rejects unreviewed legacy requests before any receipt or allocation write", async () => {
    await expect(recordVendorPayment({ ...body(), orderSnapshots: undefined }, "admin", database)).rejects.toThrow(/review/i);
    expect(state.written).toHaveLength(0);
  });
  it("returns submitted cost details and complete eligible/held/paid totals", async () => {
    state.rows.push({ ...state.rows[0], id: "held", status: "On hold" }, { ...state.rows[0], id: "paid", changed: true });
    state.allocations = [{ submissionId: "paid", paymentId: "p1", amountUsd: "25.20" }];
    state.payments = [{ id: "p1", voidedAt: null }];
    const result = await vendorPaymentDashboard(tx, "v1");
    expect(result.orders[0]).toMatchObject({ sourceOrders: [{ id: "o1", code: "12656", username: "member" }], eligible: true, shippingCost: "5.00" });
    expect(result.orders[0]).toMatchObject({ canRemove: true, profit: { salesUsd: "30.30", amountUsd: "10.10" } });
    expect(result.orders[1]).toMatchObject({ eligible: false, paymentState: "needs_review" });
    expect(result.orders[1].canRemove).toBe(false);
    expect(result.orders[2].profit.amountUsd).toBeNull();
    expect(result.summary).toMatchObject({ owed: { amount: "25.20", count: 1 }, paid: { amount: "25.20", count: 1 }, needsReview: { amount: "25.20", count: 1 } });
  });
  it("reports photo-protected and payment-protected submissions as non-removable", async () => {
    state.images = [{ submissionId: "s1" }];
    expect((await vendorPaymentDashboard(tx, "v1")).orders[0]).toMatchObject({ canRemove: false, removalReason: expect.stringMatching(/photo/i) });
    state.images = []; state.allocations = [{ submissionId: "s1", paymentId: "p1", amountUsd: "25.20" }];
    state.payments = [{ id: "p1", voidedAt: null }];
    expect((await vendorPaymentDashboard(tx, "v1")).orders[0]).toMatchObject({ canRemove: false, removalReason: expect.stringMatching(/void/i) });
  });
  it("stores server-projected cost details, not caller-supplied receipt data", async () => {
    const result = await recordVendorPayment({ ...body(), detail: { totalCost: "0" } }, "admin", database);
    expect(result.orders[0]).toMatchObject({ amountUsd: "25.20", detail: {
      sourceOrders: [{ id: "o1", code: "12656", username: "member" }],
      productCost: "20.20", shippingCost: "5.00", totalCost: "25.20",
    } });
    state.rows[0].snapshot.items[0].unitCost = "99";
    expect(result.orders[0].detail.items[0].unitCost).toBe("10.10");
  });
  it("blocks on-hold and inconsistent snapshots at the write boundary too", async () => {
    state.rows[0].status = "On hold";
    await expect(recordVendorPayment(body(), "admin", database)).rejects.toThrow(/hold|payable|review/i);
    state.rows[0].status = "Submitted"; state.rows[0].snapshot.totalCost = "99";
    await expect(recordVendorPayment(body(), "admin", database)).rejects.toThrow(/cost|review/i);
    expect(state.written).toHaveLength(0);
  });
  it("does not classify an orphaned voided allocation as payable or as an active payment", async () => {
    state.allocations = [{ submissionId: "s1", paymentId: "voided", amountUsd: "25.20" }];
    state.payments = [{ id: "voided", voidedAt: new Date() }];
    const result = await vendorPaymentDashboard(tx, "v1");
    expect(result.orders[0]).toMatchObject({ eligible: false, paymentState: "needs_review" });
    expect(result.summary.paid.count).toBe(0);
  });
  it("rejects a shipment resubmitted after Admin reviewed the payment", async () => {
    const result = await vendorPaymentDashboard(tx, "v1");
    const reviewed = { ...body(), orderSnapshots: [{ submissionId: "s1", reviewToken: result.orders[0].reviewToken }] };
    state.rows[0].snapshot.shippingCost = "6"; state.rows[0].snapshot.totalCost = "26.20";
    await expect(recordVendorPayment(reviewed, "admin", database)).rejects.toThrow(/review|changed/i);
    expect(state.written).toHaveLength(0);
  });
  it("records the reviewed snapshot when it is unchanged", async () => {
    const result = await vendorPaymentDashboard(tx, "v1");
    const payment = await recordVendorPayment({
      ...body(), orderSnapshots: [{ submissionId: "s1", reviewToken: result.orders[0].reviewToken }],
    }, "admin", database);
    expect(payment.orders[0].amountUsd).toBe("25.20");
  });
});
