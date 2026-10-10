import { act } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Available in the existing workspace test harness.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Available in the existing workspace test harness.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import type { BulkStockResult } from "./BulkProductStockDialog";

let createRoot: typeof import("react-dom/client").createRoot;
let BulkProductStockDialog: typeof import("./BulkProductStockDialog").BulkProductStockDialog;
let dom: JSDOM;
let root: Root | undefined;
let originalFetch: typeof fetch;
let requests: { url: string; body: unknown; method: string }[] = [];
let saved: BulkStockResult[] = [];
let closed = 0;

const products = [
  { id: "a", name: "Product A", vendor: "Vendor A", stock: 12 },
  { id: "b", name: "Product B", vendor: "Vendor B", stock: 3 },
  { id: "untracked", name: "Product C", vendor: "Vendor C", stock: null },
];
function element(id: string) {
  const result = document.querySelector(`[data-testid="${id}"]`);
  assert.ok(result, `Missing ${id}`);
  return result!;
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement",
    "HTMLButtonElement", "HTMLFormElement", "Event", "Node", "MutationObserver", "CustomEvent", "NodeFilter", "SVGElement"]) {
    globals[name] = dom.window[name];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  globals.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globals.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globals.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  originalFetch = globalThis.fetch;
  createRoot = (await import("react-dom/client")).createRoot;
  ({ BulkProductStockDialog } = await import("./BulkProductStockDialog"));
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  document.body.innerHTML = "";
  globalThis.fetch = originalFetch;
});
after(() => dom.window.close());

async function mount(response: unknown = { ok: true, products: [{ id: "a", stock: 17 }, { id: "b", stock: 8 }], skippedIds: ["untracked"] }, status = 200) {
  requests = [];
  saved = [];
  closed = 0;
  globalThis.fetch = (async (url: string, options: RequestInit) => {
    requests.push({ url, body: JSON.parse(String(options.body)), method: String(options.method) });
    return new Response(JSON.stringify(response), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(<BulkProductStockDialog products={products} secret="test-admin"
    onClose={() => { closed++; }} onSaved={result => { saved.push(result); }} />));
}

async function review(operation: string, quantity: string) {
  await act(async () => fireEvent.change(element("select-bulk-stock-action"), { target: { value: operation } }));
  await act(async () => fireEvent.change(element("input-bulk-stock-quantity"), { target: { value: quantity } }));
  await act(async () => fireEvent.submit(element("form-bulk-product-stock")));
}

test("offers all three operations and discloses untracked stock", async () => {
  await mount();
  const select = element("select-bulk-stock-action") as HTMLSelectElement;
  assert.deepEqual([...select.options].map(option => option.value), ["increase", "decrease", "set"]);
  assert.match(element("text-bulk-stock-selection").textContent!, /3 selected products/);
  assert.match(element("text-bulk-stock-skipped").textContent!, /will be skipped/);
  assert.equal(requests.length, 0);
});

test("reviews the exact per-product increase and only writes on confirmation", async () => {
  await mount();
  await review("increase", "5");
  assert.match(element("row-stock-preview-a").textContent!, /12 → 17/);
  assert.match(element("row-stock-preview-untracked").textContent!, /Not tracked → Skipped/);
  assert.equal(requests.length, 0);
  await act(async () => fireEvent.click(element("button-confirm-bulk-stock")));
  assert.deepEqual(requests, [{ url: "/api/admin/products/stock", method: "PATCH",
    body: { ids: ["a", "b", "untracked"], operation: "increase", quantity: 5 } }]);
  assert.equal(saved.length, 1);
});

test("decrease preview clamps stock at zero", async () => {
  await mount();
  await review("decrease", "5");
  assert.match(element("row-stock-preview-b").textContent!, /3 → 0/);
  assert.match(element("text-bulk-stock-summary").textContent!, /will not go below zero/);
});

test("setting stock to zero includes untracked products", async () => {
  await mount({ ok: true, products: products.map(product => ({ id: product.id, stock: 0 })), skippedIds: [] });
  await review("set", "0");
  assert.match(element("row-stock-preview-untracked").textContent!, /Not tracked → 0/);
  assert.equal(document.querySelector('[data-testid="text-bulk-stock-skipped"]'), null);
  await act(async () => fireEvent.click(element("button-confirm-bulk-stock")));
  assert.equal(saved[0].products.length, 3);
});

test("invalid whole-number input does not reach confirmation or the server", async () => {
  await mount();
  await review("set", "1.5");
  assert.equal(document.querySelector('[data-testid="button-confirm-bulk-stock"]'), null);
  assert.match(document.body.textContent!, /whole-number/);
  assert.equal(requests.length, 0);
});

test("server failure stays in the dialog and retains the selection", async () => {
  await mount({ error: "Selection is stale. Refresh the list." }, 409);
  await review("increase", "5");
  await act(async () => fireEvent.click(element("button-confirm-bulk-stock")));
  assert.match(element("error-bulk-stock").textContent!, /Selection is stale/);
  assert.equal(saved.length, 0);
  assert.equal(closed, 0);
  assert.ok(element("row-stock-preview-a"));
});

test("rejects an incomplete success response instead of updating some selected rows", async () => {
  await mount({ ok: true, products: [{ id: "a", stock: 17 }], skippedIds: [] });
  await review("increase", "5");
  await act(async () => fireEvent.click(element("button-confirm-bulk-stock")));
  assert.match(element("error-bulk-stock").textContent!, /incomplete stock update/);
  assert.equal(saved.length, 0);
});

test("cancel does not make a stock request", async () => {
  await mount();
  await act(async () => fireEvent.click(element("button-cancel-bulk-stock")));
  assert.equal(closed, 1);
  assert.equal(requests.length, 0);
});

test("confirmation ignores duplicate clicks while saving", async () => {
  await mount();
  await review("increase", "5");
  let resolveRequest!: (response: Response) => void;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return new Promise<Response>(resolve => { resolveRequest = resolve; });
  }) as typeof fetch;
  await act(async () => {
    fireEvent.click(element("button-confirm-bulk-stock"));
    fireEvent.click(element("button-confirm-bulk-stock"));
  });
  assert.equal(calls, 1);
  assert.equal((element("button-confirm-bulk-stock") as HTMLButtonElement).disabled, true);
  await act(async () => resolveRequest(new Response(JSON.stringify({
    ok: true, products: [{ id: "a", stock: 17 }, { id: "b", stock: 8 }], skippedIds: ["untracked"],
  }))));
  assert.equal(saved.length, 1);
});
