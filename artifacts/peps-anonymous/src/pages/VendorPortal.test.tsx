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
const walletFixture = { wallets: [{ id: "wallet-a", vendorId: "a", currency: "ETH", network: "Ethereum", address: "0x123", label: null }], options: [{ currency: "ETH", network: "Ethereum", family: "evm", decimals: 18 }] };
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
    json: async () => url.endsWith("/wallets") ? walletFixture : url.endsWith("/me") ? { username: "vendor-a", vendorName: "Vendor A", vendorId: "a" } : { orders: [order] },
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
  const accountRequest = vi.spyOn(adminAuth, "request").mockImplementation(async () => new Response(JSON.stringify({ accounts, vendors, wallets: [], orders: [], payments: [] })));
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
    if (url === '/api/vendor/wallets') return new Response(JSON.stringify(walletFixture));
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

it.each(["empty", "error"])("blocks orders when wallet setup is %s", async mode => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/vendor/me") return new Response(JSON.stringify({ vendorId: "a", vendorName: "Vendor A", username: "vendor-a" }));
    if (url === "/api/vendor/wallets") return mode === "empty" ? new Response(JSON.stringify({ wallets: [], options: walletFixture.options })) : new Response(JSON.stringify({ error: "Wallet service unavailable" }), { status: 503 });
    return new Response("{}", { status: 503 });
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  expect(el.querySelector('[data-testid="vendor-wallet-gate"]')).not.toBeNull();
  expect(el.textContent).toContain(mode === "empty" ? "Add wallet" : "Wallet service unavailable");
  expect(fetchMock.mock.calls.some(([url]) => url === "/api/vendor/orders")).toBe(false);
  expect(el.querySelector('[data-testid="button-logout"]')).not.toBeNull();
});

it("does not load orders before the wallet check resolves", async () => {
  let resolveWallet!: (r: Response) => void;
  const walletRequest = new Promise<Response>(resolve => { resolveWallet = resolve; });
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/vendor/me") return new Response(JSON.stringify({ vendorId: "a", vendorName: "Vendor A", username: "vendor-a" }));
    if (url === "/api/vendor/wallets") return walletRequest;
    return new Response(JSON.stringify({ orders: [] }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  expect(el.textContent).toContain("Loading payment wallets");
  expect(fetchMock.mock.calls.some(([url]) => url === "/api/vendor/orders")).toBe(false);
  await act(async () => resolveWallet(new Response(JSON.stringify(walletFixture))));
  await settle();
  expect(fetchMock.mock.calls.filter(([url]) => url === "/api/vendor/orders")).toHaveLength(1);
});

it("refreshes orders after the first wallet is saved", async () => {
  const { setVendorCsrfToken } = await import("../lib/vendor-auth-client");
  setVendorCsrfToken("wallet-save-token");
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/vendor/me") return new Response(JSON.stringify({ vendorId: "a", vendorName: "Vendor A", username: "vendor-a" }));
    if (url === "/api/vendor/wallets") return new Response(JSON.stringify(init?.method === "PUT" ? walletFixture : { wallets: [], options: walletFixture.options }));
    return new Response(JSON.stringify({ orders: [] }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  await act(async () => [...el.querySelectorAll("button")].find(button => button.textContent === "Add wallet")!.click());
  const address = el.querySelector('input[autocomplete="off"]') as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(address, "0x1111111111111111111111111111111111111111");
    address.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await act(async () => el.querySelector('[data-testid="form-vendor-wallets"]')!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
  expect(el.querySelector('[data-testid="vendor-wallet-gate"]')).toBeNull();
  expect(fetchMock.mock.calls.filter(([url]) => url === "/api/vendor/orders")).toHaveLength(1);
  const saved = fetchMock.mock.calls.find(([url, init]) => url === "/api/vendor/wallets" && init?.method === "PUT")![1]!;
  expect(JSON.parse(saved.body as string).wallets[0].id).toBeUndefined();
});

it("opens wallet Settings when the orders API requires wallet setup", async () => {
  let walletLoads = 0;
  const fetchMock = vi.fn(async (url: string) => {
    if (url === "/api/vendor/me") return new Response(JSON.stringify({ vendorId: "a", vendorName: "Vendor A", username: "vendor-a" }));
    if (url === "/api/vendor/wallets") return new Response(JSON.stringify(++walletLoads === 1 ? walletFixture : { wallets: [], options: walletFixture.options }));
    if (url === "/api/vendor/orders") return new Response(JSON.stringify({ error: "vendor_wallet_required", message: "Add a payment wallet in Settings before using orders." }), { status: 403 });
    return new Response("{}", { status: 503 });
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = setup();
  await act(async () => root.render(withQuery(createElement(VendorPortal))));
  await settle();
  expect(walletLoads).toBe(2);
  expect(el.querySelector('[data-testid="form-vendor-wallets"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="form-vendor-settings"]')).not.toBeNull();
  expect(el.textContent).not.toContain("vendor_wallet_required");
  expect(fetchMock.mock.calls.filter(([url]) => url === "/api/vendor/orders")).toHaveLength(1);
});

 it("offers the 17TRACK catalogue and detects the carrier on tracking blur", async () => {
  const { OrderDetail } = await import("./VendorPortal");
  const { CARRIERS_17TRACK } = await import("../lib/carriers");
  const match = CARRIERS_17TRACK.find(c => c.code > 0)!;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
    url.includes("detect-carrier") ? { carrierCode: match.code } : { csrfToken: "test" }
  ))));
  const el = setup();
  const order = { id: "one", reference: "123", status: "submitted", submittedAt: new Date().toISOString(), stale: false,
    items: [], currency: "USD", productCost: "0", shippingCost: "0", totalCost: "0", shipping: { name: "Test", address: "Street", country: "UK", phone: "", email: "" },
    trackingNumber: "ABC123", carrier: null, images: [] };
  await act(async () => root.render(createElement(OrderDetail, { order, onBack: () => {}, onChanged: async () => {}, prev: null, next: null, onOpen: () => {} })));
  await act(async () => { (el.querySelector('[data-testid="button-edit-tracking"]') as HTMLButtonElement)?.click(); });
  const select = el.querySelector('[data-testid="select-carrier"]') as HTMLSelectElement;
  expect(select.options.length).toBeGreaterThan(1000);
  await act(async () => { el.querySelector('[data-testid="input-tracking"]')!.dispatchEvent(new dom.window.FocusEvent("focusout", { bubbles: true })); });
  await settle();
  expect(select.value).toBe(match.label);
  expect(el.textContent).toContain(`Detected ${match.label}`);
});

it("switches the entire vendor view and documents to Chinese without translating products", async () => {
  const { setVendorLanguage, getVendorLanguage } = await import("../lib/vendor-language");
  const { vendorOrdersCsv } = await import("../lib/vendor-orders-csv");
  const { vendorPackingSlipHtml } = await import("../lib/vendor-packing-slip");
  const order = { id: "language-order", reference: "12614", status: "Submitted", submittedAt: new Date().toISOString(), stale: false,
    items: [{ productName: "Order", quantity: 2, unitCost: "10", lineTotal: "20" }], currency: "USD", productCost: "20", shippingCost: "5", totalCost: "25",
    shipping: { name: "Benjamin Bateman", address: "55 High Street", country: "Australia", phone: "+6112345", email: "" }, trackingNumber: null, carrier: null, images: [] };
  vi.stubGlobal("fetch", vi.fn(async (url: string) => new Response(JSON.stringify(
    url.endsWith("/wallets") ? walletFixture : url.endsWith("/me") ? { username: "vendor-a", vendorName: "Vendor A", vendorId: "a" } : { orders: [order] }
  ))));
  const el = setup();
  try {
    await act(async () => root.render(withQuery(createElement(VendorPortal)))); await settle();
    const dropdown = el.querySelector('[data-testid="select-vendor-language"]') as HTMLSelectElement;
    expect(dropdown.value).toBe("en");
    await act(async () => { dropdown.value = "zh"; dropdown.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
    expect(getVendorLanguage()).toBe("zh");
    expect(dom.window.localStorage.getItem("peps-vendor-language")).toBe("zh");
    expect(document.documentElement.lang).toBe("zh-CN");
    expect(el.textContent).toContain("今日待办");
    expect(el.textContent).toContain("Vendor A");
    await act(async () => (el.querySelector('[data-testid="card-order-language-order"]') as HTMLButtonElement).click());
    expect(el.textContent).toContain("打印装箱单");
    expect(el.textContent).toContain("保存物流信息并标记为已发货");
    expect(el.textContent).toContain("Order"); // Even a product named like a UI label remains unchanged.
    expect(el.textContent).toContain("Benjamin Bateman");
    expect(vendorOrdersCsv([order])).toContain('"已付款"');
    expect(vendorOrdersCsv([order])).toContain("2x Order");
    expect(vendorPackingSlipHtml(order)).toContain("收件人:");
    const current = el.querySelector('[data-testid="select-vendor-language"]') as HTMLSelectElement;
    await act(async () => { current.value = "en"; current.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
    expect(el.textContent).toContain("Print packing slip");
    expect(vendorOrdersCsv([order])).toContain('"Paid"');
  } finally { await act(async () => setVendorLanguage("en")); }
});
