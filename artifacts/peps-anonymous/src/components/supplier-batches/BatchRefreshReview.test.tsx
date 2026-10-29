import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error This workspace's jsdom test dependency does not include declarations.
import { JSDOM } from "jsdom";
import type { BatchProposal, SupplierBatch, BatchRefreshPreview, BatchOrder } from "../../lib/supplier-batches";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
});
const { createRoot } = await import("react-dom/client");
const React = await import("react");
const { createElement, act } = React;
Object.assign(globalThis, { React });
const { BatchRefreshReview } = await import("./BatchRefreshReview");
const { BatchCard } = await import("./SupplierBatchManager");

const order = (id: string, qty: number, money?: string[]): BatchOrder => ({
  id, code: id.toUpperCase(), username: `@m-${id}`, country: "GB", kits: qty,
  paidAt: "2026-01-01T00:00:00Z", orderingAt: "2026-01-01T00:00:00Z", historicalReviewed: false,
  items: [{ productId: "hgh", productName: "HGH 36IU", quantity: qty, unitPrice: "150.00", lineTotal: (qty * 150).toFixed(2) }],
  ...(money ? { money } : {}),
});
const snap: BatchProposal = {
  region: { id: "uk", name: "United Kingdom", countries: ["GB"], targetKits: 10 },
  token: "batch-token-1", orders: [order("a", 3), order("b", 4)], kits: 7, queuedKits: 7, remainingKits: 0,
  ready: true, readyAt: null, products: [{ productId: "hgh", productName: "HGH 36IU", quantity: 7 }],
};
const batch: SupplierBatch = {
  id: "b1", reference: "GB-TEST / 001", state: "prepared", createdAt: "2026-01-01T00:00:00Z", createdBy: "admin",
  orderedAt: null, releasedAt: null, releaseReason: null, snapshot: snap,
  exceptions: [{ orderId: "a", code: "A", reason: "Order changed after batching" }],
};
const preview = (over: Partial<BatchRefreshPreview> = {}): BatchRefreshPreview => ({
  batchId: "b1", reference: "GB-TEST / 001", expectedBatchToken: "batch-token-1", token: "preview-1",
  canConfirm: true, currency: "EUR", blockers: [],
  changes: [{ orderId: "a", code: "A", before: order("a", 3, ["450.00", "0.00", "450.00", "450.00", "0.00", "EUR", "gb"]),
    after: order("a", 5, ["750.00", "0.00", "750.00", "750.00", "0.00", "EUR", "gb"]) }],
  before: { kits: 7, orderCount: 2, products: [{ productId: "hgh", productName: "HGH 36IU", quantity: 7 }] },
  after: { kits: 9, orderCount: 2, products: [{ productId: "hgh", productName: "HGH 36IU", quantity: 9 }] },
  ...over,
});

test("review includes changed duplicate product lines at a different unit price", async () => {
  const before = order("a", 3.5), after = order("a", 4.5);
  before.items = [order("a", 3).items[0], { ...order("a", 0.5).items[0], unitPrice: "80", lineTotal: "40" }];
  after.items = [order("a", 3).items[0], { ...order("a", 1.5).items[0], unitPrice: "80", lineTotal: "120" }];
  const m = await mount(createElement(BatchRefreshReview, {
    batch, scope: "admin", groupBuyId: "gb", busy: false,
    requestPreview: async () => preview({ changes: [{ orderId: "a", code: "A", before, after }] }),
    onConfirm: async () => true,
  }));
  await act(async () => (m.container.querySelector('[data-testid="button-refresh-review-b1"]') as HTMLButtonElement).click());
  const changed = m.container.querySelector('[data-testid="row-refresh-change-a"]')!.textContent!;
  assert.match(changed, /€80\.00/);
  assert.match(changed, /0\.5.*1\.5/);
  assert.match(changed, /€40\.00.*€120\.00/);
  await m.done();
});

async function mount(el: unknown) {
  const container = document.createElement("div"); document.body.append(container);
  const root = createRoot(container);
  await act(async () => root.render(el as never));
  return { container, root, done: async () => { await act(async () => root.unmount()); container.remove(); } };
}
const q = (c: Element, id: string) => c.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
const check = async (c: Element) => {
  const box = q(c, "checkbox-refresh-approve-b1") as unknown as HTMLInputElement;
  await act(async () => box.click());
};

for (const scope of ["admin", "organiser"] as const) {
  test(`${scope}: preview shows 3->5 and only explicit confirmation posts the update`, async () => {
    const previews: unknown[] = []; const confirms: unknown[] = [];
    const m = await mount(createElement(BatchRefreshReview, {
      batch, scope, groupBuyId: "gb", busy: false,
      requestPreview: async (path: string, body: unknown) => { previews.push([path, body]); return preview(); },
      onConfirm: async (path: string, body: unknown) => { confirms.push([path, body]); return true; },
    }));
    await act(async () => q(m.container, "button-refresh-review-b1")!.click());
    assert.deepEqual(previews, [["/b1/refresh-preview", { expectedBatchToken: "batch-token-1" }]]);
    const text = m.container.textContent!;
    assert.match(text, /GB-TEST \/ 001/);
    assert.match(text, /3\s*→\s*5/);
    assert.match(text, /7\s*→\s*9 kits/);
    assert.match(text, /€450\.00\s*→\s*€750\.00/);
    assert.equal(confirms.length, 0);
    const confirm = q(m.container, "button-refresh-confirm-b1")!;
    assert.equal(confirm.disabled, true);
    await check(m.container);
    assert.equal(confirm.disabled, false);
    await act(async () => confirm.click());
    assert.deepEqual(confirms, [["/b1/refresh", { confirm: true, expectedBatchToken: "batch-token-1", token: "preview-1" }]]);
    assert.equal(q(m.container, "panel-refresh-b1"), null);
    await m.done();
  });
}

test("blockers disable confirmation and show reasons", async () => {
  const m = await mount(createElement(BatchRefreshReview, {
    batch, scope: "admin", groupBuyId: "gb", busy: false,
    requestPreview: async () => preview({ canConfirm: false, after: null,
      blockers: [{ orderId: "a", code: "A", reason: "Order was refunded" }],
      changes: [{ orderId: "a", code: "A", before: order("a", 3), after: null }] }),
    onConfirm: async () => true,
  }));
  await act(async () => q(m.container, "button-refresh-review-b1")!.click());
  assert.match(m.container.textContent!, /Order was refunded/);
  assert.match(m.container.textContent!, /no longer eligible|missing/i);
  assert.equal(q(m.container, "button-refresh-confirm-b1")!.disabled, true);
  await m.done();
});

test("preview errors offer retry; failed confirmation stays open with fresh preview", async () => {
  let fail = true; let n = 0;
  const m = await mount(createElement(BatchRefreshReview, {
    batch, scope: "organiser", groupBuyId: "gb", busy: false,
    requestPreview: async () => { n++; if (fail) throw new Error("Preview unavailable"); return preview({ token: `preview-${n}` }); },
    onConfirm: async () => { throw new Error("Batch changed; load a fresh preview"); },
  }));
  await act(async () => q(m.container, "button-refresh-review-b1")!.click());
  assert.match(m.container.textContent!, /Preview unavailable/);
  fail = false;
  await act(async () => q(m.container, "button-refresh-reload-b1")!.click());
  await check(m.container);
  await act(async () => q(m.container, "button-refresh-confirm-b1")!.click());
  assert.ok(q(m.container, "panel-refresh-b1"));
  assert.match(m.container.textContent!, /fresh preview/);
  await act(async () => q(m.container, "button-refresh-reload-b1")!.click());
  assert.equal(n, 3);
  await m.done();
});

test("polled batch token or state change disables confirmation", async () => {
  const props = { scope: "admin" as const, groupBuyId: "gb", busy: false,
    requestPreview: async () => preview(), onConfirm: async () => true };
  const m = await mount(createElement(BatchRefreshReview, { ...props, batch }));
  await act(async () => q(m.container, "button-refresh-review-b1")!.click());
  await check(m.container);
  await act(async () => m.root.render(createElement(BatchRefreshReview, { ...props, batch: { ...batch, snapshot: { ...snap, token: "batch-token-2" } } })));
  assert.equal(q(m.container, "button-refresh-confirm-b1")!.disabled, true);
  assert.match(m.container.textContent!, /changed since this preview/i);
  await act(async () => m.root.render(createElement(BatchRefreshReview, { ...props, batch: { ...batch, state: "ordered" } })));
  assert.equal(q(m.container, "button-refresh-confirm-b1")!.disabled, true);
  await m.done();
});

test("BatchCard shows the review action for prepared batches with exceptions, disabled only when busy", async () => {
  const base = { b: batch, act: async () => true, exportCsv: async () => {}, exportTxt: async () => {},
    context: { groupBuyId: "gb", scope: "organiser" as const } };
  const m = await mount(createElement(BatchCard, { ...base, busy: false }));
  const b = q(m.container, "button-refresh-review-b1")!;
  assert.match(b.textContent!, /Review changes and update batch/);
  assert.equal(b.disabled, false);
  await act(async () => m.root.render(createElement(BatchCard, { ...base, busy: true })));
  assert.equal(q(m.container, "button-refresh-review-b1")!.disabled, true);
  await act(async () => m.root.render(createElement(BatchCard, { ...base, busy: false, b: { ...batch, exceptions: [] } })));
  assert.equal(q(m.container, "button-refresh-review-b1"), null);
  await m.done();
});
