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
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { default: VendorPortal } = await import("./VendorPortal");
const { default: VendorLogin } = await import("./VendorLogin");
const { Router } = await import("wouter");
const { memoryLocation } = await import("wouter/memory-location");
const { VendorOrderImages } = await import("../components/VendorOrderImages");
const { default: VendorPortalAdmin } = await import("../components/admin/VendorPortalAdmin");
let root: ReturnType<typeof createRoot>;
function setup() {
  const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el);
  root = createRoot(el); return el;
}
// The vendor gate uses the shared query client to clear cached account state after sign-in.
const withQuery = (node: ReturnType<typeof createElement>) => createElement(QueryClientProvider, { client: new QueryClient() }, node);
async function settle() {
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); });
}
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });

it("shows the sign-in page inline and never loads vendor orders while signed out", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ status: 401, json: async () => ({ error: "Authentication required" }) });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  expect(el.querySelector("form")).not.toBeNull();
  expect(el.textContent).toContain("Sign in");
  expect(el.textContent).toContain("Create vendor account");
  expect(fetchMock).toHaveBeenCalledWith("/api/vendor/me", { credentials: "include" });
  expect(fetchMock).not.toHaveBeenCalledWith("/api/vendor/orders", expect.anything());
});

it("restores a dedicated pending vendor account without loading orders", async () => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/vendor/me") return new Response('{}', { status: 403 });
    if (url === "/api/vendor/auth/session") return new Response(JSON.stringify({ csrfToken: "vendor-token", account: { username: "northstar", status: "pending", companyName: "Northstar Labs", vendorId: null } }));
    throw new Error("Unexpected URL");
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  expect(el.textContent).toContain("awaiting approval");
  expect(el.textContent).toContain("Northstar Labs");
  expect(fetchMock).not.toHaveBeenCalledWith("/api/vendor/orders", expect.anything());
});

it("sends the dedicated login page to the portal once access is confirmed", async () => {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify({ csrfToken: "vendor-token", account: { vendorId: "a", companyName: "Vendor A", username: "vendor-a", status: "active" } })))));
  setup();
  const path = memoryLocation({ path: "/vendor/login", static: false, record: true });
  await act(async () => root.render(withQuery(createElement(Router, { hook: path.hook }, createElement(VendorLogin)))));
  await settle();
  expect(path.history?.at(-1)).toBe("/vendor");
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
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
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

it("Admin manages dedicated pending accounts while keeping manual submission controls", async () => {
  const vendors = [{ id: "vendor-a", name: "Vendor A" }];
  const accounts = [{ username: "northstar", status: "pending", vendorId: null, companyName: "Northstar Labs", contactName: "Ada", email: "ops@northstar.example", createdAt: new Date().toISOString() }];
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ vendors, submissions: [] }) });
  vi.stubGlobal("fetch", fetchMock);
  const { adminAuth } = await import("../lib/admin-auth");
  const accountRequest = vi.spyOn(adminAuth, "request").mockImplementation(async () => new Response(JSON.stringify({ accounts, vendors })));
  try {
    const el = setup();
    await act(async () => root.render(createElement(VendorPortalAdmin, { secret: "synthetic-admin-secret" })));
    await settle();
    expect(el.querySelector('[data-testid="row-vendor-account-northstar"]')?.textContent).toContain("Northstar Labs");
    expect(el.textContent).toContain("1 pending");
    const approve = el.querySelector('[data-testid="button-activate-northstar"]') as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    expect(accountRequest.mock.calls.every(([, init]) => !init?.method)).toBe(true);
    await act(async () => {
      const select = el.querySelector('[data-testid="select-vendor-northstar"]') as HTMLSelectElement;
      select.value = "vendor-a";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => approve.click());
    expect(accountRequest).toHaveBeenCalledWith("/api/admin/vendor-accounts/northstar", expect.objectContaining({ method: "PUT", body: JSON.stringify({ vendorId: "vendor-a", status: "active" }) }));
    expect(el.textContent).toContain("Manual submission");
    expect(el.textContent).toContain("Preview");
    expect(el.querySelector('[data-testid="button-submit-vendor"]')).toBeNull();
    expect(el.querySelector('[data-testid="input-access-username"]')).toBeNull();
    // Vendor problems and availability are loaded from the vendor-portal admin namespace too.
    expect(fetchMock.mock.calls.every(([url]: [string]) => ["/api/admin/vendor-portal", "/api/admin/vendor-portal/issues", "/api/admin/vendor-telegram"].includes(url) || url.startsWith("/api/admin/vendor-threads"))).toBe(true);
  } finally { accountRequest.mockRestore(); }
});
it.each([401, 503])('refreshing orders handles status %s without retaining revoked vendor access', async status => {
  let refresh = false;
  vi.stubGlobal('fetch', vi.fn(async (url: string) => {
    if (url === '/api/vendor/me') return new Response(JSON.stringify({ vendorId: 'a', vendorName: 'Vendor A', username: 'vendor-a' }));
    if (url === '/api/vendor/orders') return refresh ? new Response(JSON.stringify({ error: 'Unavailable' }), { status }) : new Response(JSON.stringify({ orders: [] }));
    if (url === '/api/vendor/auth/session') return new Response('{}', { status: 401 });
    throw new Error('Unexpected URL');
  }));
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  refresh = true;
  await act(async () => (el.querySelector('[data-testid="button-refresh"]') as HTMLButtonElement).click());
  await settle();
  if (status === 401) {
    expect(el.textContent).toContain('Sign in to the vendor portal');
    expect(el.querySelector('[data-testid="button-logout"]')).toBeNull();
  } else {
    expect(el.textContent).toContain('Vendor A');
    expect(el.textContent).toContain('Unavailable');
    expect(el.querySelector('[data-testid="button-logout"]')).not.toBeNull();
  }
});
