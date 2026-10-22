import { beforeEach, afterEach, expect, it, vi } from "vitest";
// @ts-expect-error The workspace provides jsdom at runtime without its optional declaration package.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ReshipperFulfilmentDownload } = await import("./ReshipperFulfilmentDownload");
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
const orders = [
  { telegramUsername: "PRIVATE_ONE", reshipperUsername: "ajer", status: "Submitted", paymentStatus: "confirmed",
    grandTotal: 100, lineItems: [{ productName: "HGH 36IU", quantity: 1 }] },
  { telegramUsername: "PRIVATE_TWO", reshipperUsername: "AJER", status: "Submitted", paymentStatus: "unpaid",
    grandTotal: 50, lineItems: [{ productName: "HGH 36IU", quantity: 0.5 }] },
  { telegramUsername: "PRIVATE_THREE", reshipperUsername: "other", status: "Submitted", paymentStatus: "confirmed",
    grandTotal: 999, lineItems: [{ productName: "OTHER PRODUCT", quantity: 99 }] },
];
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:synthetic");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(dom.window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => orders }));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("downloads one combined file for the column recipient, with no members or other reshippers", async () => {
  await act(async () => root.render(h(ReshipperFulfilmentDownload, { orders, groupBuyId: "gb-test", reshipperUsername: "@ajer", currency: "USD", groupBuyName: "HGH group buy" })));
  await act(async () => host.querySelector("button")!.click());
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  const text = await blob.text();
  expect(text).toContain("@ajer");
  expect(text).toContain("HGH 36IU × 1.5");
  expect(text).toContain("Total: $150.00 USD");
  expect(text).toContain("Number of kits: 1.5");
  expect(text).not.toContain("PRIVATE");
  expect(text).not.toContain("OTHER PRODUCT");
  expect(fetch).toHaveBeenCalledOnce();
  expect(dom.window.HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
});
it("fetches the latest saved items on every download instead of exporting the loaded snapshot", async () => {
  vi.mocked(fetch).mockResolvedValue({
    ok: true, json: async () => [{ ...orders[0], grandTotal: 160, lineItems: [
      ...orders[0].lineItems, { productName: "Manually added Bronchogen", quantity: 0.5 },
    ] }],
  } as Response);
  await act(async () => root.render(h(ReshipperFulfilmentDownload, {
    orders, groupBuyId: "gb-test", reshipperUsername: "@ajer", currency: "USD", groupBuyName: "Uther October",
  })));
  await act(async () => host.querySelector("button")!.click());
  expect(fetch).toHaveBeenCalledWith("/api/organiser/group-buys/gb-test/orders",
    expect.objectContaining({ credentials: "include", cache: "no-store" }));
  const text = await (vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob).text();
  expect(text).toContain("Manually added Bronchogen × 0.5");
  expect(text).toContain("Total: $160.00 USD");
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true, json: async () => [{ ...orders[0], grandTotal: 200, lineItems: [{ productName: "GLOW", quantity: 2 }] }],
  } as Response);
  await act(async () => host.querySelector("button")!.click());
  const nextText = await (vi.mocked(URL.createObjectURL).mock.calls[1][0] as Blob).text();
  expect(nextText).toContain("GLOW × 2");
  expect(nextText).not.toContain("Manually added Bronchogen");
  expect(fetch).toHaveBeenCalledTimes(2);
});
it("does not export stale data if refreshing fails, returns malformed data or the orders were reassigned", async () => {
  await act(async () => root.render(h(ReshipperFulfilmentDownload, {
    orders, groupBuyId: "gb-test", reshipperUsername: "ajer", currency: "USD", groupBuyName: "Uther",
  })));
  for (const response of [
    { ok: false, json: async () => ({ error: "Cannot load orders" }) },
    { ok: true, json: async () => ({ orders }) },
    { ok: true, json: async () => [{ ...orders[0], reshipperUsername: "other" }] },
  ]) {
    vi.mocked(fetch).mockResolvedValueOnce(response as Response);
    await act(async () => host.querySelector("button")!.click());
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(host.querySelector('[role="alert"]')?.textContent).toBeTruthy();
  }
});
it("prevents duplicate clicks while the latest orders are loading", async () => {
  let resolve!: (value: Response) => void;
  vi.mocked(fetch).mockReturnValue(new Promise<Response>(done => { resolve = done; }));
  await act(async () => root.render(h(ReshipperFulfilmentDownload, {
    orders, groupBuyId: "gb-test", reshipperUsername: "ajer", currency: "USD", groupBuyName: "Uther",
  })));
  await act(async () => { host.querySelector("button")!.click(); host.querySelector("button")!.click(); });
  expect(fetch).toHaveBeenCalledOnce();
  expect(host.querySelector("button")!.disabled).toBe(true);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
  await act(async () => resolve({ ok: true, json: async () => orders } as Response));
  expect(URL.createObjectURL).toHaveBeenCalledOnce();
  expect(host.querySelector("button")!.disabled).toBe(false);
});
it("supports reshipper selection for list view and blocks downloads while routing", async () => {
  const props = { orders, groupBuyId: "gb-test", currency: "GBP", groupBuyName: "HGH" };
  await act(async () => root.render(h(ReshipperFulfilmentDownload, props)));
  expect(host.querySelector("button")!.disabled).toBe(true);
  const select = host.querySelector("select")!;
  await act(async () => { select.value = "ajer"; select.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(host.querySelector("button")!.disabled).toBe(false);
  await act(async () => root.render(h(ReshipperFulfilmentDownload, { ...props, disabled: true })));
  expect(host.querySelector("button")!.disabled).toBe(true);
  expect(select.disabled).toBe(true);
});
it("does not download a stale recipient after an assignment changes", async () => {
  const props = { orders, groupBuyId: "gb-test", reshipperUsername: "ajer", currency: "USD", groupBuyName: "HGH" };
  await act(async () => root.render(h(ReshipperFulfilmentDownload, props)));
  expect(host.querySelector("button")!.disabled).toBe(false);
  await act(async () => root.render(h(ReshipperFulfilmentDownload, { ...props, orders: orders.filter(o => o.reshipperUsername === "other") })));
  expect(host.querySelector("button")!.disabled).toBe(true);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
