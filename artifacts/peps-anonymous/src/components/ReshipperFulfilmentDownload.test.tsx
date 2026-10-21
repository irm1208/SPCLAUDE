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
  vi.stubGlobal("fetch", vi.fn());
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("downloads one combined file for the column recipient, with no members or other reshippers", async () => {
  await act(async () => root.render(h(ReshipperFulfilmentDownload, { orders, reshipperUsername: "@ajer", currency: "USD", groupBuyName: "HGH group buy" })));
  await act(async () => host.querySelector("button")!.click());
  const blob = vi.mocked(URL.createObjectURL).mock.calls[0][0] as Blob;
  const text = await blob.text();
  expect(text).toContain("@ajer");
  expect(text).toContain("HGH 36IU × 1.5");
  expect(text).toContain("Total: $150.00 USD");
  expect(text).toContain("Number of kits: 1.5");
  expect(text).not.toContain("PRIVATE");
  expect(text).not.toContain("OTHER PRODUCT");
  expect(fetch).not.toHaveBeenCalled();
  expect(dom.window.HTMLAnchorElement.prototype.click).toHaveBeenCalledOnce();
});
it("supports reshipper selection for list view and blocks downloads while routing", async () => {
  const props = { orders, currency: "GBP", groupBuyName: "HGH" };
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
  const props = { orders, reshipperUsername: "ajer", currency: "USD", groupBuyName: "HGH" };
  await act(async () => root.render(h(ReshipperFulfilmentDownload, props)));
  expect(host.querySelector("button")!.disabled).toBe(false);
  await act(async () => root.render(h(ReshipperFulfilmentDownload, { ...props, orders: orders.filter(o => o.reshipperUsername === "other") })));
  expect(host.querySelector("button")!.disabled).toBe(true);
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});
