import assert from "node:assert/strict";
import { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace browser-test dependency.
import { fireEvent } from "../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";

let createRoot: typeof import("react-dom/client").createRoot;
let Browse: typeof import("./GbProductBrowse").GbProductBrowse;
let root: Root | undefined;
let dom: JSDOM;
const products = [
  { id: "a", name: "Alpha", category: "Peptides", price: 12 },
  { id: "b", name: "Beta", category: "Oils", price: 20 },
  { id: "c", name: "Gamma", category: "Peptides", price: 30, maxPerCustomer: 0 },
  { id: "d", name: "Delta", price: 15 },
];
const quantities = new Map([["b", 2]]);
let adjustments: unknown[] = [];

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node", "MutationObserver"]) {
    globals[key] = dom.window[key];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  Browse = (await import("./GbProductBrowse")).GbProductBrowse;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = "";
});
after(() => dom.window.close());

async function mount() {
  adjustments = [];
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root!.render(<Browse
    products={products}
    categoryOrder={["Oils", "Peptides"]}
    capacity={[{ productName: "Beta", status: "full" }, { productName: "Alpha", status: "low" }]}
    quantities={quantities}
    onAdjust={(id, direction) => adjustments.push([id, direction])}
    canIncrease={() => true}
    formatPrice={price => `$${price}`}
    hidePrices={false}
    loading={false}
  />));
}

function categorySelector() {
  const node = document.querySelector<HTMLSelectElement>('select[aria-label="Filter by category"]');
  assert.ok(node, "Category selector should exist");
  return node;
}
function hideCheckbox() {
  const node = document.querySelector<HTMLInputElement>('input[type="checkbox"]');
  assert.ok(node, "Hide out-of-stock checkbox should exist");
  return node;
}

test("category selector includes all categories in configured order and filters the list", async () => {
  await mount();
  const select = categorySelector();
  assert.deepEqual([...select.options].map(option => option.text), ["All categories", "Oils", "Peptides", "Uncategorised"]);
  await act(async () => fireEvent.change(select, { target: { value: "Peptides" } }));
  assert.match(document.body.textContent!, /Alpha/);
  assert.match(document.body.textContent!, /Gamma/);
  assert.doesNotMatch(document.body.textContent!, /Beta|Delta/);
});

test("hide OOS removes full capacity and zero-allowance products, keeping low and unknown stock", async () => {
  await mount();
  const checkbox = hideCheckbox();
  assert.equal(checkbox.checked, false);
  await act(async () => fireEvent.click(checkbox));
  assert.match(document.body.textContent!, /Alpha|Delta/);
  assert.doesNotMatch(document.body.textContent!, /Beta|Gamma/);
  assert.equal(quantities.get("b"), 2);
  assert.deepEqual(adjustments, []);
  await act(async () => fireEvent.click(checkbox));
  assert.match(document.body.textContent!, /Beta/);
  const decrease = document.querySelector('[aria-label="Decrease Beta quantity"]');
  assert.ok(decrease);
  await act(async () => fireEvent.click(decrease));
  assert.deepEqual(adjustments, [["b", -1]]);
});

test("search combines with category and stock filters without removing category choices", async () => {
  await mount();
  await act(async () => fireEvent.change(categorySelector(), { target: { value: "Peptides" } }));
  await act(async () => fireEvent.click(hideCheckbox()));
  const search = document.querySelector('[aria-label="Search group-buy products"]');
  assert.ok(search);
  await act(async () => fireEvent.change(search, { target: { value: "Gamma" } }));
  assert.match(document.body.textContent!, /No products match your filters/);
  assert.equal(categorySelector().options.length, 4);
  await act(async () => fireEvent.change(search, { target: { value: "Alpha" } }));
  assert.ok(document.querySelector('[aria-label="Add Alpha to order"]'));
});

test("search and all filters share a sticky toolbar and selected quantity controls stay usable", async () => {
  await mount();
  const toolbar = document.querySelector('[aria-label="Product filters"]');
  assert.ok(toolbar);
  assert.ok(toolbar.classList.contains("sticky"));
  assert.ok(toolbar.contains(categorySelector()));
  assert.ok(toolbar.contains(hideCheckbox()));
  assert.ok(toolbar.querySelector('[aria-label="Search group-buy products"]'));
  assert.match(document.body.textContent!, /Quantities are in kits/);
  await act(async () => fireEvent.click(document.querySelector('[aria-label="Decrease Beta quantity"]')!));
  assert.deepEqual(adjustments, [["b", -1]]);
});
