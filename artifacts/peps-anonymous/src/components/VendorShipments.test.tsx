import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { VendorShipments } = await import("./VendorShipments");
let root: ReturnType<typeof createRoot>;
function setup() {
  const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el);
  root = createRoot(el); return el;
}
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 15)); });
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

it("renders independent shipments and never links masked tracking", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ shipments: [
    { id: "s1", vendorName: "Alder", status: "shipped", trackingNumber: "RM123GB", carrier: "Royal Mail", trackingMasked: false, images: [] },
    { id: "s2", vendorName: "Birch", status: "pending", trackingNumber: "••••••", carrier: null, trackingMasked: true, images: [] },
  ] })));
  const el = setup();
  await act(async () => root.render(createElement(VendorShipments, { orderId: "o1" })));
  await settle();
  expect(el.textContent).toContain("Alder");
  expect(el.textContent).toContain("Birch");
  const links = [...el.querySelectorAll("a")].map(a => a.getAttribute("href") ?? "");
  expect(links.some(h => h.includes("RM123GB"))).toBe(true);
  expect(links.some(h => h.includes("••"))).toBe(false);
});

it("shows the selected vendor for single-vendor orders and shows retry on error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ shipments: [{ id: "s1", vendorName: "Alder", status: "shipped", trackingNumber: null, carrier: null, trackingMasked: false, images: [] }] })));
  const el = setup();
  await act(async () => root.render(createElement(VendorShipments, { orderId: "o1" })));
  await settle();
  expect(el.querySelector('[data-testid="vendor-shipments"]')).not.toBeNull();
  expect(el.textContent).toContain("Alder");
  await act(async () => root.unmount());
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
  const el2 = setup();
  await act(async () => root.render(createElement(VendorShipments, { orderId: "o2" })));
  await settle();
  expect(el2.querySelector('[data-testid="button-retry-vendor-shipments"]')).not.toBeNull();
});

it("switches shipment labels to Chinese while preserving vendor and carrier identifiers", async () => {
  const { setVendorLanguage } = await import("../lib/vendor-language");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ok({ shipments: [
    { id: "localized", vendorName: "Royal Mail Supplies", status: "shipped", trackingNumber: "RM123GB", carrier: "Royal Mail", trackingMasked: false, images: [] },
  ] })));
  const el = setup();
  try {
    await act(async () => { root.render(createElement(VendorShipments, { orderId: "order-localized" })); });
    await settle();
    await act(async () => { setVendorLanguage("zh"); });
    expect(el.textContent).toContain("按供应商查看货件");
    expect(el.textContent).toContain("已发货");
    expect(el.textContent).toContain("Royal Mail Supplies");
    expect(el.textContent).toContain("Royal Mail");
    expect(el.textContent).toContain("RM123GB");
    await act(async () => { setVendorLanguage("en"); });
    expect(el.textContent).toContain("Shipments by vendor");
    expect(el.textContent).toContain("Shipped");
  } finally { await act(async () => { setVendorLanguage("en"); }); }
});
