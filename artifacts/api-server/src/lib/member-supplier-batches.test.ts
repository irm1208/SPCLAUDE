import { describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", async () => import("../../../../lib/db/src/schema"));
import { memberBatchSummary } from "./member-supplier-batches";
const order: any = { id: "order", code: "SECRET-CODE", username: "private-member", items: [{ productId: "p", productName: "Private product", quantity: 2 }] };
const batch: any = { id: "b", reference: "SB-001", state: "ordered", createdAt: new Date("2026-10-01Z"), orderedAt: new Date("2026-10-02Z"),
  snapshot: { region: { name: "EU" }, kits: 2, orders: [order], private: "do not expose" }, createdBy: "private-staff" };
const parcel: any = { batchId: "b", trackingStatus: "delivered", trackingNumber: "PRIVATE-TRACKING", notes: "PRIVATE-NOTES", contents: [{ orderId: "order", productId: "p", quantity: 2 }], receiptChecked: false, receipt: [] };
describe("member supplier batch projection", () => {
  it("returns only safe summary fields and does not equate carrier delivery with inspected receipt", () => {
    const result = memberBatchSummary(batch, [parcel], new Set(["b"]));
    expect(result).toEqual({ id: "b", reference: "SB-001", region: "EU", kits: 2, status: "Supplier packages arranged", isYourBatch: true, createdAt: "2026-10-01T00:00:00.000Z", orderedAt: "2026-10-02T00:00:00.000Z" });
    expect(JSON.stringify(result)).not.toMatch(/SECRET|PRIVATE|private|tracking|contents|username|snapshot/);
  });
  it("shows partial and complete inspected receipts, ignoring cancelled parcels", () => {
    const received = { ...parcel, receiptChecked: true, receipt: [{ orderId: "order", productId: "p", good: 1, damaged: 1 }] };
    expect(memberBatchSummary(batch, [received], new Set()).status).toBe("Part received by reshipper");
    received.receipt[0].good = 2;
    received.receipt[0].damaged = 0;
    expect(memberBatchSummary(batch, [received], new Set()).status).toBe("Received by reshipper");
    expect(memberBatchSummary(batch, [{ ...received, cancelledAt: new Date() }], new Set()).status).toBe("Ordered from supplier");
  });
  it("keeps prepared and released states accurate and does not mark a released batch as your active batch", () => {
    expect(memberBatchSummary({ ...batch, state: "prepared" }, [parcel], new Set()).status).toBe("Prepared");
    expect(memberBatchSummary({ ...batch, state: "released" }, [parcel], new Set(["b"]))).toMatchObject({ status: "Released — not ordered", isYourBatch: false });
  });
});
