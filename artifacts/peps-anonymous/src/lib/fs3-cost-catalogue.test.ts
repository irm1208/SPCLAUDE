import { afterEach, expect, it, vi } from "vitest";
import { loadFs3Costs } from "./fs3-cost-catalogue";

afterEach(() => vi.unstubAllGlobals());

it("loads the private catalogue through existing Admin auth without a cache", async () => {
  const catalogue = [{ id: 1, productName: "Test item", unitCost: 10 }];
  const fetcher = vi.fn().mockResolvedValue(Response.json(catalogue));
  vi.stubGlobal("fetch", fetcher);
  const signal = new AbortController().signal;
  expect(await loadFs3Costs("opaque-admin-binding", signal)).toEqual(catalogue);
  expect(fetcher).toHaveBeenCalledWith("/api/admin/fs3-costs", {
    headers: { "x-admin-secret": "opaque-admin-binding" }, credentials: "omit", cache: "no-store", signal,
  });
});

it("rejects failed requests, malformed catalogues and duplicate identifiers", async () => {
  for (const response of [
    new Response("", { status: 401 }), new Response("", { status: 503 }),
    Response.json({ costs: [] }), Response.json([{ id: "1", productName: "P", unitCost: 5 }]),
    Response.json([{ id: 1, productName: "P", unitCost: 5 }, { id: 1, productName: "Q", unitCost: 5 }]),
  ]) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
    await expect(loadFs3Costs("binding")).rejects.toThrow(/prices|catalogue|sign in/i);
  }
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
  await expect(loadFs3Costs("binding")).rejects.toThrow();
});

it("returns a genuinely empty catalogue without injecting default prices", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([])));
  expect(await loadFs3Costs("binding")).toEqual([]);
});
