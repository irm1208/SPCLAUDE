import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { JbgYtCatalogueImport } = await import("./JbgYtCatalogueImport");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });
function button(root: HTMLElement, name: string) {
  const el = [...root.querySelectorAll("button")].find(el => el.textContent === name);
  expect(el, name).toBeTruthy(); return el!;
}
it("reviews exact separate prices, submits a server-issued token, prevents duplicate clicks and refreshes products", async () => {
  const onApplied = vi.fn(async () => {});
  const onBusyChange = vi.fn();
  const response = {
    products: [{ id: "jbg:example:BAC10", sku: "BAC10", name: "BAC water 10ml", wholesaleCost: "32.95", wholesalePrice: "15.00", stock: 100000, exists: false }],
    previewToken: "a".repeat(64), applied: false, created: 0, updated: 0, preserved: 0,
  };
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (_path, options) => ({
    ok: true, json: async () => ({ ...response, applied: JSON.parse(String(options?.body)).apply, created: JSON.parse(String(options?.body)).apply ? 1 : 0 }),
  } as Response));
  const el = document.createElement("div");
  const root = createRoot(el);
  try {
    await React.act(async () => root.render(<JbgYtCatalogueImport secret="fixture" vendorId="jbg-example" onApplied={onApplied} onBusyChange={onBusyChange} />));
    expect(el.textContent).not.toContain("Apply JBG/YT list (1 products)");
    await React.act(async () => {
      const review = button(el, "Review JBG/YT products"); review.click(); review.click();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain("$32.95");
    expect(el.textContent).toContain("$15.00");
    await React.act(async () => button(el, "Apply JBG/YT list (1 products)").click());
    const [path, options] = fetcher.mock.calls[1];
    expect(path).toBe("/api/admin/wholesale-products/import-jbg-yt");
    expect(options?.headers).toEqual({ "Content-Type": "application/json", "x-admin-secret": "fixture" });
    expect(JSON.parse(String(options?.body))).toEqual({ vendorId: "jbg-example", apply: true, previewToken: response.previewToken });
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain("Added 1 products");
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
  } finally { await React.act(async () => root.unmount()); }
});
it("keeps the importer within the selected JBG/YT vendor and locks edits during requests", () => {
  const source = readFileSync(new URL("./AdminMultiVendorSetup.tsx", import.meta.url), "utf8");
  expect(source).toContain('v.name.trim().toLowerCase().replace(/\\s/g, "") === "jbg/yt"');
  expect(source).toContain("{jbgYtVendor && <JbgYtCatalogueImport");
  expect(source).toContain("disabledReason={importDisabledReason} onBusyChange={setImportBusy}");
});
it("allows correcting existing products even when there are no missing products", async () => {
  const review = {
    products: [{ id: "existing", sku: "50AM", name: "5-Amino-1MQ 50mg", wholesaleCost: "46.00", wholesalePrice: "60.00",
      stock: 8, exists: true, needsUpdate: true, previousCost: "60.00", previousPrice: "61.00" }],
    previewToken: "b".repeat(64), applied: false, created: 0, updated: 0, preserved: 0,
  };
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (_path, options) => ({
    ok: true, json: async () => ({ ...review, applied: JSON.parse(String(options?.body)).apply, updated: JSON.parse(String(options?.body)).apply ? 1 : 0 }),
  } as Response));
  const onApplied = vi.fn(async () => {});
  const el = document.createElement("div"); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<JbgYtCatalogueImport secret="fixture" vendorId="jbg-example" onApplied={onApplied} />));
    await React.act(async () => button(el, "Review JBG/YT products").click());
    expect(el.textContent).toContain("0 new products to add. 1 existing products to correct.");
    expect(el.textContent).toContain("Was $60.00");
    expect(el.textContent).toContain("8 (kept)");
    await React.act(async () => button(el, "Apply JBG/YT list (1 products)").click());
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain("Corrected 1 products.");
    expect(onApplied).toHaveBeenCalledTimes(1);
  } finally { await React.act(async () => root.unmount()); }
});
