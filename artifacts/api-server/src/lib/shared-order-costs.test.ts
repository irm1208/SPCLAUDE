import { describe, it, expect } from "vitest";
import { buildSharedOrderCosts } from "./shared-order-costs";

const share = { status: "open", isPublic: true, organiserFlatFee: "10", feePerKit: "2.50", deliveryUsername: "receiver", creatorUsername: "lead" };
const member = { username: "member", organiserFee: "12", kits: 3 };
describe("shared wholesale fee disclosure", () => {
  it("previews the actual public joining fee and per-kit rule, never final postage or a delivered total", () => {
    const result = buildSharedOrderCosts(share, "new-person");
    expect(result.stage).toBe("invitation");
    expect(result.organiser).toMatchObject({ amount: 10, basis: "per_person", currency: "USD", includedInOrder: true });
    expect(result.perKit).toMatchObject({ rate: 2.5, amount: null, status: "calculated_later" });
    expect(result.vendorShipping.amount).toBeNull();
    expect(result.onwardShipping).toMatchObject({ amount: null, status: "not_set", includedInOrder: false });
    expect(result.orderTotal).toBeNull();
  });
  it("does not apply a public flat-fee setting to a private invitation", () => {
    expect(buildSharedOrderCosts({ ...share, isPublic: false }, "new").organiser.amount).toBe(0);
  });
  it("shows the member's actual custom fee instead of the public default", () => {
    const result = buildSharedOrderCosts(share, "member", member, null, 18);
    expect(result.organiser.amount).toBe(12);
    expect(result.perKit.amount).toBe(7.5);
    expect(result.vendorShipping).toMatchObject({ amount: 18, status: "estimate" });
    expect(result.orderTotal).toBeNull();
  });
  it("honours recipient organiser/postage exemption but not an invented per-kit exemption", () => {
    const result = buildSharedOrderCosts(share, "receiver", { ...member, username: "Receiver" }, null, 0);
    expect(result.organiser.amount).toBe(0);
    expect(result.perKit.amount).toBe(7.5);
    expect(result.vendorShipping.amount).toBe(0);
    expect(result.onwardShipping.status).toBe("not_required");
  });
  it("uses locked monetary snapshots even if the fee rules or recipient have changed", () => {
    const result = buildSharedOrderCosts({ ...share, status: "locked", feePerKit: "100", deliveryUsername: "member" }, "member", member,
      { paymentStatus: "confirmed", organiserFee: "15", kitFees: "9", vendorShipping: "20", adminAdjustmentFee: "-2", grandTotal: "142", currency: "USD" }, 999);
    expect(result.organiser.amount).toBe(15);
    expect(result.perKit).toMatchObject({ amount: 9, rate: null, status: "known" });
    expect(result.vendorShipping.amount).toBe(20);
    expect(result.adjustment?.amount).toBe(-2);
    expect(result.orderTotal).toBe(142);
  });
  it("preserves protected snapshot amounts while an order is reopened", () => {
    expect(buildSharedOrderCosts(share, "member", member, { paymentStatus: "confirmed", organiserFee: "8", kitFees: "3", vendorShipping: "5", grandTotal: "90" }).organiser.amount).toBe(8);
    expect(buildSharedOrderCosts(share, "member", member, { paymentStatus: "unpaid", organiserFee: "8" }).organiser.amount).toBe(12);
  });
  it("does not fabricate locked money when a materialised order is missing", () => {
    const result = buildSharedOrderCosts({ ...share, status: "locked" }, "member", member);
    expect(result.organiser.amount).toBeNull();
    expect(result.perKit.amount).toBeNull();
    expect(result.orderTotal).toBeNull();
  });
  it("keeps invalid numbers unknown rather than free", () => {
    expect(buildSharedOrderCosts({ ...share, organiserFlatFee: "bad" }, "new").organiser.amount).toBeNull();
    expect(buildSharedOrderCosts(share, "member", member, null, Number.NaN).vendorShipping.amount).toBeNull();
  });
  it("projects a minimal allowlist, never leaking payment or address fields from its inputs", () => {
    const input = { ...share, leadPaypalEmail: "private", organiserPaymentInfo: "private", shippingAddress: "private", mainTrackingNumber: "private" };
    const result = buildSharedOrderCosts(input, "new");
    expect(Object.keys(result).sort()).toEqual(["adjustment", "currency", "onwardShipping", "orderTotal", "organiser", "perKit", "stage", "vendorShipping"]);
    expect(JSON.stringify(result)).not.toContain("private");
  });
});
