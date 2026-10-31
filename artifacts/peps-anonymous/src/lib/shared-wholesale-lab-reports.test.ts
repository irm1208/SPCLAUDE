import { describe, expect, it, vi } from "vitest";
import { loadSharedWholesaleLabReports } from "./shared-wholesale-lab-reports";

const products = [
  { id: "ur-10", name: "Retatrutide 10mg", vendorName: "UR" },
  { id: "jbg-10", name: "Retatrutide 10mg", vendorName: "JBG/YT" },
  { id: "ur-100", name: "Retatrutide 100mg", vendorName: "Uther" },
  { id: "unknown", name: "Retatrutide 10mg" },
];

describe("shared-order supplier-specific reports", () => {
  it("keys identical names by product ID and groups UR and Uther under the legacy supplier", async () => {
    const request = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => url.includes("supplier=Uther") ? ["RE10-1234"] : [],
    }));
    const reports = await loadSharedWholesaleLabReports(products, request as typeof fetch);
    expect(reports["ur-10"]).toEqual({
      productName: "Retatrutide 10mg", supplier: "Uther", batchPrefixes: expect.arrayContaining(["RE10"]),
    });
    expect(reports["jbg-10"]).toBeUndefined();
    expect(reports["ur-100"]).toBeUndefined();
    expect(reports.unknown).toBeUndefined();
    expect(request.mock.calls.map(([url]) => url).sort()).toEqual([
      "/api/lab-tests/batch-codes?supplier=JBG%2FYT",
      "/api/lab-tests/batch-codes?supplier=Uther",
    ]);
  });

  it("shows JBG's own matching report without giving it to Uther", async () => {
    const request = vi.fn(async (url: string) => ({
      ok: true, json: async () => url.includes("supplier=JBG") ? ["RE10-5678"] : [],
    }));
    const reports = await loadSharedWholesaleLabReports(products, request as typeof fetch);
    expect(Object.keys(reports)).toEqual(["jbg-10"]);
    expect(reports["jbg-10"].supplier).toBe("JBG/YT");
  });

  it("fails closed independently per supplier on errors or invalid responses", async () => {
    for (const failure of [
      async () => ({ ok: false }),
      async () => ({ ok: true, json: async () => ({ codes: ["RE10-1234"] }) }),
      async () => { throw new Error("Network failure"); },
    ]) {
      const request = vi.fn(async (url: string) => url.includes("supplier=JBG")
        ? failure()
        : { ok: true, json: async () => ["RE10-1234"] });
      const reports = await loadSharedWholesaleLabReports(products, request as typeof fetch);
      expect(Object.keys(reports)).toEqual(["ur-10"]);
    }
  });
});
