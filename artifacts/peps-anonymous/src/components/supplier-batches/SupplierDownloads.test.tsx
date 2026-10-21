import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error The workspace supplies jsdom at runtime without its optional declaration package.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, getComputedStyle: dom.window.getComputedStyle.bind(dom.window) });
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { SupplierDeliveryDetails } = await import("./SupplierDeliveryDetails");
const { DirectSupplierDownload } = await import("./DirectSupplierDownload");
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, client: InstanceType<typeof QueryClient>;
const contact = { name: "Recipient", address: "Test Street\nTest City", country: "IT", email: "test@example.com", phone: "+3911111111" };
const pause = () => new Promise(r => setTimeout(r, 30));
async function mount(child: any) {
  await act(async () => { root.render(h(QueryClientProvider, { client }, child)); await pause(); });
  await act(pause);
}
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.stubGlobal("fetch", vi.fn());
  vi.spyOn(dom.window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:synthetic");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(async () => { await act(async () => root.unmount()); client.clear(); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("loads saved supplier details, requires every field and saves only the dedicated contact endpoint", async () => {
  const request = vi.fn(async () => Response.json({ contact }));
  await mount(h(SupplierDeliveryDetails, { request }));
  expect(host.querySelectorAll("[required]")).toHaveLength(5);
  expect(host.querySelector<HTMLInputElement>("input")?.value).toBe("Recipient");
  await act(async () => { host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await pause(); });
  expect(request).toHaveBeenLastCalledWith("/api/reshipper/supplier-delivery", expect.objectContaining({ method: "PUT", body: JSON.stringify(contact) }));
  expect(host.textContent).toContain("Supplier delivery details saved.");
  expect(host.querySelector("details")?.open).toBe(true);
});
it("does not allow saving over a failed contact load and exposes retry", async () => {
  const request = vi.fn().mockResolvedValueOnce(Response.json({ error: "Please retry" }, { status: 503 }))
    .mockResolvedValueOnce(Response.json({ contact }));
  await mount(h(SupplierDeliveryDetails, { request }));
  expect(host.querySelector("form")).toBeNull();
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Please retry");
  await act(async () => { host.querySelector("button")!.click(); await pause(); });
  expect(host.querySelector("form")).not.toBeNull();
});
it("selects specific direct orders and downloads only those IDs", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ orders: [
    { id: "a", code: "100", username: "one", country: "Italy", kits: 30 },
    { id: "b", code: "101", username: "two", country: "US", kits: 40 },
  ] })).mockResolvedValueOnce(new Response("Supplier TXT"));
  await mount(h(DirectSupplierDownload, { groupBuyId: "gb", headers: { "x-admin-secret": "synthetic" } }));
  await act(async () => { host.querySelector("button")!.click(); await pause(); }); await act(pause);
  await act(async () => { host.querySelectorAll<HTMLInputElement>("input")[1].click(); });
  const download = [...host.querySelectorAll("button")].find(b => b.textContent?.includes("Download selected"))!;
  await act(async () => { download.click(); await pause(); });
  expect(fetch).toHaveBeenLastCalledWith("/api/admin/group-buys/gb/supplier-batches/direct-export-txt",
    expect.objectContaining({ method: "POST", body: JSON.stringify({ orderIds: ["a"] }), headers: expect.objectContaining({ "x-admin-secret": "synthetic" }) }));
  expect(URL.createObjectURL).toHaveBeenCalledOnce();
});
it("shows export validation failures rather than downloading an incomplete file", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(Response.json({ orders: [{ id: "a", code: "100", username: "one", country: "Italy", kits: 30 }] }))
    .mockResolvedValueOnce(Response.json({ error: "Set an exact supplier cost before downloading." }, { status: 400 }));
  await mount(h(DirectSupplierDownload, { groupBuyId: "gb" }));
  await act(async () => { host.querySelector("button")!.click(); await pause(); }); await act(pause);
  await act(async () => { host.querySelector<HTMLInputElement>("input")!.click(); });
  await act(async () => { [...host.querySelectorAll("button")].find(b => b.textContent?.includes("Download selected"))!.click(); await pause(); });
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Set an exact supplier cost");
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
