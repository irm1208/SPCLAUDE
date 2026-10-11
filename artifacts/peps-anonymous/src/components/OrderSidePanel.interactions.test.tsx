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
let useDraftStore: typeof import("../hooks/use-draft-store").useDraftStore;
let clampQuantity: typeof import("../lib/order-panel-quantity").clampOrderPanelQuantity;
let root: Root | undefined;
let dom: JSDOM;
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
  globals.localStorage = dom.window.localStorage;
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  Panel = (await import("./OrderSidePanel")).OrderSidePanel;
  useDraftStore = (await import("../hooks/use-draft-store")).useDraftStore;
  clampQuantity = (await import("../lib/order-panel-quantity")).clampOrderPanelQuantity;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = "";
});
after(() => dom.window.close());

async function mount(extraProps: Record<string, unknown> = {}) {
  document.body.innerHTML = '<div id="selected-order-items" tabindex="-1"><details><summary>Your order</summary><input aria-label="Quantity"></details></div>';
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<Panel {...props} {...extraProps} />));
}

test("opens a right-side order panel and reflects live draft updates", async () => {
  await mount();
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Open your order"]')!;
  assert.ok(trigger);
  assert.ok(trigger.classList.contains("fixed"));
  assert.ok(trigger.classList.contains("right-0"));
  assert.equal(trigger.parentElement, document.body, "fixed tab must escape clipping and scrolling ancestors");
  assert.equal(trigger.textContent?.trim(), "", "side button should be icon-only");
  assert.ok(trigger.querySelector("svg"));
  assert.ok(trigger.classList.contains("h-12"));
  assert.ok(trigger.classList.contains("w-11"));
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

test("continue browsing closes the panel without leaving the current location", async () => {
  await mount();
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Open your order"]')!;
  await act(async () => fireEvent.click(trigger));
  const edit = [...document.querySelectorAll("button")].find(button => button.textContent === "Continue browsing")!;
  await act(async () => {
    fireEvent.click(edit);
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(document.querySelector("details")!.open, false);
});

test("edits and removes items directly in the open panel", async () => {
  const changes: unknown[] = [];
  const removals: string[] = [];
  await mount({
    items: [{ ...props.items[0], allowHalfKits: true, maxQuantity: 3 }],
    onQuantityChange: (id: string, quantity: number) => changes.push([id, quantity]),
    onRemove: (id: string) => removals.push(id),
    watermark: <div aria-hidden="true" className="price-watermark">@testmember</div>,
  });
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const dialog = document.querySelector('[role="dialog"]')!;
  assert.match(dialog.textContent!, /@testmember/);
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Increase SS31 50mg quantity"]')!));
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Decrease SS31 50mg quantity"]')!));
  const input = dialog.querySelector('input[aria-label="SS31 50mg quantity in kits"]') as HTMLInputElement;
  assert.equal(input.step, "0.5");
  assert.equal(input.max, "3");
  await act(async () => fireEvent.change(input, { target: { value: "1.5" } }));
  assert.deepEqual(changes, [["a", 3], ["a", 1], ["a", 1.5]]);
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Remove SS31 50mg from order"]')!));
  assert.deepEqual(removals, ["a"]);
  assert.ok(document.querySelector('[role="dialog"]'), "editing does not close the panel");
});

test("preview mode disables all editing controls", async () => {
  await mount({
    items: [{ ...props.items[0], allowHalfKits: false, maxQuantity: 2, increaseDisabled: true }],
    onQuantityChange: () => assert.fail("preview must not change the draft"),
    onRemove: () => assert.fail("preview must not remove an item"),
    editingDisabled: true,
  });
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const dialog = document.querySelector('[role="dialog"]')!;
  const input = dialog.querySelector("input") as HTMLInputElement;
  assert.equal(input.step, "1");
  assert.equal(input.disabled, true);
  for (const button of dialog.querySelectorAll('button[aria-label]')) {
    assert.equal((button as HTMLButtonElement).disabled, true);
  }
});

test("stock or quantity limits still allow decreases and removals", async () => {
  const changes: unknown[] = [];
  const removals: string[] = [];
  await mount({
    items: [{ ...props.items[0], allowHalfKits: false, maxQuantity: 2, increaseDisabled: true }],
    onQuantityChange: (id: string, quantity: number) => changes.push([id, quantity]),
    onRemove: (id: string) => removals.push(id),
  });
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const dialog = document.querySelector('[role="dialog"]')!;
  const plus = dialog.querySelector('button[aria-label="Increase SS31 50mg quantity"]') as HTMLButtonElement;
  assert.equal(plus.disabled, true);
  await act(async () => fireEvent.click(plus));
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Decrease SS31 50mg quantity"]')!));
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Remove SS31 50mg from order"]')!));
  assert.deepEqual(changes, [["a", 1]]);
  assert.deepEqual(removals, ["a"]);
});

test("panel edits update the shared draft, line prices and total, and removal shows the empty state", async () => {
  useDraftStore.setState({
    lineItems: [{ ...props.items[0], productId: "product-a", unitPrice: 50 }],
  });
  function DraftPanel() {
    const draft = useDraftStore();
    return <Panel {...props}
      items={draft.lineItems.map(item => ({ ...item, allowHalfKits: true, maxQuantity: 3.5 }))}
      total={draft.lineItems.reduce((sum, item) => sum + item.lineTotal, 0) + 7}
      onQuantityChange={(id, requested) => {
        const item = useDraftStore.getState().lineItems.find(line => line.id === id)!;
        const quantity = clampQuantity(requested, item.quantity, { allowHalfKits: true, maxQuantity: 3.5 });
        if (quantity != null) draft.updateLineItem(id, { quantity });
      }}
      onRemove={id => draft.removeLineItem(id)}
    />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<DraftPanel />));
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Increase SS31 50mg quantity"]')!));
  assert.equal(useDraftStore.getState().lineItems[0].quantity, 3);
  assert.equal(useDraftStore.getState().lineItems[0].lineTotal, 150);
  assert.match(dialog.textContent!, /\$157\.00/);
  const input = dialog.querySelector('input[aria-label="SS31 50mg quantity in kits"]')!;
  await act(async () => fireEvent.change(input, { target: { value: "99" } }));
  assert.equal(useDraftStore.getState().lineItems[0].quantity, 3.5);
  assert.match(dialog.textContent!, /\$182\.00/);
  await act(async () => fireEvent.click(dialog.querySelector('button[aria-label="Remove SS31 50mg from order"]')!));
  assert.equal(useDraftStore.getState().lineItems.length, 0);
  assert.match(dialog.textContent!, /No products added yet/);
  assert.match(dialog.textContent!, /\$7\.00/);
});
