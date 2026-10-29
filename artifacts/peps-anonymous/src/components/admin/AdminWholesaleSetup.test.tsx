import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLSelectElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { AdminWholesaleSetup } = await import("./AdminWholesaleSetup");
let root: ReturnType<typeof createRoot>;
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 15)); });
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
const res = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

const vendors = [
  {
    id: "north", name: "Northstar Labs", enabled: false,
    tiers: ["1–5 kits", "6–12 kits"], tierBounds: [5, 12], maxKitsPerPackage: 12,
    regions: [{ name: "United Kingdom", prices: [11, 9], countries: ["United Kingdom"] }],
  },
  {
    id: "coast", name: "Coastal Supply", enabled: true,
    tiers: ["1–10 kits"], tierBounds: [10], maxKitsPerPackage: 10,
    regions: [{ name: "Europe", priceNote: "Calculated at checkout", countries: ["France", "Germany"] }],
  },
];

it("loads vendors with authenticated credentials, scopes products, and saves a vendor without changing availability", async () => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/wholesale-vendors" && !init?.method) return res({ vendors, activeVendorId: "coast" });
    if (url === "/api/admin/wholesale-products") return res([]);
    if (url === "/api/admin/wholesale-vendors/north" && init?.method === "PUT") {
      return res({ ...vendors[0], ...(JSON.parse(init.body as string) as object) });
    }
    return res({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  root = createRoot(el);

  const renderVendorModal = ({ vendor, onSave, onClose }: {
    vendor: typeof vendors[number] | null;
    onSave: (data: object) => Promise<void>;
    onClose: () => void;
  }) => createElement("div", { role: "dialog" },
    createElement("p", null, vendor?.name ?? "New supplier"),
    createElement("button", { type: "button", onClick: () => void onSave({
      name: "Northstar Labs Revised", tiers: ["1–5 kits"], tierBounds: [5],
      maxKitsPerPackage: 5, regions: [{ name: "United Kingdom", prices: [10], countries: ["United Kingdom"] }],
    }) }, "Save modal"),
    createElement("button", { type: "button", onClick: onClose }, "Cancel"),
  );

  await act(async () => root.render(createElement(AdminWholesaleSetup, {
    secret: "secret-7",
    renderVendorModal,
  })));
  await settle();

  const listCall = fetchMock.mock.calls.find(call => call[0] === "/api/admin/wholesale-vendors");
  expect(listCall?.[1]?.credentials).toBe("include");
  expect((listCall?.[1]?.headers as Record<string, string>)["x-admin-secret"]).toBe("secret-7");
  await act(async () => {
    (el.querySelector('[data-testid="select-wholesale-vendor"]') as HTMLSelectElement).value = "north";
    (el.querySelector('[data-testid="select-wholesale-vendor"]') as HTMLSelectElement).dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  await settle();
  expect(el.textContent).toContain("Northstar Labs");
  expect(el.textContent).toContain("$11.00");
  expect(el.textContent).toContain("USD");
  expect(el.textContent).toContain("United Kingdom");

  await act(async () => (el.querySelector('[data-testid="button-edit-wholesale-details"]') as HTMLElement).click());
  expect(el.querySelector('[role="dialog"]')?.textContent).toContain("Northstar Labs");
  await act(async () => (el.querySelector('[role="dialog"] button') as HTMLElement).click());
  await settle();
  const updateCall = fetchMock.mock.calls.find(call => call[0] === "/api/admin/wholesale-vendors/north");
  expect(updateCall?.[1]?.method).toBe("PUT");
  expect(updateCall?.[1]?.credentials).toBe("include");
  expect((updateCall?.[1]?.headers as Record<string, string>)["x-admin-secret"]).toBe("secret-7");
  expect(JSON.parse(updateCall?.[1]?.body as string)).toEqual({
    name: "Northstar Labs Revised", tiers: ["1–5 kits"], tierBounds: [5],
    maxKitsPerPackage: 5, regions: [{ name: "United Kingdom", prices: [10], countries: ["United Kingdom"] }],
  });
  expect(el.textContent).toContain("Northstar Labs Revised");
  expect(el.textContent).toContain("Disabled");
});

it("shows load failures with a retry action", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(res({ error: "temporarily unavailable" }, 503))
    .mockResolvedValueOnce(res({ vendors: [], activeVendorId: null }))
    .mockResolvedValue(res([]));
  vi.stubGlobal("fetch", fetchMock);
  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  root = createRoot(el);
  await act(async () => root.render(createElement(AdminWholesaleSetup, { secret: "s", renderVendorModal: () => null })));
  await settle();
  expect(el.textContent).toContain("temporarily unavailable");
  await act(async () => (el.querySelector('[data-testid="button-retry-wholesale"]') as HTMLElement).click());
  await settle();
  expect(el.querySelector('[data-testid="select-wholesale-vendor"]')).not.toBeNull();
});

it("adds a vendor through the supplied modal and selects the created supplier", async () => {
  const created = {
    id: "new-vendor", name: "Harbor House", enabled: true,
    tiers: ["1–8 kits"], tierBounds: [8], maxKitsPerPackage: 8,
    regions: [{ name: "US", prices: [7.5], countries: ["United States"] }],
  };
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/wholesale-vendors" && !init?.method) return res({ vendors: [], activeVendorId: null });
    if (url === "/api/admin/wholesale-products") return res([]);
    if (url === "/api/admin/wholesale-vendors" && init?.method === "POST") return res(created);
    return res({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  root = createRoot(el);
  const renderVendorModal = ({ onSave, onClose }: {
    vendor: typeof vendors[number] | null;
    onSave: (data: object) => Promise<void>;
    onClose: () => void;
  }) => createElement("div", { role: "dialog" },
    createElement("button", { type: "button", onClick: () => void onSave({
      name: created.name, tiers: created.tiers, tierBounds: created.tierBounds,
      maxKitsPerPackage: created.maxKitsPerPackage, regions: created.regions,
    }) }, "Save modal"),
    createElement("button", { type: "button", onClick: onClose }, "Cancel"),
  );

  await act(async () => root.render(createElement(AdminWholesaleSetup, { secret: "s", renderVendorModal })));
  await settle();
  await act(async () => (el.querySelector('[data-testid="button-add-wholesale-vendor"]') as HTMLElement).click());
  await act(async () => (el.querySelector('[role="dialog"] button') as HTMLElement).click());
  await settle();

  const call = fetchMock.mock.calls.find(entry => entry[1]?.method === "POST");
  expect(call?.[0]).toBe("/api/admin/wholesale-vendors");
  expect(call?.[1]?.credentials).toBe("include");
  expect((call?.[1]?.headers as Record<string, string>)["x-admin-secret"]).toBe("s");
  expect((el.querySelector('[data-testid="select-wholesale-vendor"]') as HTMLSelectElement).value).toBe("new-vendor");
  expect(el.textContent).toContain("Harbor House");
});

it("guards duplicate modal submissions and keeps API errors visible above the open modal", async () => {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url === "/api/admin/wholesale-vendors" && !init?.method) return res({ vendors: [vendors[0]], activeVendorId: null });
    if (url === "/api/admin/wholesale-products") return res([]);
    if (url === "/api/admin/wholesale-vendors/north" && init?.method === "PUT") return res({ error: "supplier service unavailable" }, 503);
    return res({}, 404);
  });
  vi.stubGlobal("fetch", fetchMock);
  const el = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(el);
  root = createRoot(el);
  const renderVendorModal = ({ onSave }: {
    vendor: typeof vendors[number] | null;
    onSave: (data: object) => Promise<void>;
    onClose: () => void;
  }) => createElement("div", { role: "dialog" },
    createElement("button", { type: "button", onClick: () => void onSave({
      name: "Northstar Labs", tiers: ["1–5 kits"], tierBounds: [5],
      maxKitsPerPackage: 5, regions: [],
    }) }, "Save modal"),
  );

  await act(async () => root.render(createElement(AdminWholesaleSetup, { secret: "s", renderVendorModal })));
  await settle();
  await act(async () => (el.querySelector('[data-testid="button-edit-wholesale-details"]') as HTMLElement).click());
  const submit = el.querySelector('[role="dialog"] button') as HTMLElement;
  await act(async () => { submit.click(); submit.click(); });
  await settle();

  expect(fetchMock.mock.calls.filter(call => call[1]?.method === "PUT")).toHaveLength(1);
  expect(el.querySelector('[role="dialog"]')).not.toBeNull();
  expect(el.querySelector('[data-testid="wholesale-modal-error-layer"]')?.textContent).toContain("supplier service unavailable");
});
