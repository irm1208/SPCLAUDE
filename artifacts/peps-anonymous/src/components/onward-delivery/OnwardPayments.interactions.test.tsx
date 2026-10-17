import assert from "node:assert/strict";
import React, { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace browser-test dependency.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";
import type { Charge, Envelope } from "../../lib/onward-payments";
Object.assign(globalThis, { React });
let dom: JSDOM, root: Root | undefined;
let createRoot: typeof import("react-dom/client").createRoot;
let Components: typeof import("./OnwardPayments");
const originalFetch = globalThis.fetch;
const settings = { enabled: true, confirmationMode: "manual", currency: "USDT", network: "Ethereum", walletAddress: `0x${"a".repeat(40)}` };
const makeCharge = (patch: Partial<Charge> = {}): Charge => ({
  id: "R", orderId: "O", status: "unpaid", amount: 17.3, currency: "USD", method: "pickup", note: "",
  reshipperUsername: "resh", wallet: settings, cryptoAmount: 17.3, confirmationMode: "manual", txHash: null,
  verificationNote: null, createdAt: new Date().toISOString(), submittedAt: null, confirmedAt: null, ...patch,
});
const env = (request: Charge | null, patch: Partial<Envelope> = {}): Envelope => ({
  request, history: [], canManage: true, canSubmit: true, ...patch,
});
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
const byId = (id: string) => document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
async function render(node: React.ReactNode) {
  const mount = document.createElement("div"); document.body.append(mount); root = createRoot(mount);
  await act(async () => { root!.render(node); });
}
async function click(id: string) { await act(async () => { fireEvent.click(byId(id)); }); }
async function type(id: string, value: string) { await act(async () => { fireEvent.change(byId(id), { target: { value } }); }); }
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test", pretendToBeVisual: true });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Event", "Node", "MutationObserver", "CustomEvent", "MouseEvent"]) globals[key] = dom.window[key];
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.confirm = () => true;
  globals.confirm = dom.window.confirm;
  createRoot = (await import("react-dom/client")).createRoot;
  Components = await import("./OnwardPayments");
});
afterEach(async () => {
  await act(async () => { root?.unmount(); }); root = undefined; document.body.innerHTML = ""; globalThis.fetch = originalFetch;
});
after(() => dom.window.close());

test("member component stays hidden without a payment request", async () => {
  globalThis.fetch = async () => json(env(null));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.equal(byId("card-onward-payment"), null);
});
test("member submits the exact TX and sees pending without claiming an unpaid request was verified", async () => {
  const charge = makeCharge(); let submitted: unknown;
  globalThis.fetch = async (_url, init) => {
    assert.equal(init?.credentials, "include"); assert.equal(init?.cache, "no-store");
    if (init?.method === "POST") {
      submitted = JSON.parse(String(init.body));
      return json(env({ ...charge, status: "pending_confirmation", txHash: `0x${"b".repeat(64)}` }));
    }
    return json(env(charge));
  };
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.match(document.body.textContent ?? "", /17.3 USDT/);
  assert.doesNotMatch(document.body.textContent ?? "", /auto-verified on chain/);
  await type("input-onward-txhash", `0x${"b".repeat(64)}`);
  await click("button-onward-submit-tx");
  assert.deepEqual(submitted, { txHash: `0x${"b".repeat(64)}` });
  assert.ok(byId("status-onward-payment-pending_confirmation"));
  assert.equal(byId("button-onward-verify"), null);
  assert.match(document.body.textContent ?? "", /Waiting for your reshipper/);
});
test("stale assignment does not display an address or allow another payment", async () => {
  globalThis.fetch = async () => json(env(makeCharge(), { canSubmit: false }));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.equal(byId("text-onward-address-R"), null);
  assert.equal(byId("input-onward-txhash"), null);
  assert.match(document.body.textContent ?? "", /Do not send another payment/);
});
test("automatic-mode Check now updates the member view to paid", async () => {
  const request = makeCharge({ status: "pending_confirmation", confirmationMode: "automatic" });
  globalThis.fetch = async (_url, init) => json(env(init?.method === "POST" ? { ...request, status: "paid" } : request));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  await click("button-onward-verify");
  assert.ok(byId("status-onward-payment-paid"));
  assert.match(document.body.textContent ?? "", /Onward delivery paid/);
});
const overview = (request: Charge | null = null) => ({
  settings, rails: [{ currency: "USDT", network: "Ethereum" }],
  orders: [{ id: "O", code: "123", username: "member", country: "AT", kits: 5, orderStatus: "Submitted",
    canRequest: !request || request.status === "cancelled", request,
    estimate: { status: "available", currency: "USD", selectedMethod: "pickup", options: [{ method: "pickup", amount: 17.3 }] } }],
});
test("reshipper retains wallet edits when saving fails", async () => {
  const fetcher = async (_url: string, init?: RequestInit) => init?.method === "PUT" ? json({ error: "Save refused" }, 503) : json(overview());
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  await type("input-onward-wallet-address", `0x${"d".repeat(40)}`);
  await click("button-onward-wallet-save");
  assert.match(document.body.textContent ?? "", /Save refused/);
  assert.equal((byId("input-onward-wallet-address") as HTMLInputElement).value, `0x${"d".repeat(40)}`);
  assert.ok(byId("button-onward-wallet-save"));
});
test("reshipper can create, cancel and reissue without losing the order's eligibility", async () => {
  let request: Charge | null = null, created: Record<string, unknown> | undefined;
  const fetcher = async (url: string, init?: RequestInit) => {
    if (init?.method === "POST" && url.endsWith("/cancel")) { request = { ...request!, status: "cancelled" }; return json(env(request)); }
    if (init?.method === "POST") { created = JSON.parse(String(init.body)); request = makeCharge(); return json(env(request)); }
    return json(overview(request));
  };
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  await click("button-expand-onward-payment-O");
  await click("button-onward-charge-create-O");
  assert.equal(created?.amount, 17.3); assert.equal(created?.currency, "USD"); assert.equal(created?.method, "pickup");
  assert.ok(String(created?.idempotencyKey).length >= 16);
  assert.ok(byId("button-onward-cancel-O"));
  await click("button-onward-cancel-O");
  assert.ok(byId("button-onward-charge-create-O"));
});
test("reshipper manual receipt confirmation calls the scoped endpoint and displays paid", async () => {
  let request = makeCharge({ status: "pending_confirmation", txHash: `0x${"b".repeat(64)}` });
  let called = "";
  const fetcher = async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") { called = url; request = { ...request, status: "paid" }; return json(env(request)); }
    return json(overview(request));
  };
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  await click("button-expand-onward-payment-O");
  await click("button-onward-confirm-O");
  assert.equal(called, "/api/reshipper/gb/G/orders/O/onward-payments/R/confirm");
  assert.ok(byId("status-onward-payment-paid"));
});
test("Admin read-only status uses the Admin fetcher and does not render financial actions", async () => {
  let called = "";
  const fetcher = async (url: string, init?: RequestInit) => {
    called = url; assert.equal((init?.headers as Record<string, string>)["x-admin-secret"], "test-only");
    return json(env(makeCharge({ status: "paid" })));
  };
  await render(<Components.OnwardPaymentReadonly source={{ kind: "admin", gbId: "G", orderId: "O", fetcher, headers: { "x-admin-secret": "test-only" } }} />);
  assert.equal(called, "/api/admin/group-buys/G/orders/O/onward-payments");
  assert.ok(byId("status-onward-payment-paid"));
  assert.equal(byId("button-onward-confirm-O"), null);
});
