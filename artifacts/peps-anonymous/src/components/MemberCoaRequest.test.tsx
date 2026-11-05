import React, { act } from "react";
import assert from "node:assert/strict";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Shared workspace test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Shared workspace test dependency.
import { fireEvent } from "../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import type { CoaMemberView, CoaRequest } from "../lib/coa-api";

let createRoot: typeof import("react-dom/client").createRoot;
let MemberCoaRequest: typeof import("./MemberCoaRequest").MemberCoaRequest;
let dom: JSDOM;
let root: Root | undefined;
let container: HTMLDivElement;
const originalFetch = globalThis.fetch;
const config = { mode: "open" as const, fee: 25, currency: "USD" as const, cap: 5, rails: [], manualInstructions: "Synthetic bank instructions" };
const blank: CoaMemberView = { eligible: true, reason: null, available: 5, config, request: null };

test("COA starts collapsed and can be opened without losing entered details", async () => {
  globalThis.fetch = async () => json(blank);
  await render();
  const disclosure = container.querySelector<HTMLDetailsElement>("details#coa");
  assert.ok(disclosure);
  assert.equal(disclosure.open, false);
  assert.match(disclosure.querySelector("summary")!.textContent!, /Certificate of analysis/);
  disclosure.open = true;
  const input = container.querySelector<HTMLInputElement>("input")!;
  await act(async () => { fireEvent.change(input, { target: { value: "My client" } }); });
  disclosure.open = false;
  disclosure.open = true;
  assert.equal(input.value, "My client");
});
const request = (change: Partial<CoaRequest> = {}): CoaRequest => ({
  id: "r1", orderId: "o1", groupBuyId: "g1", orderCode: "test-1", member: "synthetic", groupName: "Synthetic group",
  source: "invited", status: "reserved", client: "Synthetic Client", sample: "Test sample", manufacturer: "Test supplier", batch: "Test batch",
  fee: 25, currency: "USD", expiresAt: null, payment: null, txHash: null, reference: null, verificationMessage: null,
  updatedAt: new Date().toISOString(), ...change,
});
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  const g = globalThis as any;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLFormElement", "Event", "Node"])
    Object.defineProperty(g, key, { configurable: true, writable: true, value: dom.window[key] });
  g.IS_REACT_ACT_ENVIRONMENT = true;
  g.React = React;
  ({ createRoot } = await import("react-dom/client"));
  ({ MemberCoaRequest } = await import("./MemberCoaRequest"));
});
async function render(orderId = "o1", account = "synthetic") {
  if (!root) { container = dom.window.document.createElement("div"); dom.window.document.body.append(container); root = createRoot(container); }
  await act(async () => { root!.render(<MemberCoaRequest key={`${account}:${orderId}`} orderId={orderId} />); });
}
afterEach(async () => {
  if (root) { await act(async () => root!.unmount()); root = undefined; container.remove(); }
  globalThis.fetch = originalFetch;
});
after(() => dom.window.close());

test("closed requests show an explanation and no reserve action", async () => {
  globalThis.fetch = async () => json({ ...blank, eligible: false, reason: "COA requests are closed." });
  await render();
  assert.match(container.textContent!, /COA requests are closed/);
  assert.equal(Array.from(container.querySelectorAll("button")).some(b => b.textContent?.includes("Reserve COA")), false);
});
test("all four details are required and failed submission preserves what the member typed", async () => {
  let payload: any;
  let reads = 0;
  let finishRefresh!: (response: Response) => void;
  const refresh = new Promise<Response>(resolve => { finishRefresh = resolve; });
  globalThis.fetch = async (_url, opts) => {
    if (opts?.method === "POST") { payload = JSON.parse(String(opts.body)); return json({ error: "Synthetic temporary failure" }, 503); }
    return ++reads === 1 ? json(blank) : refresh;
  };
  await render();
  const button = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Reserve COA"))!;
  assert.equal(button.disabled, true);
  const inputs = container.querySelectorAll("input");
  await act(async () => { ["My client", "My sample", "My manufacturer", "My batch"].forEach((v, i) => fireEvent.change(inputs[i], { target: { value: v } })); });
  assert.equal(button.disabled, false);
  await act(async () => { fireEvent.submit(container.querySelector("form")!); });
  assert.deepEqual(payload, { client: "My client", sample: "My sample", manufacturer: "My manufacturer", batch: "My batch" });
  assert.match(container.textContent!, /Synthetic temporary failure/);
  assert.equal(container.querySelector("input")!.value, "My client");
  assert.equal(button.disabled, false, "A pending status refresh must not prolong the failed-action spinner");
  await act(async () => { finishRefresh(json(blank)); });
});
test("a saved manual payment reference stays under review and never claims to be paid", async () => {
  const submitted = request({ status: "review", reference: "synthetic-bank-ref", verificationMessage: "Awaiting Admin receipt confirmation" });
  let paymentBody: any;
  globalThis.fetch = async (_url, opts) => {
    if (opts?.method === "POST") paymentBody = JSON.parse(String(opts.body));
    return json({ ...blank, request: opts?.method === "POST" ? submitted : request() });
  };
  await render();
  const modeSelect = Array.from(container.querySelectorAll("select")).find(s => Array.from(s.options).some(o => o.value === "ref"));
  if (modeSelect) await act(async () => { fireEvent.change(modeSelect, { target: { value: "ref" } }); });
  const proof = Array.from(container.querySelectorAll("input")).find(i => i.placeholder === "Payment reference you used");
  assert.ok(proof, "manual receipt reference input is available");
  await act(async () => { fireEvent.change(proof, { target: { value: "synthetic-bank-ref" } }); });
  const submit = Array.from(container.querySelectorAll("button")).find(b => b.textContent === "Submit");
  assert.ok(submit);
  await act(async () => { fireEvent.click(submit); });
  assert.deepEqual(paymentBody, { reference: "synthetic-bank-ref" });
  assert.match(container.textContent!, /Payment under review/);
  assert.match(container.textContent!, /synthetic-bank-ref/);
  assert.equal(Array.from(container.querySelectorAll("input")).every(i => i.disabled), true);
});
test("paid state hides charge actions and never renders Admin internal notes", async () => {
  globalThis.fetch = async () => json({ ...blank, request: request({ status: "paid", internalNotes: "NEVER_SHOW_THIS_PRIVATE_NOTE" }) });
  await render();
  assert.match(container.textContent!, /Paid/);
  assert.doesNotMatch(container.textContent!, /NEVER_SHOW_THIS|Submit payment|Withdraw request/);
});
test("a pending chain payment can retry its saved transaction and receive server confirmation", async () => {
  let body: any;
  globalThis.fetch = async (_url, opts) => {
    if (opts?.method === "POST") body = JSON.parse(String(opts.body));
    return json({ ...blank, request: request({ status: opts?.method === "POST" ? "paid" : "review", txHash: "synthetic-chain-hash" }) });
  };
  await render();
  const retry = Array.from(container.querySelectorAll("button")).find(b => b.textContent?.includes("Retry payment verification"));
  assert.ok(retry);
  await act(async () => { fireEvent.click(retry); });
  assert.deepEqual(body, { txHash: "synthetic-chain-hash" });
  assert.match(container.textContent!, /Paid/);
  assert.doesNotMatch(container.textContent!, /Retry payment verification/);
});
test("a late payment keeps its saved evidence and cannot be reserved again", async () => {
  globalThis.fetch = async () => json({ ...blank, request: request({ status: "expired", source: "public", txHash: "saved-late-transaction",
    verificationMessage: "Admin must review capacity." }) });
  await render();
  assert.match(container.textContent!, /saved-late-transaction/);
  assert.doesNotMatch(container.textContent!, /Reserve again/);
  assert.match(container.textContent!, /review by Admin/i);
});
test("late responses from a previous order cannot reveal that order's COA fields", async () => {
  let oldResponse!: (r: Response) => void;
  globalThis.fetch = async url => String(url).includes("/old/") ? new Promise(resolve => { oldResponse = resolve; })
    : json({ ...blank, request: request({ client: "New order client" }) });
  await render("old");
  await render("new");
  await act(async () => { oldResponse(json({ ...blank, request: request({ client: "Old account private client" }) })); });
  const text = Array.from(container.querySelectorAll("input")).map(i => i.value).join(" ");
  assert.match(text, /New order client/);
  assert.doesNotMatch(text, /Old account private/);
});
test("completed requests offer a private download only when a PDF is attached", async () => {
  globalThis.fetch = async () => json({ ...blank, request: request({ status: "completed" }) });
  await render();
  assert.match(container.textContent!, /not attached/);
  assert.equal(container.querySelector("a[download]"), null);
  globalThis.fetch = async () => json({ ...blank, request: request({ status: "completed",
    certificate: { size: 250, attachedAt: "2026-11-02T00:00:00Z" } }) });
  await render("other");
  assert.equal(container.querySelector("a[download]")?.getAttribute("href"), "/api/orders/other/coa/certificate");
});
test("switching requests removes the previous private download while the next request loads", async () => {
  globalThis.fetch = async () => json({ ...blank, request: request({ status: "completed",
    certificate: { size: 250, attachedAt: "2026-11-02T00:00:00Z" } }) });
  await render("old");
  assert.ok(container.querySelector("a[download]"));
  let resolve!: (r: Response) => void;
  globalThis.fetch = async () => new Promise(r => { resolve = r; });
  await render("new");
  assert.equal(container.querySelector("a[download]"), null);
  await act(async () => resolve(json({ ...blank, request: null })));
  assert.equal(container.querySelector("a[download]"), null);
});
test("switching accounts on the same order cannot restore the old owner's certificate", async () => {
  let oldResponse!: (r: Response) => void;
  globalThis.fetch = async () => new Promise(resolve => { oldResponse = resolve; });
  await render("o1", "old-owner");
  globalThis.fetch = async () => json({ error: "Order not found." }, 404);
  await render("o1", "new-owner");
  await act(async () => oldResponse(json({ ...blank, request: request({ status: "completed",
    certificate: { size: 250, attachedAt: "2026-11-02T00:00:00Z" } }) })));
  assert.equal(container.querySelector("a[download]"), null);
  assert.match(container.textContent!, /Order not found/);
});
