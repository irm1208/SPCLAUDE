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
    previewToken: "a".repeat(64), applied: false, created: 0, preserved: 0,
  };
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async (_path, options) => ({
    ok: true, json: async () => ({ ...response, applied: JSON.parse(String(options?.body)).apply, created: JSON.parse(String(options?.body)).apply ? 1 : 0 }),
  } as Response));
  const el = document.createElement("div");
  const root = createRoot(el);
  try {
    await React.act(async () => root.render(<JbgYtCatalogueImport secret="fixture" vendorId="jbg-example" onApplied={onApplied} onBusyChange={onBusyChange} />));
    expect(el.textContent).not.toContain("Import 1 JBG/YT products");
    await React.act(async () => {
      const review = button(el, "Review JBG/YT products"); review.click(); review.click();
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(el.textContent).toContain("$32.95");
    expect(el.textContent).toContain("$15.00");
    await React.act(async () => button(el, "Import 1 JBG/YT products").click());
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
