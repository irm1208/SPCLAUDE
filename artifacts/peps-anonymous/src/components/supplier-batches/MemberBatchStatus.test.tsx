import { beforeEach, afterEach, expect, it, vi } from "vitest";
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
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(response)));
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); vi.unstubAllGlobals(); });
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 20)); });
async function mount(child: React.ReactNode) { await act(async () => root.render(h(QueryClientProvider, { client }, child))); await flush(); }

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
  expect(document.body.textContent).toContain("No supplier batches have been prepared yet");
  vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Batch status is not shared" }, { status: 403 }));
  await act(async () => { await client.invalidateQueries({ queryKey: ["member-supplier-batches"] }); }); await flush();
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Batch status is not shared");
  expect(document.querySelector("table")).toBeNull();
});
