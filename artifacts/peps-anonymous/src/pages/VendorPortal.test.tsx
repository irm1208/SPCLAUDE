import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "location", "history", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("addEventListener", dom.window.addEventListener.bind(dom.window));
  vi.stubGlobal("removeEventListener", dom.window.removeEventListener.bind(dom.window));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: VendorPortal } = await import("./VendorPortal");
const { VendorOrderImages } = await import("../components/VendorOrderImages");
const { default: VendorPortalAdmin } = await import("../components/admin/VendorPortalAdmin");
let root: ReturnType<typeof createRoot>;
function setup() {
  const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el);
  root = createRoot(el); return el;
}
async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
}
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });

it("requires login and never loads vendor orders while signed out", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 401 });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(createElement(VendorPortal)));
  await settle();
  expect(el.textContent).toContain("Sign in");
  expect(fetchMock).toHaveBeenCalledWith("/api/vendor/me", { credentials: "include" });
  expect(fetchMock).not.toHaveBeenCalledWith("/api/vendor/orders", expect.anything());
});

it("vendor sees only cost and delivery fields, without member price or payment", async () => {
  const order = {
    id: "synthetic", reference: "8000123", status: "Submitted", stale: false,
    items: [{ productName: "HGH", quantity: 2, unitCost: "20.00", lineTotal: "40.00" }],
    shipping: { name: "Supplier recipient", address: "17 Road", country: "United Kingdom", phone: "+44123", email: "recipient@example.invalid" },
    productCost: "40.00", shippingCost: "50.00", totalCost: "90.00", currency: "USD", trackingNumber: null, carrier: null,
    images: [],
  };
  const fetchMock = vi.fn().mockImplementation((url: string) => Promise.resolve({
    ok: true, status: 200,
    json: async () => url.endsWith("/me") ? { username: "vendor-a", vendorName: "Vendor A", vendorId: "a" } : { orders: [order] },
  }));
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(createElement(VendorPortal)));
  await settle();
  expect(el.textContent).toContain("Vendor A");
  expect(el.textContent).toContain("8000123");
  await act(async () => (el.querySelector('[data-testid="card-order-synthetic"]') as HTMLButtonElement).click());
  expect(el.textContent).toContain("HGH");
  expect(el.textContent).toContain("17 Road");
  expect(el.textContent).toContain("90.00");
  expect(el.textContent).not.toContain("Payment");
});

it("members see only order photos delivered by the protected endpoint", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ images: [{ id: "photo-1", filename: "Packing", url: "/api/account/vendor-images/photo-1" }] }) });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(createElement(VendorOrderImages, { orderId: "one" })));
  await settle();
  expect(el.querySelector("img")?.getAttribute("src")).toBe("/api/account/vendor-images/photo-1");
  expect(fetchMock).toHaveBeenCalledWith("/api/account/orders/one/vendor-images", { credentials: "include" });
});

it("Admin sees explicit review and submit controls, not an auto-send", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ vendors: [{ id: "vendor-a", name: "Vendor A" }], access: [], submissions: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(createElement(VendorPortalAdmin, { secret: "synthetic-admin-secret" })));
  await settle();
  expect(el.textContent).toContain("Submit orders");
  expect(el.textContent).toContain("Preview");
  expect(el.querySelector('[data-testid="button-submit-vendor"]')).toBeNull();
  expect(fetchMock.mock.calls.every(([url]: [string]) => url === "/api/admin/vendor-portal")).toBe(true);
});
