import { describe, expect, it, vi } from "vitest";
import { getWholesaleLabSupplier, loadWholesaleLabAvailability } from "./wholesale-lab-reports";

describe("supplier-scoped wholesale reports", () => {
  it("uses JBG/YT rather than falling back to Uther, while preserving the UR legacy identity", () => {
    expect(getWholesaleLabSupplier({ name: "JBG/YT" })).toBe("JBG/YT");
    expect(getWholesaleLabSupplier({ name: "UR", legacyCatalogueVendor: "Uther" })).toBe("Uther");
    expect(getWholesaleLabSupplier(null)).toBe("");
  });

  it("shows no JBG badge until a matching JBG report exists", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    const products = [{ name: "Retatrutide 10mg" }];
    expect((await loadWholesaleLabAvailability(products, "JBG/YT", request)).available).toEqual({
      "Retatrutide 10mg": false,
    });
    expect(request.mock.calls[0][0]).toBe("/api/lab-tests/batch-codes?supplier=JBG%2FYT");
    request.mockResolvedValue({ ok: true, json: async () => ["RE10-1234"] });
    expect((await loadWholesaleLabAvailability(products, "JBG/YT", request)).available["Retatrutide 10mg"]).toBe(true);
  });

  it("never queries unscoped reports and fails closed on request errors", async () => {
    const request = vi.fn().mockResolvedValue({ ok: false });
    expect((await loadWholesaleLabAvailability([], "", request)).available).toEqual({});
    expect(request).not.toHaveBeenCalled();
    await expect(loadWholesaleLabAvailability([{ name: "Retatrutide 10mg" }], "JBG/YT", request)).rejects.toThrow();
  });
});
