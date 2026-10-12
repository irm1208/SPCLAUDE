import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GroupBuyStockControls, postGroupBuyStock } from "./GroupBuyStockControls";

afterEach(() => vi.unstubAllGlobals());

describe("group-buy stock controls", () => {
  it.each(["set", "increase", "decrease"] as const)("submits %s for the selected GB and explicit product IDs", async mode => {
    const result = { products: [{ id: "p1", stock: 8.5, sold: 3 }], updatedCount: 1 };
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => result });
    vi.stubGlobal("fetch", request);
    expect(await postGroupBuyStock("gb/one", ["p1"], mode, "5.5")).toEqual(result);
    const [url, options] = request.mock.calls[0];
    expect(url).toBe("/api/organiser/group-buys/gb%2Fone/products/stock");
    expect(options.credentials).toBe("include");
    expect(JSON.parse(options.body)).toEqual({ productIds: ["p1"], mode, quantity: 5.5 });
  });
  it("rejects empty selection, blank, negative and invalid fractional quantities before sending", async () => {
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    for (const quantity of ["", "-1", "0.2", "NaN", "Infinity"]) {
      await expect(postGroupBuyStock("gb", ["p"], "set", quantity)).rejects.toThrow();
    }
    await expect(postGroupBuyStock("gb", [], "set", "1")).rejects.toThrow();
    await expect(postGroupBuyStock("gb", ["p"], "increase", "0")).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });
  it("surfaces server rejection rather than updating the UI as if it succeeded", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false, json: async () => ({ error: "Unlimited stock cannot be increased." }),
    }));
    await expect(postGroupBuyStock("gb", ["p"], "increase", "1")).rejects.toThrow("Unlimited stock cannot be increased.");
  });
  it("renders selection and all three quantity actions on the original organiser screen", () => {
    const html = renderToStaticMarkup(createElement(GroupBuyStockControls, {
      groupId: "gb", productIds: ["p1", "p2"], selectedIds: new Set(["p1", "p2"]),
      onSelectionChange: () => {}, onUpdated: () => {},
    }));
    for (const text of ["Select all", "Set quantity", "Increase by", "Decrease by", "Update stock", "Already ordered kits are preserved"]) {
      expect(html).toContain(text);
    }
    const source = readFileSync(new URL("../pages/GbOrganiser.tsx", import.meta.url), "utf8");
    expect(source).toContain("<GroupBuyStockControls");
    expect(source).toContain("aria-label={`Select ${p.name} for stock update`}");
  });
  it("keeps V2 selection controls in their own non-shrinking header row", () => {
    const source = readFileSync(new URL("../pages/organiser-v2/GbProductsTab.tsx", import.meta.url), "utf8");
    const css = readFileSync(new URL("../pages/organiser-v2/products-split-inspector.css", import.meta.url), "utf8");
    expect(source).toContain('className="products-split__selection-actions"');
    expect(source).toContain('allSelected ? "Deselect all" : "Select all"');
    expect(css).toMatch(/\.products-split__catalogue > header\s*\{[^}]*flex-shrink:\s*0/);
  });
});
