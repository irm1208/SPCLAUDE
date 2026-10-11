import assert from "node:assert/strict";
import { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace browser-test dependency.
import { fireEvent } from "../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";

let createRoot: typeof import("react-dom/client").createRoot;
let Panel: typeof import("./OrderSidePanel").OrderSidePanel;
let root: Root | undefined;
let dom: JSDOM;
let scrolled = false;
const props = {
  items: [{ id: "a", productName: "SS31 50mg", quantity: 2, lineTotal: 100 }],
  total: 107,
  formatPrice: (value: number) => `$${value.toFixed(2)}`,
  hidePrices: false,
  hideTotal: false,
  shippingPending: false,
};

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Event", "Node", "NodeFilter", "MutationObserver", "CustomEvent", "MouseEvent"]) {
    globals[key] = dom.window[key];
  }
  globals.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLElement.prototype.scrollIntoView = () => { scrolled = true; };
  createRoot = (await import("react-dom/client")).createRoot;
  Panel = (await import("./OrderSidePanel")).OrderSidePanel;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = "";
});
after(() => dom.window.close());

async function mount() {
  scrolled = false;
  document.body.innerHTML = '<div id="selected-order-items" tabindex="-1"><details><summary>Your order</summary><input aria-label="Quantity"></details></div>';
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<Panel {...props} />));
}

test("opens a right-side order panel and reflects live draft updates", async () => {
  await mount();
  const trigger = [...document.querySelectorAll("button")].find(button => button.textContent?.includes("View your order"))!;
  await act(async () => fireEvent.click(trigger));
  assert.match(document.querySelector('[role="dialog"]')!.textContent!, /SS31 50mg/);
  assert.match(document.querySelector('[role="dialog"]')!.textContent!, /\$107\.00/);
  await act(async () => root!.render(<Panel {...props} total={157} items={[{ ...props.items[0], quantity: 3, lineTotal: 150 }]} />));
  assert.match(document.querySelector('[role="dialog"]')!.textContent!, /3 kits/);
  assert.match(document.querySelector('[role="dialog"]')!.textContent!, /\$157\.00/);
  const close = [...document.querySelectorAll("button")].find(button => button.textContent === "Close")!;
  await act(async () => fireEvent.click(close));
  assert.equal(document.querySelector('[role="dialog"]'), null);
});

test("edit selected items closes the panel and opens the separate bottom section", async () => {
  await mount();
  const trigger = [...document.querySelectorAll("button")].find(button => button.textContent?.includes("View your order"))!;
  await act(async () => fireEvent.click(trigger));
  const edit = [...document.querySelectorAll("button")].find(button => button.textContent === "Edit selected items")!;
  await act(async () => {
    fireEvent.click(edit);
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.querySelector("details")!.open, true);
  assert.equal(scrolled, true);
});
