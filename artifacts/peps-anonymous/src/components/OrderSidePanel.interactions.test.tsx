import assert from "node:assert/strict";
import React, { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace browser-test dependency.
import { fireEvent } from "../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";

// Match the automatic JSX runtime used by Vite when running through node/tsx.
Object.assign(globalThis, { React });

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
  onReview: () => {},
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

test("review order invokes the review handler and closes the panel", async () => {
  let reviews = 0;
  await mount({ onReview: () => { reviews += 1; } });
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-label="Open your order"]')!;
  await act(async () => fireEvent.click(trigger));
  const edit = [...document.querySelectorAll("button")].find(button => button.textContent === "Review order")!;
  assert.ok(edit, "panel must offer the review action");
  await act(async () => {
    fireEvent.click(edit);
    await new Promise(resolve => setTimeout(resolve, 20));
  });
  assert.equal(document.querySelector('[role="dialog"]'), null);
  assert.equal(reviews, 1);
  assert.equal(document.querySelector("details")!.open, false);
});

test("review order stays disabled when the form cannot proceed", async () => {
  let reviews = 0;
  await mount({ onReview: () => { reviews += 1; }, reviewDisabled: true });
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const review = [...document.querySelectorAll("button")].find(button => button.textContent === "Review order")!;
  assert.ok(review, "panel must offer the review action");
  assert.equal(review.disabled, true);
  await act(async () => fireEvent.click(review));
  assert.equal(reviews, 0);
  assert.ok(document.querySelector('[role="dialog"]'));
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

test("delivery selection updates the shared draft, total, and direct-shipping flag", async () => {
  useDraftStore.setState({
    lineItems: [{ ...props.items[0], productId: "product-a", unitPrice: 50 }],
    deliveryMethodId: "royal", deliveryMethod: "Royal Mail", deliveryPrice: 7,
    directShippingRequested: false,
  });
  const methods = [
    { id: "royal", name: "Royal Mail", price: 7 },
    { id: "inpost", name: "InPost", price: 3 },
    { id: "__direct_shipping", name: "Direct to Home", price: null, requiresAddress: true },
  ];
  function DeliveryPanel() {
    const draft = useDraftStore();
    return <Panel {...props}
      total={100 + draft.deliveryPrice}
      shippingPending={draft.directShippingRequested}
      delivery={{
        options: methods, selectedId: draft.deliveryMethodId,
        onSelect: id => {
          const method = methods.find(option => option.id === id)!;
          draft.setDeliveryMethod(method.id, method.name, method.price ?? 0);
          draft.setDirectShippingRequested(id === "__direct_shipping");
        },
      }}
    />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<DeliveryPanel />));
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const dialog = document.querySelector('[role="dialog"]')!;
  await act(async () => fireEvent.click(dialog.querySelector('input[value="inpost"]')!));
  assert.equal(useDraftStore.getState().deliveryMethodId, "inpost");
  assert.equal(useDraftStore.getState().deliveryPrice, 3);
  assert.equal(useDraftStore.getState().directShippingRequested, false);
  assert.match(dialog.textContent!, /\$103\.00/);
  assert.equal((dialog.querySelector('input[value="inpost"]') as HTMLInputElement).checked, true);
  await act(async () => fireEvent.click(dialog.querySelector('input[value="__direct_shipping"]')!));
  assert.equal(useDraftStore.getState().directShippingRequested, true);
  assert.match(dialog.textContent!, /Quote required/);
  assert.match(dialog.textContent!, /Shipping has not been quoted/);
  await act(async () => fireEvent.click(dialog.querySelector('input[value="royal"]')!));
  assert.equal(useDraftStore.getState().directShippingRequested, false);
  assert.match(dialog.textContent!, /\$107\.00/);
});

test("notes and tips stay in sync with the draft, update the total, and survive reopening", async () => {
  useDraftStore.setState({ notes: "", tip: 0 });
  function ExtrasPanel() {
    const draft = useDraftStore();
    return <Panel {...props}
      total={107 + draft.tip}
      extras={{
        notes: draft.notes, onNotesChange: draft.setNotes,
        tip: draft.tip, tipOptions: [0, 1, 2, 3, 5, 10, 15, 20], onTipChange: draft.setTip,
      }}
    />;
  }
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<ExtrasPanel />));
  const trigger = document.querySelector('button[aria-label="Open your order"]')!;
  await act(async () => fireEvent.click(trigger));
  let dialog = document.querySelector('[role="dialog"]')!;
  const notes = dialog.querySelector<HTMLTextAreaElement>("textarea")!;
  const tip = dialog.querySelector<HTMLSelectElement>("select")!;
  assert.ok(notes, "notes must be editable in the panel");
  assert.ok(tip, "tip must be selectable in the panel");
  assert.equal(tip.options[0].text, "No tip");
  assert.equal(tip.options[4].text, "$5.00");
  await act(async () => fireEvent.change(notes, { target: { value: "Please pack securely." } }));
  await act(async () => fireEvent.change(tip, { target: { value: "5" } }));
  assert.equal(useDraftStore.getState().notes, "Please pack securely.");
  assert.equal(useDraftStore.getState().tip, 5);
  assert.match(dialog.textContent!, /\$112\.00/);
  await act(async () => fireEvent.click([...dialog.querySelectorAll("button")].find(button => button.textContent === "Close")!));
  await act(async () => fireEvent.click(trigger));
  dialog = document.querySelector('[role="dialog"]')!;
  assert.equal(dialog.querySelector("textarea")!.value, "Please pack securely.");
  assert.equal(dialog.querySelector("select")!.value, "5");
  await act(async () => useDraftStore.setState({ notes: "Edited on the main form.", tip: 10 }));
  assert.equal(dialog.querySelector("textarea")!.value, "Edited on the main form.");
  assert.equal(dialog.querySelector("select")!.value, "10");
  assert.match(dialog.textContent!, /\$117\.00/);
  await act(async () => fireEvent.change(dialog.querySelector("select")!, { target: { value: "0" } }));
  assert.equal(useDraftStore.getState().tip, 0);
  assert.match(dialog.textContent!, /\$107\.00/);
});

test("preview disables notes and tip editing", async () => {
  await mount({
    editingDisabled: true,
    extras: {
      notes: "Preview notes", onNotesChange: () => assert.fail("preview must not edit notes"),
      tip: 0, tipOptions: [0, 5], onTipChange: () => assert.fail("preview must not edit tip"),
    },
  });
  await act(async () => fireEvent.click(document.querySelector('button[aria-label="Open your order"]')!));
  const dialog = document.querySelector('[role="dialog"]')!;
  assert.ok(dialog.querySelector("textarea"), "notes must be present");
  assert.equal(dialog.querySelector("textarea")!.disabled, true);
  assert.equal(dialog.querySelector("select")!.disabled, true);
});
