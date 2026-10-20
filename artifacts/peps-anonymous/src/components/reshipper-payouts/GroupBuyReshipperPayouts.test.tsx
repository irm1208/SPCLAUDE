import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace test harness.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { GroupBuyReshipperPayouts } = await import("./GroupBuyReshipperPayouts");
const data = { orders: [], payouts: [], totals: [], needsReviewCount: 0, sourceNotice: "", paymentDetails: null };
let root: Root;
let el: HTMLDivElement;
beforeEach(() => { el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el); });
afterEach(() => { act(() => root.unmount()); el.remove(); });
const fetcher = () => vi.fn(async (_path: string, _init?: RequestInit) => new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } }));

it("opens payouts for the current group buy without a second group-buy selector", async () => {
  const request = fetcher();
  await act(async () => root.render(createElement(GroupBuyReshipperPayouts, {
    gbId: "hgh", reshippers: ["fazi28", "fazi28", "us-shipper"], fetcher: request,
  })));
  expect(request.mock.calls[0]?.[0]).toBe("/api/admin/reshippers/fazi28/gb/hgh/payouts");
  expect(el.textContent).toContain("Fees owed & payouts");
  expect(el.textContent).toContain("Payouts to fazi28");
  const select = el.querySelector("select")!;
  expect(select.options.length).toBe(2);
  expect(request.mock.calls.some(call => String(call[0]).endsWith("/payouts/groups"))).toBe(false);
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value")!.set!.call(select, "us-shipper");
    select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
  });
  expect(request.mock.calls.at(-1)?.[0]).toBe("/api/admin/reshippers/us-shipper/gb/hgh/payouts");
  expect(el.textContent).toContain("Payouts to us-shipper");
});

it("uses the new group buy when switching group buys and handles no assignments", async () => {
  const request = fetcher();
  for (const gbId of ["first", "second"]) {
    await act(async () => root.render(createElement(GroupBuyReshipperPayouts, { gbId, reshippers: ["fazi28"], fetcher: request })));
    expect(request.mock.calls.at(-1)?.[0]).toBe(`/api/admin/reshippers/fazi28/gb/${gbId}/payouts`);
  }
  const count = request.mock.calls.length;
  await act(async () => root.render(createElement(GroupBuyReshipperPayouts, { gbId: "empty", reshippers: [], fetcher: request })));
  expect(request.mock.calls.length).toBe(count);
  expect(el.textContent).toContain("Assign a reshipper");
  expect(el.querySelector('section[aria-label="Reshipper payouts"]')).toBeNull();
});
