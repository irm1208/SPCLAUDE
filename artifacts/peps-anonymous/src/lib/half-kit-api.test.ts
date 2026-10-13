import { afterEach, describe, expect, it, vi } from "vitest";
import {
  claimHalfKit, computeClaimTotals, defaultHalfPrice, fetchManagement, fetchMemberOffers, HalfKitApiError, isPreviewConflict, isAuthRequired,
  publishSequentially, releaseClaim, saveOffer, validateOfferForm, eligibleOrders,
} from "./half-kit-api";
import { fetchHalfKitAvailability } from "./half-kit-api";

afterEach(() => vi.unstubAllGlobals());
const ok = (body: unknown) => vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => body });

describe("half-kit api", () => {
  it("fetches group availability in a single authenticated request", async () => {
    const f = ok({ counts: { g1: 2 } });
    vi.stubGlobal("fetch", f);
    expect(await fetchHalfKitAvailability()).toEqual({ counts: { g1: 2 } });
    expect(f).toHaveBeenCalledWith("/api/group-buys/half-kit-availability/counts", expect.objectContaining({ credentials: "include" }));
  });
  it("GETs management for organiser and admin scopes with credentials", async () => {
    const f = ok({ group: {}, candidates: [], claims: [] });
    vi.stubGlobal("fetch", f);
    await fetchManagement("organiser", "g/1");
    await fetchManagement("admin", "g1");
    expect(f.mock.calls[0][0]).toBe("/api/organiser/group-buys/g%2F1/half-kit-offers");
    expect(f.mock.calls[1][0]).toBe("/api/admin/group-buys/g1/half-kit-offers");
    expect(f.mock.calls[0][1].credentials).toBe("include");
  });
  it("POSTs offer save and release bodies", async () => {
    const f = ok({});
    vi.stubGlobal("fetch", f);
    await saveOffer("admin", "g1", "p1", { price: 12.5, deliveryCharge: 0, vendorShippingCharge: 2, published: true, version: 3 });
    expect(f.mock.calls[0][0]).toBe("/api/admin/group-buys/g1/half-kit-offers/p1");
    expect(JSON.parse(f.mock.calls[0][1].body)).toEqual({ price: 12.5, deliveryCharge: 0, vendorShippingCharge: 2, published: true, version: 3 });
    await releaseClaim("organiser", "g1", "c9");
    expect(f.mock.calls[1][0]).toBe("/api/organiser/group-buys/g1/half-kit-offers/claims/c9/release");
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({});
  });
  it("member GET and claim send requestId and version", async () => {
    const f = ok({ claimId: "c", paymentPath: "/x" });
    vi.stubGlobal("fetch", f);
    await fetchMemberOffers("g1");
    expect(f.mock.calls[0][0]).toBe("/api/group-buys/g1/half-kit-offers");
    await claimHalfKit("g1", "o1", { orderId: "ord", version: 2, useCredits: true, requestId: "r-1", expectedCredit: 4.5 });
    expect(f.mock.calls[1][0]).toBe("/api/group-buys/g1/half-kit-offers/o1/claim");
    expect(JSON.parse(f.mock.calls[1][1].body)).toEqual({ orderId: "ord", version: 2, useCredits: true, requestId: "r-1", expectedCredit: 4.5 });
  });
  it("surfaces server error messages", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Price changed" }) }));
    await expect(fetchMemberOffers("g1")).rejects.toThrow("Price changed");
  });
  it("flags HTTP 409 as a preview conflict", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, json: async () => ({ error: "Credit changed" }) }));
    const err = await claimHalfKit("g", "o", { orderId: "x", version: 1, useCredits: false, requestId: "r", expectedCredit: 0 }).catch(e => e);
    expect(err).toBeInstanceOf(HalfKitApiError);
    expect(isPreviewConflict(err)).toBe(true);
    expect(isPreviewConflict(new Error("x"))).toBe(false);
  });
  it("flags HTTP 401 as auth required", () => {
    expect(isAuthRequired(new HalfKitApiError("Authentication required", 401))).toBe(true);
    expect(isAuthRequired(new HalfKitApiError("x", 409))).toBe(false);
  });
  it("defaults to half the kit price, rounded to cents", () => {
    expect(defaultHalfPrice(25.25)).toBe(12.63);
  });
  it("validates offer form numbers", () => {
    expect(validateOfferForm({ price: "", deliveryCharge: "0", vendorShippingCharge: "0" }).ok).toBe(false);
    expect(validateOfferForm({ price: "-1", deliveryCharge: "0", vendorShippingCharge: "0" }).ok).toBe(false);
    const v = validateOfferForm({ price: "10", deliveryCharge: "", vendorShippingCharge: "1.5" });
    expect(v).toEqual({ ok: true, value: { price: 10, deliveryCharge: 0, vendorShippingCharge: 1.5 } });
  });
  it("computes credit deduction capped by balance and total", () => {
    const offer = { price: 10, deliveryCharge: 2, vendorShippingCharge: 1 };
    expect(computeClaimTotals(offer, 5, true, true)).toEqual({ total: 13, credits: 5, cash: 8 });
    expect(computeClaimTotals(offer, 50, true, true)).toEqual({ total: 13, credits: 13, cash: 0 });
    expect(computeClaimTotals(offer, 50, false, true)).toEqual({ total: 13, credits: 0, cash: 13 });
    expect(computeClaimTotals(offer, 50, true, false)).toEqual({ total: 13, credits: 0, cash: 13 });
  });
  it("publishes sequentially and reports partial failures", async () => {
    const calls: string[] = [];
    const res = await publishSequentially(["a", "b", "c"], async id => { calls.push(id); if (id === "b") throw new Error("stale"); });
    expect(calls).toEqual(["a", "b", "c"]);
    expect(res).toEqual({ succeeded: ["a", "c"], failed: [{ productId: "b", error: "stale" }] });
  });
  it("lists orders for selection", () => {
    expect(eligibleOrders([{ id: "1", code: "A", paymentStatus: "paid", amountDue: 0 }]).length).toBe(1);
  });
});
