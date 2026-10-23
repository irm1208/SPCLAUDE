import { beforeEach, afterEach, expect, it, vi } from "vitest";
// @ts-expect-error The workspace provides jsdom at runtime without its optional declaration package.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "DocumentFragment", "Node", "NodeFilter", "MutationObserver", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, getComputedStyle: dom.window.getComputedStyle.bind(dom.window) });
const React = await import("react");
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { MemberBatchMenu, MemberBatchStatus } = await import("./MemberBatchStatus");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, client: InstanceType<typeof QueryClient>;
const group = { id: "gb", name: "Test group buy", showSupplierBatches: true };
const response = { groupBuy: group, batches: [{ id: "b", reference: "SB-001", region: "EU", kits: 100.5,
  status: "Ordered from supplier", isYourBatch: true, createdAt: "2026-10-01Z", orderedAt: "2026-10-02Z" }] };
it("shows only Direct shipping for direct-only orders, not regional queues or supplier batches", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...response, directShipping: true, directShippingOnly: true,
    countryRequired: true, regions: [{ id: "eu", name: "EU", kits: 35, targetKits: 50, status: "Filling" }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("Direct shipping");
  expect(document.querySelector('[role="progressbar"]')).toBeNull();
  expect(document.querySelector("table")).toBeNull();
  expect(document.body.textContent).not.toContain("35 / 50");
  expect(document.body.textContent).not.toContain("Set your country");
  expect(document.body.textContent).not.toContain("once a batch is prepared");
  expect(document.body.textContent).not.toContain("This tracks the supplier batch");
});
it("keeps regional batches visible when a member has both direct and reshipper orders", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...response, directShipping: true, directShippingOnly: false,
    regions: [{ id: "eu", name: "EU", kits: 35, targetKits: 50, status: "Filling", yourOrderStatus: "included" }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("Direct shipping");
  expect(document.body.textContent).toContain("35 / 50 kits");
  expect(document.body.textContent).toContain("Your order is in this batch");
  expect(document.body.textContent).toContain("SB-001");
});
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(response)));
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); vi.unstubAllGlobals(); });
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });
async function mount(child: React.ReactNode) { await act(async () => root.render(h(QueryClientProvider, { client }, child))); await flush(); }

it("clearly tells the member that their order is included in the current filling batch", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ groupBuy: group, batches: [],
    regions: [{ id: "uk", name: "United Kingdom", kits: 34, targetKits: 100, status: "Filling", yourOrderStatus: "included" }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("United Kingdom — Current batch");
  expect(document.body.textContent).toContain("Your order is in this batch");
  expect(document.body.textContent).toContain("34 / 100 kits");
  expect(document.body.textContent).not.toContain("Next batch");
  expect(document.body.textContent).not.toContain("No supplier batches have been prepared");
});
it("does not claim that an unpaid, direct or later queued order is in this batch", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ groupBuy: group, batches: [],
    regions: [{ id: "uk", name: "United Kingdom", kits: 105, targetKits: 100, status: "Ready", yourOrderStatus: "waiting" }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("Your order is waiting for a later batch");
  expect(document.body.textContent).not.toContain("Your order is in this batch");
  vi.mocked(fetch).mockResolvedValue(Response.json({ groupBuy: group, batches: [],
    regions: [{ id: "uk", name: "United Kingdom", kits: 34, targetKits: 100, status: "Filling", yourOrderStatus: "not_included" }] }));
  await act(async () => { await client.invalidateQueries({ queryKey: ["member-supplier-batches"] }); }); await flush();
  expect(document.body.textContent).toContain("Your order is not included in this filling batch");
  expect(document.body.textContent).not.toContain("Your order is in this batch");
});
it("renders no batch menu or request when visibility is disabled", async () => {
  await mount(h(MemberBatchMenu, { gb: { ...group, showSupplierBatches: false } }));
  expect(host.textContent).toBe("");
  expect(fetch).not.toHaveBeenCalled();
});
it("opens a read-only table from the menu and highlights the member's own batch", async () => {
  await mount(h(MemberBatchMenu, { gb: group }));
  expect(fetch).not.toHaveBeenCalled();
  await act(async () => host.querySelector("summary")!.click());
  await act(async () => host.querySelector("button")!.click()); await flush();
  const dialog = document.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("SB-001");
  expect(dialog.textContent).toContain("100.5");
  expect(dialog.textContent).toContain("Your batch");
  expect(dialog.textContent).toContain("Ordered from supplier");
  expect(dialog.querySelectorAll("table input")).toHaveLength(0);
  expect(fetch).toHaveBeenCalledWith("/api/group-buys/gb/supplier-batches", expect.objectContaining({ credentials: "include", cache: "no-store" }));
});
it("shows a real empty state, and removes cached rows when sharing is revoked", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ groupBuy: group, batches: [] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("Your order has not been assigned to a supplier batch yet.");
  vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Batch status is not shared" }, { status: 403 }));
  await act(async () => { await client.invalidateQueries({ queryKey: ["member-supplier-batches"] }); }); await flush();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Batch status is not shared");
  expect(document.querySelector("table")).toBeNull();
});
it("never displays unrelated batch references, including stale data from a previous API version", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...response,
    batches: [...response.batches, { ...response.batches[0], id: "other", reference: "GB-OTHER / 002", isYourBatch: false }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("SB-001");
  expect(document.body.textContent).not.toContain("GB-OTHER");
  expect(document.querySelectorAll("tbody tr")).toHaveLength(1);
});
it("shows an unassigned message instead of any other member's batch", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ ...response,
    batches: [{ ...response.batches[0], isYourBatch: false }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("Your order has not been assigned to a supplier batch yet.");
  expect(document.body.textContent).not.toContain("SB-001");
  expect(document.querySelector("table")).toBeNull();
});
it("shows the member's regional progress even before any batch has been prepared", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ groupBuy: group, batches: [],
    regions: [{ id: "eu", name: "EU", kits: 18, targetKits: 100, status: "Filling" }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("18 / 100 kits");
  expect(document.body.textContent).toContain("Filling");
  const progress = document.querySelector('[role="progressbar"]')!;
  expect(progress.getAttribute("aria-valuenow")).toBe("18");
  expect(progress.getAttribute("aria-valuemax")).toBe("100");
  expect(document.body.textContent).not.toContain("United Kingdom");
});
it("shows readiness and a country-required message without inventing progress", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ groupBuy: group, batches: [],
    regions: [{ id: "uk", name: "UK", kits: 105.5, targetKits: 100, status: "Ready" }] }));
  await mount(h(MemberBatchStatus, { gb: group, onClose: vi.fn() }));
  expect(document.body.textContent).toContain("105.5 / 100 kits");
  expect(document.body.textContent).toContain("Ready");
  expect(document.querySelector('[role="progressbar"]')?.getAttribute("aria-valuenow")).toBe("100");
  vi.mocked(fetch).mockResolvedValue(Response.json({ groupBuy: group, batches: [], regions: [], countryRequired: true }));
  await act(async () => { await client.invalidateQueries({ queryKey: ["member-supplier-batches"] }); }); await flush();
  expect(document.body.textContent).toContain("Set your country");
  expect(document.querySelector('[role="progressbar"]')).toBeNull();
});
