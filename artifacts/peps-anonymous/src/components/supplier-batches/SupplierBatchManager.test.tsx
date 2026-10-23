import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error This workspace's jsdom test dependency does not include declarations.
import { JSDOM } from "jsdom";
import type { BatchProposal, SupplierBatch } from "../../lib/supplier-batches";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { createElement, act } = React;
Object.assign(globalThis, { React });
const { ProposalCard, BatchCard } = await import("./SupplierBatchManager");

const order = (id: string, kits: number) => ({
  id, code: id, username: `@member-${id}`, country: "GB", kits,
  paidAt: "2026-01-01T00:00:00Z", orderingAt: "2026-01-01T00:00:00Z",
  historicalReviewed: false, items: [{ productId: "hgh", productName: "HGH 36IU", quantity: kits, unitPrice: "150", lineTotal: "150" }],
});
const target: BatchProposal = {
  region: { id: "uk", name: "United Kingdom", countries: ["GB"], targetKits: 50 },
  token: "target-token", orders: [order("one", 20), order("two", 30)],
  kits: 50, queuedKits: 65, remainingKits: 15, ready: true, readyAt: null, products: [],
};
const proposal = { ...target, allQueued: {
  ...target, token: "all-token", kits: 65, remainingKits: 0,
  orders: [...target.orders, order("three", 15)],
} };
const existingBatch: SupplierBatch = {
  id: "prepared-uk", reference: "GB-TEST / 001", state: "prepared",
  createdAt: "2026-01-01T00:00:00Z", createdBy: "admin", orderedAt: null,
  releasedAt: null, releaseReason: null, snapshot: target, exceptions: [],
};

test("vendor submission requires confirmation and reuses the existing batch action", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const calls: unknown[] = [];
  const props = {
    b: existingBatch, busy: false, act: async (path: string, body: unknown) => { calls.push([path, body]); return true; },
    exportCsv: async () => {}, exportTxt: async () => {},
    context: { groupBuyId: "gb", scope: "admin" as const },
  };
  await act(async () => root.render(createElement(BatchCard, props)));
  const open = container.querySelector('[data-testid="button-ordered-prepared-uk"]') as HTMLButtonElement;
  assert.equal(open.textContent, "Mark submitted to vendor");
  await act(async () => open.click());
  assert.equal(calls.length, 0);
  assert.match(container.textContent!, /Submitted orders to Processing/);
  assert.match(container.textContent!, /orders outside this batch are unchanged/);
  await act(async () => (container.querySelector('[data-testid="button-confirm-ordered-prepared-uk"]') as HTMLButtonElement).click());
  assert.deepEqual(calls, [["/prepared-uk/ordered", { confirm: true }]]);
  await act(async () => root.render(createElement(BatchCard, {
    ...props, b: { ...existingBatch, state: "ordered", orderedAt: "2026-10-23T13:00:00Z" },
  })));
  assert.match(container.textContent!, /Submitted to vendor/);
  assert.equal(container.querySelector('[data-testid="button-ordered-prepared-uk"]'), null);
  await act(async () => root.unmount());
  container.remove();
});

test("a below-target preview can add to an eligible prepared batch and shows the combined total", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const confirmations: unknown[] = [];
  const small = { ...target, kits: 15, queuedKits: 15, remainingKits: 0, ready: false,
    orders: [order("extra", 15)], token: "small-token" };
  await act(async () => root.render(createElement(ProposalCard, {
    p: small, enabled: true, busy: false,
    batches: [existingBatch,
      { ...existingBatch, id: "ordered", state: "ordered" },
      { ...existingBatch, id: "released", state: "released" },
      { ...existingBatch, id: "other-region", snapshot: { ...target, region: { ...target.region, id: "eu", countries: ["IT"] } } }],
    onConfirm: async (p, all, destination) => {
      confirmations.push([p.token, all, destination?.id, destination?.snapshot.token]); return true;
    },
  })));
  await act(async () => (container.querySelector('[data-testid="button-preview-batch-uk"]') as HTMLButtonElement).click());
  const confirm = container.querySelector('[data-testid="button-confirm-batch-uk"]') as HTMLButtonElement;
  assert.equal(confirm.disabled, true);
  const select = container.querySelector('[data-testid="select-batch-destination-uk"]') as HTMLSelectElement;
  assert.deepEqual([...select.options].map(o => o.value), ["", "prepared-uk"]);
  await act(async () => { select.value = "prepared-uk"; select.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  assert.equal(confirm.disabled, false);
  assert.match(container.textContent!, /50 \+ 15 = 65 kits/);
  await act(async () => confirm.click());
  assert.deepEqual(confirmations, [["small-token", false, "prepared-uk", "target-token"]]);
  await act(async () => root.unmount());
  container.remove();
});

test("changing a selected prepared batch requires reviewing it again", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const props = { p: proposal, enabled: true, busy: false, onConfirm: async () => true };
  await act(async () => root.render(createElement(ProposalCard, { ...props, batches: [existingBatch] })));
  await act(async () => (container.querySelector('[data-testid="button-preview-batch-uk"]') as HTMLButtonElement).click());
  const select = container.querySelector('[data-testid="select-batch-destination-uk"]') as HTMLSelectElement;
  await act(async () => { select.value = existingBatch.id; select.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  await act(async () => root.render(createElement(ProposalCard, {
    ...props, batches: [{ ...existingBatch, snapshot: { ...target, token: "changed-target" } }],
  })));
  assert.equal((container.querySelector('[data-testid="button-confirm-batch-uk"]') as HTMLButtonElement).disabled, true);
  assert.match(container.textContent!, /existing batch changed/i);
  await act(async () => root.unmount());
  container.remove();
});

test("preview switches to all orders and confirms the displayed all-queue token", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const confirmations: unknown[] = [];
  await act(async () => root.render(createElement(ProposalCard, {
    p: proposal, enabled: true, busy: false,
    onConfirm: async (p, all) => { confirmations.push([p.token, p.kits, p.orders.length, all]); return true; },
  })));
  await act(async () => (container.querySelector('[data-testid="button-preview-batch-uk"]') as HTMLButtonElement).click());
  await act(async () => (container.querySelector('[data-testid="button-all-queued-uk"]') as HTMLButtonElement).click());
  const preview = container.querySelector('[data-testid="preview-batch-uk"]')!;
  assert.match(preview.textContent!, /Prepare 65 kits from 3 paid orders/);
  assert.match(preview.textContent!, /Left in queue: 0 kits/);
  await act(async () => (container.querySelector('[data-testid="button-confirm-batch-uk"]') as HTMLButtonElement).click());
  assert.deepEqual(confirmations, [["all-token", 65, 3, true]]);
  await act(async () => root.unmount());
  container.remove();
});

test("changed all-queue token disables stale confirmation and failure keeps the preview open", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const props = { enabled: true, busy: false, onConfirm: async () => false };
  await act(async () => root.render(createElement(ProposalCard, { ...props, p: proposal })));
  await act(async () => (container.querySelector('[data-testid="button-preview-batch-uk"]') as HTMLButtonElement).click());
  await act(async () => (container.querySelector('[data-testid="button-confirm-batch-uk"]') as HTMLButtonElement).click());
  assert.ok(container.querySelector('[data-testid="preview-batch-uk"]'));
  await act(async () => (container.querySelector('[data-testid="button-all-queued-uk"]') as HTMLButtonElement).click());
  await act(async () => root.render(createElement(ProposalCard, {
    ...props, p: { ...proposal, allQueued: { ...proposal.allQueued, token: "changed" } },
  })));
  assert.equal((container.querySelector('[data-testid="button-confirm-batch-uk"]') as HTMLButtonElement).disabled, true);
  await act(async () => root.unmount());
  container.remove();
});

test("TXT setup failures appear beside the batch download, and retry can succeed", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  let fail = true;
  const setupMessage = "Supplier TXT setup required:\n• Save supplier delivery details\n• Set HGH 36IU in Admin → FS3 costs";
  await act(async () => root.render(createElement(BatchCard, {
    b: { id: "batch1", reference: "GB-TEST / 001", state: "prepared",
      createdAt: "2026-01-01T00:00:00Z", createdBy: "admin", orderedAt: null,
      releasedAt: null, releaseReason: null, snapshot: target, exceptions: [] },
    busy: false, context: { groupBuyId: "TEST", scope: "admin" },
    act: async () => true, exportCsv: async () => {},
    exportTxt: async () => { if (fail) throw new Error(setupMessage); },
  })));
  const button = [...container.querySelectorAll("button")].find(b => b.textContent?.includes("Download supplier TXT"))!;
  await act(async () => button.click());
  const message = container.querySelector('[data-testid="text-supplier-txt-batch1"]')!;
  assert.equal(message.getAttribute("role"), "alert");
  assert.equal(message.textContent, setupMessage);
  assert.ok(message.classList.contains("whitespace-pre-wrap"));
  fail = false;
  await act(async () => button.click());
  assert.match(container.querySelector('[role="status"]')!.textContent!, /Supplier TXT downloaded/);
  assert.equal(container.querySelector('[role="alert"]'), null);
  await act(async () => root.unmount());
  container.remove();
});
