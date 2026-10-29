import assert from "node:assert/strict";
import React, { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace browser-test dependency.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";

Object.assign(globalThis, { React });
let dom: JSDOM;
let root: Root | undefined;
let client: import("@tanstack/react-query").QueryClient;
let Manager: typeof import("./SupplierBatchManager").SupplierBatchManager;
let query: typeof import("@tanstack/react-query");
let createRoot: typeof import("react-dom/client").createRoot;
const nativeFetch = globalThis.fetch;
const requests: Array<{ url: string; method: string; body: unknown }> = [];

const region = { id: "eu", name: "EU", countries: ["DE", "FR"], targetKits: 2 };
const order = { id: "o1", code: "PA-1", username: "kit_fox", country: "DE", kits: 1.5, paidAt: "2026-10-01T10:00:00Z",
  orderingAt: "2026-10-01T10:00:00Z", historicalReviewed: false, items: [{ productId: "p", productName: "Reta 10mg", quantity: 1, unitPrice: "40", lineTotal: "40" }] };
const proposal = (token: string) => ({ region, token, orders: [order], kits: 1.5, queuedKits: 2.5, remainingKits: 1, ready: true,
  readyAt: "2026-10-02T10:00:00Z", products: [{ productId: "p", productName: "Reta 10mg", quantity: 1 }] });
let state: Record<string, unknown>;
const fresh = () => ({
  groupBuy: { id: "G", name: "Test" }, config: { enabled: true, telegramAlerts: false, regions: [region] }, version: 1,
  checkedAt: "2026-10-02T10:00:00Z", proposals: [proposal("tok-A")], batches: [] as unknown[], review: [],
  events: [{ id: "e1", kind: "ready", createdAt: "2026-10-02T10:00:00Z", telegram: "failed", lastError: "chat not found",
    detail: { region: "EU", kits: 2.5, target: 2, text: "EU queue is ready" } }],
});
const batch = (exceptions: unknown[]) => ({ id: "B1", reference: "SB-001", state: "prepared", createdAt: "2026-10-02T10:00:00Z",
  createdBy: "staff", orderedAt: null, releasedAt: null, releaseReason: null, snapshot: proposal("tok-A"), exceptions });

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/" });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement", "Event", "Node", "MutationObserver", "MouseEvent"]) {
    globals[key] = dom.window[key];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  query = await import("@tanstack/react-query");
  Manager = (await import("./SupplierBatchManager")).SupplierBatchManager;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined; client?.clear(); document.body.innerHTML = "";
  globalThis.fetch = nativeFetch; requests.length = 0;
});
after(() => dom.window.close());

async function mount(scope: "admin" | "organiser", handle?: (url: string, body: unknown) => Response | undefined) {
  globalThis.fetch = async (input, init) => {
    const url = String(input); const method = init?.method ?? "GET";
    // Fulfilment now has a separate endpoint and response shape, not SupplierData.
    if (!url.includes("/supplier-batches")) return Response.json({ groupBuy: { id: "G", name: "Test" }, canManage: true, batches: [], nextCursor: null });
    if (method !== "GET") requests.push({ url, method, body: JSON.parse(String(init!.body)) });
    const custom = handle?.(url, init?.body ? JSON.parse(String(init.body)) : undefined);
    if (custom) return custom;
    return Response.json(state);
  };
  client = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => {
    root!.render(React.createElement(query.QueryClientProvider, { client }, React.createElement(Manager, { scope, groupBuyId: "G" })));
    await new Promise(r => setTimeout(r, 30));
  });
  await act(async () => { await tick(); });
}
const el = <T extends HTMLElement = HTMLElement>(id: string): T => {
  const f = document.querySelector(`[data-testid="${id}"]`); assert.ok(f, `Missing ${id}`); return f as T;
};
const has = (id: string) => !!document.querySelector(`[data-testid="${id}"]`);
const tick = () => new Promise(r => setTimeout(r, 10));
async function click(id: string) { await act(async () => { fireEvent.click(el(id)); await tick(); }); }

for (const scope of ["admin", "organiser"] as const) test(`${scope}: member visibility defaults off and saves the explicit choice`, async () => {
  state = fresh(); await mount(scope);
  assert.ok(document.body.textContent?.includes("Telegram alerts to Admin and organiser when a batch reaches its target"));
  const toggle = el("checkbox-supplier-members") as HTMLInputElement;
  assert.equal(toggle.checked, false);
  await click("checkbox-supplier-members");
  await click("button-save-supplier-config");
  assert.equal((requests[0].body as { config: { showToMembers: boolean } }).config.showToMembers, true);
});
async function change(id: string, value: string) { await act(async () => { fireEvent.change(el(id), { target: { value } }); }); }
async function poll() { await act(async () => { await client.refetchQueries(); await tick(); }); }

for (const scope of ["organiser", "admin"] as const) {
  test(`${scope}: dirty settings survive polled data`, async () => {
    state = fresh(); await mount(scope);
    await change("input-region-name-0", "Europe draft");
    state = { ...fresh(), version: 2, config: { enabled: true, telegramAlerts: true, regions: [{ ...region, name: "EU (server)" }] } };
    await poll();
    assert.equal(el<HTMLInputElement>("input-region-name-0").value, "Europe draft");
    await click("button-save-supplier-config");
    assert.equal(requests[0].method, "PUT");
    assert.ok(requests[0].url.endsWith(`/api/${scope}/group-buys/G/supplier-batches/config`));
    assert.equal((requests[0].body as { expectedVersion: number }).expectedVersion, 1);
  });

  test(`${scope}: stale preview is blocked and re-preview sends the latest token`, async () => {
    state = fresh(); await mount(scope);
    await click("button-preview-batch-eu");
    assert.ok(el("preview-batch-eu").textContent!.includes("No supplier order is placed"));
    state = { ...fresh(), proposals: [proposal("tok-B")] };
    await poll();
    assert.ok(has("preview-batch-eu"));
    assert.equal(el<HTMLButtonElement>("button-confirm-batch-eu").disabled, true);
    await click("button-confirm-batch-eu");
    assert.equal(requests.length, 0);
    await act(async () => { fireEvent.click([...el("preview-batch-eu").querySelectorAll("button")].find(b => b.textContent === "Close")!); });
    await click("button-preview-batch-eu");
    await click("button-confirm-batch-eu");
    assert.deepEqual(requests[0].body, { regionId: "eu", token: "tok-B", includeAll: false });
    assert.ok(requests[0].url.endsWith("/supplier-batches/confirm"));
  });

  test(`${scope}: disabled feature keeps history but blocks preview`, async () => {
    state = { ...fresh(), config: { ...fresh().config, enabled: false }, batches: [batch([])] };
    await mount(scope);
    assert.equal(el<HTMLButtonElement>("button-preview-batch-eu").disabled, true);
    assert.ok(has("card-batch-B1"));
  });

  test(`${scope}: exceptions disable ordered and export`, async () => {
    state = { ...fresh(), batches: [batch([{ orderId: "o1", code: "PA-1", reason: "Order cancelled" }])] };
    await mount(scope);
    assert.equal(el<HTMLButtonElement>("button-ordered-B1").disabled, true);
    assert.equal(el<HTMLButtonElement>("button-export-B1").disabled, true);
    assert.equal(el<HTMLButtonElement>("button-release-B1").disabled, false);
  });

  test(`${scope}: ordered requires explicit confirmation`, async () => {
    state = { ...fresh(), batches: [batch([])] }; await mount(scope);
    await click("button-ordered-B1");
    assert.equal(requests.length, 0);
    assert.ok(document.body.textContent!.includes("Payments and orders outside this batch are unchanged"));
    await click("button-confirm-ordered-B1");
    assert.ok(requests[0].url.endsWith("/supplier-batches/B1/ordered"));
    assert.deepEqual(requests[0].body, { confirm: true });
  });

  test(`${scope}: release requires reason and confirmation`, async () => {
    state = { ...fresh(), batches: [batch([])] }; await mount(scope);
    await click("button-release-B1");
    assert.equal(el<HTMLButtonElement>("button-confirm-release-B1").disabled, true);
    await change("input-release-reason-B1", "Supplier out of stock");
    await click("button-confirm-release-B1");
    assert.deepEqual(requests[0].body, { confirm: true, reason: "Supplier out of stock" });
    assert.ok(requests[0].url.endsWith("/supplier-batches/B1/release"));
  });

  test(`${scope}: readiness event detail and delivery error are visible`, async () => {
    state = fresh(); await mount(scope);
    const t = el("text-event-detail-e1").textContent!;
    assert.ok(t.includes("EU") && t.includes("2.5 / 2 kits") && t.includes("EU queue is ready"));
    assert.ok(document.body.textContent!.includes("chat not found"));
  });
  test(`${scope}: batch review stays out of the cache and explicit confirmation updates the existing card`, async () => {
    const oldOrder = { ...order, kits: 3, money: ["453", "0", "0", "450", "0"],
      items: [{ ...order.items[0], quantity: 3, unitPrice: "150", lineTotal: "450" }] };
    const newOrder = { ...oldOrder, kits: 5, money: ["753", "0", "0", "750", "0"],
      items: [{ ...oldOrder.items[0], quantity: 5, lineTotal: "750" }] };
    const saved = { ...batch([{ orderId: "o1", code: "PA-1", reason: "Products changed since preparation" }]),
      snapshot: { ...proposal("tok-A"), orders: [oldOrder], kits: 3 } };
    const summary = (kits: number) => ({ kits, orderCount: 1, products: [{ productId: "p", productName: "Reta 10mg", quantity: kits }] });
    state = { ...fresh(), batches: [saved] };
    await mount(scope, url => {
      if (url.endsWith("/refresh-preview")) return Response.json({
        batchId: "B1", reference: "SB-001", expectedBatchToken: "tok-A", token: "reviewed",
        currency: "USD", canConfirm: true, blockers: [], before: summary(3), after: summary(5),
        changes: [{ orderId: "o1", code: "PA-1", before: oldOrder, after: newOrder }],
      });
      if (url.endsWith("/refresh")) {
        state = { ...fresh(), batches: [{ ...saved, exceptions: [], snapshot: { ...saved.snapshot, token: "fresh", kits: 5, orders: [newOrder] } }] };
        return Response.json(state);
      }
      return undefined;
    });
    await click("button-refresh-review-B1");
    assert.equal(requests.length, 1);
    assert.ok(requests[0].url.endsWith(`/api/${scope}/group-buys/G/supplier-batches/B1/refresh-preview`));
    assert.deepEqual(requests[0].body, { expectedBatchToken: "tok-A" });
    assert.equal((client.getQueryData(["supplier-batches", scope, "G"]) as any).batches[0].snapshot.kits, 3);
    assert.equal(el<HTMLButtonElement>("button-refresh-confirm-B1").disabled, true);
    await click("checkbox-refresh-approve-B1");
    await click("button-refresh-confirm-B1");
    assert.deepEqual(requests[1].body, { confirm: true, expectedBatchToken: "tok-A", token: "reviewed" });
    assert.ok(requests[1].url.endsWith("/B1/refresh"));
    const data = client.getQueryData(["supplier-batches", scope, "G"]) as any;
    assert.equal(data.batches.length, 1);
    assert.equal(data.batches[0].reference, "SB-001");
    assert.equal(data.batches[0].snapshot.kits, 5);
    assert.equal(el<HTMLButtonElement>("button-export-B1").disabled, false);
    assert.equal(has("button-refresh-review-B1"), false);
  });
}
