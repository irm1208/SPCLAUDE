import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/sleepingpepisadmin" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "location", "history", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: VendorPortalIssuesAdmin } = await import("./VendorPortalIssuesAdmin");
let root: ReturnType<typeof createRoot>;
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); }
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });

const issue = { id: "i1", submissionId: "s1", vendorId: "vendor-a", type: "partial_stock", label: "Only part of the order is in stock", note: "1 of 2 kits", reportedBy: "northstar", createdAt: new Date().toISOString(), resolvedAt: null, resolvedBy: null, resolution: null, open: true, reference: "8000123" };
const settings = [
  { vendorId: "vendor-a", vendorName: "Vendor A", closedFrom: null, closedUntil: new Date(Date.now() + 86_400_000).toISOString(), closedNote: "Stocktake", handlingDays: 2, defaultCarrier: "DPD", closedNow: true, updatedAt: null, updatedBy: "northstar" },
  { vendorId: "vendor-b", vendorName: "Vendor B", closedFrom: null, closedUntil: null, closedNote: null, handlingDays: null, defaultCarrier: null, closedNow: false, updatedAt: null, updatedBy: null },
];

it("shows open vendor problems and closed vendors, and resolves a problem with the admin's note", async () => {
  const calls: Array<[string, RequestInit | undefined]> = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    calls.push([url, init]);
    if (url.endsWith("/resolve")) return { ok: true, json: async () => ({ issue: { ...issue, open: false, resolution: "Ship what you have" } }) };
    return { ok: true, json: async () => ({ issues: calls.some(([u]) => u.endsWith("/resolve")) ? [{ ...issue, open: false, resolvedBy: "admin", resolvedAt: new Date().toISOString(), resolution: "Ship what you have" }] : [issue], settings }) };
  }));
  dom.window.prompt = vi.fn(() => "Ship what you have");
  const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el); root = createRoot(el);
  await act(async () => root.render(createElement(VendorPortalIssuesAdmin, { secret: "synthetic-admin-secret" })));
  await settle();
  expect(calls[0][0]).toBe("/api/admin/vendor-portal/issues");
  expect((calls[0][1]?.headers as Record<string, string>)["x-admin-secret"]).toBe("synthetic-admin-secret");
  expect(el.querySelector('[data-testid="text-open-issue-count"]')?.textContent).toContain("1 open");
  expect(el.querySelector('[data-testid="row-issue-i1"]')?.textContent).toContain("8000123");
  expect(el.querySelector('[data-testid="row-availability-vendor-a"]')?.textContent).toContain("Closed until");
  expect(el.querySelector('[data-testid="row-availability-vendor-b"]')?.textContent).toContain("Accepting orders");
  await act(async () => (el.querySelector('[data-testid="button-resolve-i1"]') as HTMLButtonElement).click());
  await settle();
  const resolve = calls.find(([u]) => u.endsWith("/resolve"))!;
  expect(resolve[0]).toBe("/api/admin/vendor-portal/issues/i1/resolve");
  expect(JSON.parse(String(resolve[1]?.body))).toEqual({ resolution: "Ship what you have" });
  expect(el.querySelector('[data-testid="text-issue-admin-result"]')?.textContent).toContain("Resolved 8000123");
  expect(el.querySelector('[data-testid="row-issue-i1"]')).toBeNull();
});

it("does not pause a vendor when the admin cancels the date prompt", async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ issues: [], settings }) }));
  vi.stubGlobal("fetch", fetchMock);
  dom.window.prompt = vi.fn(() => null);
  const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el); root = createRoot(el);
  await act(async () => root.render(createElement(VendorPortalIssuesAdmin, { secret: "synthetic-admin-secret" })));
  await settle();
  await act(async () => (el.querySelector('[data-testid="button-availability-vendor-b"]') as HTMLButtonElement).click());
  await settle();
  expect(fetchMock.mock.calls.every(([url]: [string]) => url === "/api/admin/vendor-portal/issues")).toBe(true);
});
