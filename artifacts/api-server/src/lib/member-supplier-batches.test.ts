import { describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", async () => import("../../../../lib/db/src/schema"));
import { memberBatchSummary, memberDestinationCountries, memberRegionalProgress, memberCanViewBatch } from "./member-supplier-batches";
import { collectSupplierQueues } from "./supplier-batches-model";
const order: any = { id: "order", code: "SECRET-CODE", username: "private-member", items: [{ productId: "p", productName: "Private product", quantity: 2 }] };
const batch: any = { id: "b", reference: "SB-001", state: "ordered", createdAt: new Date("2026-10-01Z"), orderedAt: new Date("2026-10-02Z"),
  snapshot: { region: { name: "EU" }, kits: 2, orders: [order], private: "do not expose" }, createdBy: "private-staff" };
const parcel: any = { batchId: "b", trackingStatus: "delivered", trackingNumber: "PRIVATE-TRACKING", notes: "PRIVATE-NOTES", contents: [{ orderId: "order", productId: "p", quantity: 2 }], receiptChecked: false, receipt: [] };
describe("member supplier batch projection", () => {
  it("returns only safe summary fields and does not equate carrier delivery with inspected receipt", () => {
    const result = memberBatchSummary(batch, [parcel], new Set(["b"]));
    expect(result).toEqual({ id: "b", reference: "SB-001", region: "EU", kits: 2, targetKits: null, status: "Supplier packages arranged", isYourBatch: true, createdAt: "2026-10-01T00:00:00.000Z", orderedAt: "2026-10-02T00:00:00.000Z" });
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

const regions = [
  { id: "eu", name: "EU", countries: ["IT", "DE"], targetKits: 100 },
  { id: "uk", name: "United Kingdom", countries: ["GB"], targetKits: 100 },
  { id: "us", name: "United States", countries: ["US"], targetKits: 100 },
];
const paid = (id: string, country: string, quantity: number, extra: any = {}) => ({
  id, code: "SECRET-CODE", telegramUsername: "private", shippingCountry: country,
  status: "Submitted", paymentStatus: "confirmed", amountDue: "0", paymentConfirmedAt: new Date("2026-10-01Z"),
  lineItems: [{ productId: "p", productName: "Private product", quantity, unitPrice: "10", lineTotal: String(10 * quantity) }],
  ...extra,
});
describe("member regional privacy and queue progress", () => {
  it("uses active order destinations; falls back to joined/profile country only without a usable order destination", () => {
    expect([...memberDestinationCountries([paid("a", "Italy", 1)], "GB", "US")]).toEqual(["IT"]);
    expect([...memberDestinationCountries([paid("a", "US", 1, { status: "Cancelled" })], "UK", "US")]).toEqual(["GB"]);
    expect([...memberDestinationCountries([], null, "United States")]).toEqual(["US"]);
    expect([...memberDestinationCountries([], null, null)]).toEqual([]);
  });
  it("shares exact paid, non-direct, unallocated eligibility rules and preserves half kits", () => {
    const rows = [
      paid("eu1", "Italy", 17.5), paid("eu2", "Germany", 0.5), paid("uk", "UK", 34),
      paid("unpaid", "Italy", 200, { paymentStatus: "unpaid" }),
      paid("test", "Italy", 200, { paymentStatus: "test_confirmed" }),
      paid("balance", "Italy", 200, { amountDue: "1" }),
      paid("direct", "Italy", 30, { routingType: "direct" }),
      paid("refund", "Italy", 200, { activeRefund: true }),
      paid("allocated", "Italy", 200), paid("processed", "Italy", 200, { status: "Processing" }),
      paid("oos", "Italy", 200, { lineItems: [{ quantity: 200, isOos: true }] }),
    ];
    const config = { enabled: true, telegramAlerts: false, regions };
    const { queues } = collectSupplierQueues({ all: rows, used: [{ orderId: "allocated" }], elig: [], config });
    const progress = memberRegionalProgress(config, queues, new Set(["IT"]));
    expect(progress).toEqual([{ id: "eu", name: "EU", kits: 18, targetKits: 100, status: "Filling", yourOrderStatus: "not_included" }]);
    expect(JSON.stringify(progress)).not.toMatch(/private|SECRET|product|uk|United Kingdom/);
    expect(memberRegionalProgress(config, queues, new Set(["UK"]))[0]).toMatchObject({ id: "uk", kits: 34 });
    expect(memberRegionalProgress({ ...config, enabled: false }, queues, new Set(["IT"]))).toEqual([]);
    expect(memberRegionalProgress(config, queues, new Set())).toEqual([]);
  });
  it("identifies the member's order in the proposed batch, not just elsewhere in the regional queue", () => {
    const config = { enabled: true, telegramAlerts: false, regions };
    const { queues } = collectSupplierQueues({ all: [
      paid("first", "Italy", 100), paid("later", "Italy", 2),
      paid("unpaid", "Italy", 3, { paymentStatus: "unpaid" }),
      paid("direct", "Italy", 30, { routingType: "direct" }),
    ], used: [], elig: [], config });
    const view = (id: string) => memberRegionalProgress(config, queues, new Set(["IT"]), new Set([id]))[0];
    expect(view("first").yourOrderStatus).toBe("included");
    expect(view("later").yourOrderStatus).toBe("waiting");
    expect(view("unpaid").yourOrderStatus).toBe("not_included");
    expect(view("direct").yourOrderStatus).toBe("not_included");
    expect(view("unknown").yourOrderStatus).toBe("not_included");
    expect(JSON.stringify(view("first"))).not.toMatch(/SECRET|private|first|later/);
  });
  it("shows an empty regional queue and readiness without splitting a whole order at the threshold", () => {
    const config = { enabled: true, telegramAlerts: false, regions };
    const { queues } = collectSupplierQueues({ all: [paid("a", "Italy", 105)], used: [], elig: [], config });
    expect(memberRegionalProgress(config, queues, new Set(["IT"]))[0]).toMatchObject({ kits: 105, targetKits: 100, status: "Ready" });
    expect(memberRegionalProgress(config, queues, new Set(["US"]))[0]).toMatchObject({ kits: 0, status: "Filling" });
  });
  it("filters historical batches by their snapshot countries, not a reused region ID or arbitrary country parameter", () => {
    expect(memberCanViewBatch({ snapshot: { region: regions[0], orders: [] } } as any, new Set(["IT"]))).toBe(true);
    expect(memberCanViewBatch({ snapshot: { region: regions[1], orders: [] } } as any, new Set(["UK"]))).toBe(true);
    expect(memberCanViewBatch({ snapshot: { region: regions[2], orders: [] } } as any, new Set(["IT"]))).toBe(false);
    expect(memberCanViewBatch({ snapshot: { region: { name: "Unknown" }, orders: [] } } as any, new Set(["IT"]))).toBe(false);
  });
});
