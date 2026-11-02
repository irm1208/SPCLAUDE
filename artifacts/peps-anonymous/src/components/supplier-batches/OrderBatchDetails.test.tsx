import { beforeEach, afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Workspace runtime dependency.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "MutationObserver"])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
(globalThis as any).React = React;
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { OrderBatchDetails } = await import("./OrderBatchDetails");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, client: InstanceType<typeof QueryClient>;
const batch = (id: string, orderId: string, status = "Prepared") => ({
  id, reference: `GB-TEST / ${id}`, status, isYourBatch: true, orders: [{ id: orderId, code: "same-code", status: "Processing" }],
});
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ batches: [batch("001", "o1"), batch("002", "o2")] })));
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); vi.unstubAllGlobals(); });
async function mount(orderId = "o1", accountKey = "member") {
  await act(async () => root.render(h(QueryClientProvider, { client }, h(OrderBatchDetails, { groupBuyId: "g1", orderId, accountKey }))));
  await act(async () => { await new Promise(r => setTimeout(r, 30)); });
}
it("shows the exact order's batch and status, not another order sharing its code", async () => {
  await mount();
  expect(host.textContent).toContain("GB-TEST / 001");
  expect(host.textContent).toContain("Prepared");
  expect(host.textContent).not.toContain("GB-TEST / 002");
});
it("shows multiple batches containing additions for the same order", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ batches: [batch("001", "o1"), batch("003", "o1", "Submitted to vendor")] }));
  await mount();
  expect(host.textContent).toContain("GB-TEST / 001");
  expect(host.textContent).toContain("GB-TEST / 003");
  expect(host.textContent).toContain("Submitted to vendor");
});
it("hides unassigned and released batches", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ batches: [{ ...batch("001", "o1"), isYourBatch: false }] }));
  await mount();
  expect(host.textContent).toBe("");
});
it("respects disabled member visibility without showing an error", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Disabled" }, { status: 403 }));
  await mount();
  expect(host.textContent).toBe("");
});
it("does not display the previous account's cached batch", async () => {
  await mount();
  vi.mocked(fetch).mockImplementation(async () => Response.json({ batches: [] }));
  await mount("o1", "other-member");
  expect(host.textContent).not.toContain("GB-TEST / 001");
});
it("shows a retry action on a temporary failure", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ error: "Unavailable" }, { status: 503 }));
  await mount();
  expect(host.textContent).toContain("Could not load batch details");
  expect(host.querySelector("button")?.textContent).toContain("Retry");
});
