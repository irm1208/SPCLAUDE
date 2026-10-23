import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace without its optional typings.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "Element", "Node", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const React = await import("react");
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { Fs3PastedList } = await import("./Fs3PastedList");
const costs = [{ id: 1, productName: "HGH 36IU", unitCost: 95.25 }, { id: 2, productName: "Tirzepatide 30mg", unitCost: 80 }];
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const writeText = vi.fn();
const refresh = vi.fn().mockResolvedValue(undefined);
const props = { costs, loading: false, error: "", onRefresh: refresh };
const element = <T extends Element = HTMLButtonElement>(id: string) => host.querySelector(`[data-testid="${id}"]`) as T;
async function click(id: string) { await act(async () => element<HTMLButtonElement>(id).click()); }
async function input(id: string, value: string) {
  const el = element<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(id);
  const prototype = el.tagName === "TEXTAREA" ? dom.window.HTMLTextAreaElement.prototype
    : el.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new dom.window.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
async function render(patch: Partial<Parameters<typeof Fs3PastedList>[0]> = {}) {
  await act(async () => root.render(h(Fs3PastedList, { ...props, ...patch })));
}
async function review(text = "HGH 36IU x 2") {
  await input("input-pasted-list", text); await click("button-review-list");
}
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  writeText.mockReset().mockResolvedValue(undefined); refresh.mockClear();
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); });

it("shows saved costs, copies and downloads the exact same reviewed supplier list", async () => {
  await render(); await review("HGH 36IU x 2\nTirzepatide 30mg × 3");
  expect(element("text-total").textContent).toContain("$430.50");
  await click("button-copy-list");
  const copied = writeText.mock.calls[0][0];
  expect(copied).toContain("HGH 36IU | 2 | USD 95.25 | USD 190.50");
  expect(copied).toContain("Grand total: USD 430.50");
  expect(element("status-copy").textContent).toContain("copied");
  let downloaded: Blob | undefined;
  const createUrl = vi.fn((blob: Blob) => { downloaded = blob; return "blob:synthetic"; });
  const revoke = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: revoke });
  vi.spyOn(dom.window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  await click("button-download-txt");
  expect(await downloaded!.text()).toBe(copied);
  expect(revoke).toHaveBeenCalledWith("blob:synthetic");
  vi.unstubAllGlobals();
});

it("requires unknown products and quantities to be corrected and updates totals after removing a row", async () => {
  await render(); await review("Mystery x 2\nHGH 36IU");
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(true);
  expect(element("text-total").textContent).toContain("Partial subtotal");
  await input("select-product-0", "2");
  await input("input-quantity-1", "0.5");
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(false);
  expect(element("text-total").textContent).toContain("$207.63");
  await click("button-remove-0");
  expect(element("text-total").textContent).toContain("$47.63");
  await click("button-remove-1");
  expect(host.querySelector("table")).toBeNull();
  expect(host.textContent).toContain("All lines removed");
});

it("blocks stale pasted text until re-reviewed and reset removes private working content", async () => {
  await render(); await review();
  await input("input-pasted-list", "HGH 36IU x 3");
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(true);
  expect(element("status-stale")).not.toBeNull();
  await click("button-review-list");
  expect(element("text-total").textContent).toContain("$285.75");
  await click("button-reset-list");
  expect(element<HTMLTextAreaElement>("input-pasted-list").value).toBe("");
  expect(host.querySelector("table")).toBeNull();
});

it("blocks export for loading/errors and reprices from refreshed costs without re-pasting", async () => {
  await render(); await review();
  await render({ loading: true });
  expect(element<HTMLButtonElement>("button-download-txt").disabled).toBe(true);
  await render({ error: "Network unavailable" });
  expect(host.textContent).toContain("Network unavailable");
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(true);
  await click("button-refresh-prices");
  expect(refresh).toHaveBeenCalledOnce();
  await render({ costs: [{ ...costs[0], unitCost: 100 }] });
  expect(element("text-total").textContent).toContain("$200.00");
  await click("button-copy-list");
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Grand total: USD 200.00"));
  await render({ costs: [] });
  expect(host.textContent).toContain("No saved prices");
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(true);
});

it("keeps export blocked throughout a local refresh even if the caller has not set loading", async () => {
  let resolve!: () => void;
  const onRefresh = () => new Promise<void>(done => { resolve = done; });
  await render({ onRefresh }); await review();
  await click("button-refresh-prices");
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(true);
  await act(async () => resolve());
  expect(element<HTMLButtonElement>("button-copy-list").disabled).toBe(false);
});

it("reports clipboard failures with a working download alternative", async () => {
  writeText.mockRejectedValue(new Error("Permission denied"));
  await render(); await review(); await click("button-copy-list");
  expect(element("status-copy").textContent).toContain("use Download TXT");
  expect(element<HTMLButtonElement>("button-download-txt").disabled).toBe(false);
});

it("keeps the table in a labelled local scroll container for narrow screens", async () => {
  await render(); await review();
  const scroll = element("table-scroll");
  expect(scroll.className).toContain("overflow-x-auto");
  expect(host.querySelector('label[for="fs3-pasted-list"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Saved product for line 1"]')).not.toBeNull();
  expect(host.querySelector('[aria-label="Quantity for line 1"]')).not.toBeNull();
});
