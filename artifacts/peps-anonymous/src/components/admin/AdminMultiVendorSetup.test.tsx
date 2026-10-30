import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { AdminMultiVendorSetup, isVendorEnabled, parseOptionalNumber } = await import("./AdminMultiVendorSetup");
let root: ReturnType<typeof createRoot>;
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 15)); });
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });
const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

it("treats legacy enabled=undefined as active-only", () => {
  expect(isVendorEnabled({ id: "a", name: "A" }, "a")).toBe(true);
  expect(isVendorEnabled({ id: "b", name: "B" }, "a")).toBe(false);
  expect(isVendorEnabled({ id: "b", name: "B", enabled: true }, "a")).toBe(true);
  expect(parseOptionalNumber("")).toBeNull();
  expect(parseOptionalNumber("-1")).toBeUndefined();
  expect(parseOptionalNumber("2.5", true)).toBeUndefined();
});

it("toggles availability and saves a row with the exact contract", async () => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/wholesale-vendors") return res({ vendors: [{ id: "a", name: "Alder" }, { id: "b", name: "Birch", enabled: false }], activeVendorId: "a" });
    if (url === "/api/admin/wholesale-products") return res([{ id: "p1", name: "Item", wholesaleVendorId: "a", wholesaleCost: 4, wholesalePrice: 9.5, stock: 12 }]);
    if (init?.method === "PATCH") return res({});
    return res({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root.render(createElement(AdminMultiVendorSetup, { secret: "s3" })));
  await settle();
  expect(el.querySelector('[data-testid="mv-profit-p1"]')?.textContent).toBe("$5.50");
  expect(el.querySelector('[data-testid="mv-margin-p1"]')?.textContent).toBe("57.9%");
  await act(async () => { (el.querySelector('[data-testid="toggle-vendor-b"]') as HTMLElement).click(); });
  await settle();
  const toggle = fetchMock.mock.calls.find(c => c[0] === "/api/admin/wholesale-vendors/b/availability");
  expect(JSON.parse(toggle![1]!.body as string)).toEqual({ enabled: true });
  expect((toggle![1]!.headers as Record<string, string>)["x-admin-secret"]).toBe("s3");
  await act(async () => { (el.querySelector('[data-testid="button-mv-save-p1"]') as HTMLElement).click(); });
  await settle();
  const save = fetchMock.mock.calls.find(c => c[0] === "/api/admin/wholesale-products/p1");
  expect(JSON.parse(save![1]!.body as string)).toEqual({ wholesaleVendorId: "a", wholesaleCost: 4, wholesalePrice: 9.5, stock: 12 });
  expect(el.textContent).toContain("Saved");
});

it("scopes products and availability to the selected vendor, including legacy mappings", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => url.endsWith("wholesale-vendors")
    ? res({ vendors: [{ id: "a", name: "Alder", legacyCatalogueVendor: "Uther" }, { id: "b", name: "Birch" }], activeVendorId: "a" })
    : res([
      { id: "a1", name: "Alder item", wholesaleVendorId: "a" },
      { id: "b1", name: "Birch item", wholesaleVendorId: "b" },
      { id: "legacy", name: "Legacy item", vendor: "Uther", wholesaleVendorId: null },
      { id: "free", name: "Unassigned item", vendor: "Other", wholesaleVendorId: null },
    ])));
  const el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el);
  await act(async () => root.render(createElement(AdminMultiVendorSetup, { secret: "s", selectedVendorId: "a" })));
  await settle();
  expect(el.querySelector('[data-testid="row-mv-product-a1"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="row-mv-product-legacy"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="row-mv-product-b1"]')).toBeNull();
  expect(el.querySelector('[data-testid="row-mv-product-free"]')).toBeNull();
  expect(el.querySelector('[data-testid="toggle-vendor-b"]')).toBeNull();
  await act(async () => { (el.querySelector('[data-testid="show-unassigned-products"]') as HTMLElement).click(); });
  expect(el.querySelector('[data-testid="row-mv-product-free"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="row-mv-product-b1"]')).toBeNull();
});

it("can enable a product for wholesale and reports vendor availability changes", async () => {
  const changed = vi.fn();
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "PATCH") return res({});
    if (url.endsWith("wholesale-vendors")) return res({ vendors: [{ id: "a", name: "Alder", enabled: false }], activeVendorId: null });
    return res([{ id: "p1", name: "Item", wholesaleVendorId: "a", wholesaleCost: 4, wholesalePrice: 9, stock: 2, wholesaleEnabled: false }]);
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el);
  await act(async () => root.render(createElement(AdminMultiVendorSetup, { secret: "s", selectedVendorId: "a", onVendorsChanged: changed })));
  await settle();
  await act(async () => { (el.querySelector('[data-testid="input-mv-enabled-p1"]') as HTMLElement).click(); });
  await act(async () => { (el.querySelector('[data-testid="button-mv-save-p1"]') as HTMLElement).click(); });
  await settle();
  const save = fetchMock.mock.calls.find(c => c[0] === "/api/admin/wholesale-products/p1");
  expect(JSON.parse(save![1]!.body as string).wholesaleEnabled).toBe(true);
  await act(async () => { (el.querySelector('[data-testid="toggle-vendor-a"]') as HTMLElement).click(); });
  await settle();
  expect(changed).toHaveBeenCalledTimes(1);
});
