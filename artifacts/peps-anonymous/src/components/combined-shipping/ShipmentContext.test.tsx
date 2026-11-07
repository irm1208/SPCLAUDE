import React, { act } from "react";
import assert from "node:assert/strict";
import { afterEach, beforeAll, test } from "vitest";
// @ts-expect-error jsdom is available for tests; this workspace has no declaration package.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";

let createRoot: typeof import("react-dom/client").createRoot;
let mod: typeof import("./ShipmentContext");
let container: HTMLDivElement;
let root: Root | undefined;

beforeAll(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import("react-dom/client"));
  mod = await import("./ShipmentContext");
});

afterEach(() => { act(() => root?.unmount()); root = undefined; container?.remove(); });

const batch = (id: string, ref: string, qty: number) => ({ id, reference: ref, state: "received", kits: qty, items: [{ productId: "p1", productName: "BPC", quantity: qty }] });
const payload = {
  orders: [
    { id: "o1", code: "PEP-1", additionOfOrderId: null, status: "Processing", paymentStatus: "confirmed", amountDue: 0, shippingTotal: 8.5, currency: "GBP",
      lineItems: [{ productName: "BPC", quantity: 2 }], batches: [batch("b1", "B-101", 2)], allocationComplete: true, readiness: null,
      relatedOrderIds: ["o2"], shipmentOrderIds: ["o1"], separateOrderIds: ["o2"], reviewReason: null },
    { id: "o2", code: "PEP-2", additionOfOrderId: "o1", status: "Processing", paymentStatus: "unpaid", amountDue: 12, shippingTotal: 0, currency: "GBP",
      lineItems: [{ productName: "TB", quantity: 1 }], batches: [batch("b2", "B-202", 1)], allocationComplete: true, readiness: "Payment outstanding",
      relatedOrderIds: ["o1"], shipmentOrderIds: ["o2"], separateOrderIds: ["o1"], reviewReason: null },
    { id: "o3", code: "PEP-3", additionOfOrderId: null, status: "Processing", paymentStatus: "confirmed", amountDue: 0, shippingTotal: 5, currency: "GBP",
      lineItems: [], batches: [], allocationComplete: false, readiness: null, relatedOrderIds: [], shipmentOrderIds: ["o3"], separateOrderIds: [], reviewReason: "Not allocated to a batch" },
  ],
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
const flush = async () => { for (let i = 0; i < 5; i++) await act(async () => { await Promise.resolve(); }); };

async function mount(fetcher: (p: string, o?: RequestInit) => Promise<Response>, onJump = (_: string) => {}) {
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => { root!.render(<mod.ShipmentContextPanel path="/x/shipment-context" fetcher={fetcher} onJump={onJump} />); });
  await flush();
}

test("shows original/addition, batches, separate shipment and zero postage", async () => {
  await mount(async () => json(payload));
  const t = container.textContent ?? "";
  assert.match(t, /Original/); assert.match(t, /Addition to PEP-1/);
  assert.match(t, /B-101/); assert.match(t, /B-202/);
  assert.match(t, /Separate shipment/);
  assert.match(t, /No extra postage charged/);
  assert.match(t, /Not allocated to a batch/);
  assert.match(t, /Payment outstanding/);
});

test("batch filter narrows orders including unallocated", async () => {
  await mount(async () => json(payload));
  const sel = container.querySelector("[data-testid=select-shipment-batch]") as HTMLSelectElement;
  await act(async () => { sel.value = "unallocated"; sel.dispatchEvent(new window.Event("change", { bubbles: true })); });
  assert.ok(container.querySelector("[data-testid=shipment-order-o3]"));
  assert.equal(container.querySelector("[data-testid=shipment-order-o1]"), null);
});

test("related jump fires for filtered-out order", async () => {
  const jumps: string[] = [];
  await mount(async () => json(payload), id => jumps.push(id));
  const sel = container.querySelector("[data-testid=select-shipment-batch]") as HTMLSelectElement;
  await act(async () => { sel.value = "b1"; sel.dispatchEvent(new window.Event("change", { bubbles: true })); });
  const btn = container.querySelector("[data-testid=button-jump-order-o2]") as HTMLButtonElement;
  await act(async () => { btn.click(); });
  assert.deepEqual(jumps, ["o2"]);
});

test("error is visible with retry", async () => {
  let n = 0;
  await mount(async () => (++n === 1 ? json({ error: "Denied" }, 403) : json(payload)));
  assert.match(container.textContent ?? "", /Denied/);
  const retry = container.querySelector("[data-testid=button-retry-shipment-context]") as HTMLButtonElement;
  await act(async () => { retry.click(); }); await flush();
  assert.match(container.textContent ?? "", /PEP-1/);
});

test("slip notes say not in this parcel without listing as items", () => {
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<mod.SlipShipmentNotes notes={["PEP-2 ships separately (batch B-202)"]} />));
  assert.match(container.textContent ?? "", /Not in this parcel/);
  assert.equal(container.querySelector(".item-row"), null);
});

test("filterByShipmentBatch filters host lists, unknown orders only in all", () => {
  const byId = new Map(payload.orders.map(o => [o.id, o as any]));
  const list = [{ id: "o1" }, { id: "o2" }, { id: "o3" }, { id: "x" }];
  assert.deepEqual(mod.filterByShipmentBatch(list, byId, "b1").map(o => o.id), ["o1"]);
  assert.deepEqual(mod.filterByShipmentBatch(list, byId, "unallocated").map(o => o.id), ["o3"]);
  assert.equal(mod.filterByShipmentBatch(list, byId, "all").length, 4);
});

test("row badges show batch ref with kits, addition and linked count", () => {
  const byId = new Map(payload.orders.map(o => [o.id, o as any]));
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<div><mod.ShipmentOrderBadges orderId="o1" byId={byId} /><mod.ShipmentOrderBadges orderId="o2" byId={byId} /></div>));
  const t = container.textContent ?? "";
  assert.match(t, /B-101 · 2 kits/); assert.match(t, /1 linked/); assert.match(t, /Addition to PEP-1/);
});

test("slip enrichment adds batch refs with quantities and blocks linked on error", () => {
  const byId = new Map(payload.orders.map(o => [o.id, o as any]));
  const out = mod.enrichForSlip({ id: "o1", lineItems: [] } as any, byId);
  assert.deepEqual(out.supplierBatchReferences, ["B-101 (2 × BPC)"]);
  assert.match(out.shipmentNotes!.join(" "), /PEP-2/);
  assert.equal(mod.linkedBlockReason("o3", byId, null), null);
  assert.match(mod.linkedBlockReason("o1", byId, "boom") ?? "", /could not be refreshed/);
  assert.match(mod.linkedBlockReason("zz", new Map(), "boom") ?? "", /could not be refreshed/);
});

test("single-order printing cannot silently split a same-batch shipment or print an unpaid linked order", () => {
  const byId = new Map(payload.orders.map(o => [o.id, { ...o }]));
  byId.get("o1")!.shipmentOrderIds = ["o1", "o2"];
  assert.match(mod.linkedBlockReason("o1", byId, null) ?? "", /Linked orders/);
  assert.match(mod.linkedBlockReason("o2", byId, null) ?? "", /Payment/);
});

test("already-shipped original in same batch is shown as separate", () => {
  const shippedOrig = { ...payload.orders[0], status: "Shipped", separateOrderIds: [] };
  const add = { ...payload.orders[1], batches: payload.orders[0].batches, separateOrderIds: [] };
  const byId = new Map([[shippedOrig.id, shippedOrig as any], [add.id, add as any]]);
  assert.match(mod.shipmentNotesFor(add as any, byId).join(" "), /PEP-1 already shipped/);
});
