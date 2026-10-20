import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "HTMLTextAreaElement", "Event", "Node", "localStorage"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { useDraftStore } = await import("../hooks/use-draft-store");
const { ReviewShippingDetails } = await import("./ReviewShippingDetails");
let root: Root;
let el: HTMLDivElement;
beforeEach(() => {
  useDraftStore.setState({ shippingName: "Existing Member", shippingAddress: "Saved address", shippingCountry: "Italy", shippingPhone: "+39 123456789", shippingEmail: "test@example.com" });
  el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); });

it("edits the persisted draft on review and retains edits when remounted", async () => {
  const render = () => root.render(createElement(ReviewShippingDetails, { requireEuContact: true, countryLocked: true, onChangeDelivery: vi.fn() }));
  await act(async () => render());
  const name = el.querySelector<HTMLInputElement>("#review-shipping-name")!;
  expect(name.value).toBe("Existing Member");
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(name, "Updated Member");
    name.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  expect(useDraftStore.getState().shippingName).toBe("Updated Member");
  expect(el.querySelector<HTMLInputElement>("#review-shipping-phone")!.required).toBe(true);
  expect(el.querySelector<HTMLInputElement>("#review-shipping-email")!.required).toBe(true);
  await act(async () => root.render(null));
  await act(async () => render());
  expect(el.querySelector<HTMLInputElement>("#review-shipping-name")!.value).toBe("Updated Member");
  expect(useDraftStore.getState().shippingAddress).toBe("Saved address");
});

it("keeps the priced GB country read-only and sends country changes back to delivery choices", async () => {
  const change = vi.fn();
  await act(async () => root.render(createElement(ReviewShippingDetails, { requireEuContact: true, countryLocked: true, onChangeDelivery: change })));
  expect(el.querySelector<HTMLInputElement>("#review-shipping-country")!.readOnly).toBe(true);
  await act(async () => el.querySelector("button")!.click());
  expect(change).toHaveBeenCalledOnce();
  await act(async () => root.render(createElement(ReviewShippingDetails, { requireEuContact: false, countryLocked: false, onChangeDelivery: change })));
  expect(el.querySelector("#review-shipping-country")!.tagName).toBe("SELECT");
  expect(el.querySelector<HTMLInputElement>("#review-shipping-email")!.required).toBe(false);
});
