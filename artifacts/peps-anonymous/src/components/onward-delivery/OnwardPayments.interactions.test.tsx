import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import React, { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
  await act(async () => { root!.render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>); });
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
test("immediate EU checkout requires five contact fields and creates a server-priced delivery payment", async () => {
  let submitted: any;
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/start")) { submitted = JSON.parse(String(init?.body)); return json(env(makeCharge())); }
    return json(env(null, { awaitingRequest: true, immediate: {
      options: [{ method: "pickup", amount: 17.3 }], currency: "USD", selectedMethod: "pickup",
      contact: { shippingName: "Jane Smith", shippingAddress: "1 Example Road", shippingCountry: "AT", shippingPhone: "+43 123456789", shippingEmail: "jane@example.test" },
    } }));
  };
  await render(<Components.OnwardPaymentCard orderId="O" />);
  for (const field of ["shippingName", "shippingAddress", "shippingCountry", "shippingPhone", "shippingEmail"])
    assert.equal((byId(`input-eu-${field}`) as HTMLInputElement).required, true);
  await click("button-eu-delivery-start");
  assert.equal(submitted.method, "pickup");
  assert.equal(submitted.shippingEmail, "jane@example.test");
  assert.equal(submitted.amount, undefined);
  assert.ok(byId("state-onward-unpaid"));
});
test("a matching-wallet combined checkout displays and submits the full amount, not delivery alone", async () => {
  let submitted: any;
  const quote = { id: "Q", productCryptoAmount: 100, deliveryCryptoAmount: 17.3, totalCryptoAmount: 117.3, wallet: settings };
  globalThis.fetch = async (url, init) => {
    if (String(url).endsWith("/combined-quote")) return json({ quote });
    if (String(url).endsWith("/combined-pay")) { submitted = JSON.parse(String(init?.body)); return json(env(makeCharge({ status: "paid" }))); }
    return json(env(makeCharge(), { canCombine: true }));
  };
  await render(<Components.OnwardPaymentCard orderId="O" />);
  await click("button-onward-combine");
  assert.match(byId("combined-payment-details").textContent ?? "", /117.3/);
  assert.match(byId("list-onward-pay-steps").textContent ?? "", /117.3/);
  await type("input-onward-txhash", "0x" + "a".repeat(64));
  await click("button-onward-submit-tx");
  assert.equal(submitted.quoteId, "Q");
  assert.equal(submitted.txHash, "0x" + "a".repeat(64));
});
after(() => dom.window.close());

test("member component stays hidden for an unrelated order without a payment request", async () => {
  globalThis.fetch = async () => json(env(null));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.equal(byId("card-onward-payment"), null);
});
function capturePreview(name: string) {
  if (!process.env.ONWARD_REQUEST_PREVIEW) return;
  writeFileSync(`/tmp/onward-${name}-preview.html`, `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;padding:16px;background:#F8FAFC;color:#162231;--t-surface:#fff;--t-surface2:#f1f5f9;--t-bg:#F8FAFC;--t-text:#162231;--t-muted:#546579;--t-subtle:#68798b;--t-border:#D0DAE4"><main style="max-width:900px;margin:auto">${document.body.innerHTML}</main></body></html>`);
}
test("eligible member sees why payment is not available before the reshipper sends a request", async () => {
  globalThis.fetch = async () => json(env(null, { awaitingRequest: true }));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.ok(byId("state-onward-not-requested"));
  assert.match(document.body.textContent ?? "", /has not requested|hasn.t requested/i);
  assert.match(document.body.textContent ?? "", /separately|separate/i);
  assert.equal(byId("input-onward-txhash"), null);
  capturePreview("member-waiting");
});
test("cancelled request displays nothing due, history and no receiving address", async () => {
  globalThis.fetch = async () => json(env(makeCharge({ status: "cancelled" })));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.ok(byId("state-onward-not-requested"));
  assert.match(document.body.textContent ?? "", /nothing is due/i);
  assert.equal(byId("text-onward-address-R"), null);
  assert.equal(byId("input-onward-txhash"), null);
  await click("button-toggle-onward-history");
  assert.ok(byId("row-onward-history-R"));
});
test("member picks up a newly issued request on visibility refresh and keeps typed TXID on focus", async () => {
  let issued = false;
  globalThis.fetch = async () => json(issued ? env(makeCharge()) : env(null, { awaitingRequest: true }));
  await render(<Components.OnwardPaymentCard orderId="O" />);
  assert.ok(byId("state-onward-not-requested"));
  issued = true;
  await act(async () => { document.dispatchEvent(new Event("visibilitychange")); });
  assert.ok(byId("state-onward-unpaid"));
  assert.ok(byId("text-onward-address-R"));
  assert.match(byId("list-onward-pay-steps").textContent ?? "", /Send exactly.*Submit TXID/);
  await type("input-onward-txhash", "unfinished-txid");
  await act(async () => { window.dispatchEvent(new Event("focus")); });
  assert.equal((byId("input-onward-txhash") as HTMLInputElement).value, "unfinished-txid");
  capturePreview("member-pay");
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
  assert.match(document.body.textContent ?? "", /reshipper.*confirm|confirm.*reshipper/i);
  assert.match(document.body.textContent ?? "", /do not send again/i);
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
test("eligible orders expose Request payment before expansion without issuing a charge", async () => {
  const mutations: string[] = [];
  const fetcher = async (_url: string, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") mutations.push(init.method);
    return json(overview(null));
  };
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  const action = byId("button-onward-open-request-O") as HTMLButtonElement;
  assert.ok(action);
  assert.equal(action.textContent?.trim(), "Review request");
  assert.equal(byId("input-onward-charge-amount-O"), null);
  assert.ok(byId("guide-onward-steps"));
  assert.match(byId("text-onward-row-estimate-O").textContent ?? "", /pickup.*17.30/i);
  assert.match(document.body.textContent ?? "", /closed group buys/);
  if (process.env.ONWARD_REQUEST_PREVIEW) {
    writeFileSync("/tmp/onward-request-preview.html", `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;padding:16px;background:#F8FAFC;color:#162231;--t-surface:#fff;--t-bg:#F8FAFC;--t-text:#162231;--t-muted:#546579;--t-subtle:#68798b;--t-border:#D0DAE4"><main style="max-width:900px;margin:auto">${document.body.innerHTML}</main></body></html>`);
  }
  await click("button-onward-open-request-O");
  assert.ok(byId("input-onward-charge-amount-O"));
  capturePreview("manager-review");
  assert.ok(byId("button-onward-charge-create-O"));
  assert.equal(byId("button-expand-onward-payment-O").getAttribute("aria-expanded"), "true");
  assert.deepEqual(mutations, []);
});

test("saving an enabled wallet never issues payment requests automatically", async () => {
  let saved = { ...settings, enabled: false };
  const writes: string[] = [];
  const fetcher = async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") {
      writes.push(init.method);
      saved = JSON.parse(String(init.body));
      return json({ settings: saved });
    }
    if (init?.method && init.method !== "GET") writes.push(init.method);
    return json({ ...overview(null), settings: saved });
  };
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  await click("toggle-onward-wallet-enabled");
  assert.equal((byId("button-onward-open-request-O") as HTMLButtonElement).disabled, true);
  await click("button-onward-wallet-save");
  assert.equal((byId("button-onward-open-request-O") as HTMLButtonElement).disabled, false);
  assert.match(byId("status-onward-wallet-save").textContent ?? "", /Members can now pay the EU matrix rate/);
  assert.deepEqual(writes, ["PUT"]);
  assert.equal(byId("card-onward-payment"), null);
});

test("the collapsed request shortcut stays disabled until the wallet is saved and enabled", async () => {
  const mutations: string[] = [];
  const fetcher = async (_url: string, init?: RequestInit) => {
    if (init?.method && init.method !== "GET") mutations.push(init.method);
    return json({ ...overview(null), settings: { ...settings, enabled: false } });
  };
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  assert.equal((byId("button-onward-open-request-O") as HTMLButtonElement).disabled, true);
  assert.match(document.body.textContent ?? "", /Tick Accept payments, then choose Save wallet/);
  assert.deepEqual(mutations, []);
});

test("existing charges and ineligible orders do not offer a new-request shortcut", async () => {
  const snapshot = overview(makeCharge());
  snapshot.orders.push({ ...snapshot.orders[0], id: "blocked", request: null, canRequest: false });
  const fetcher = async () => json(snapshot);
  await render(<Components.OnwardPaymentManager gbId="G" fetcher={fetcher} />);
  assert.equal(byId("button-onward-open-request-O"), null);
  assert.equal(byId("button-onward-open-request-blocked"), null);
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
test("organiser selects a reshipper and manages payments without editing their wallet", async () => {
  const { OrganiserOnwardDelivery } = await import("./OrganiserOnwardDelivery");
  let request = makeCharge({ status: "pending_confirmation", txHash: `0x${"b".repeat(64)}` });
  const urls: string[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    urls.push(url);
    if (url.endsWith("/onward-delivery")) return json({
      reshippers: [{ username: "resh", enabled: true }, { username: "other", enabled: true }], countries: [], template: {},
    });
    if (init?.method === "POST") { request = { ...request, status: "paid" }; return json(env(request)); }
    return json(overview(request));
  };
  await render(<OrganiserOnwardDelivery gbId="G" fetcher={fetcher} />);
  await click("toggle-organiser-onward-payments");
  assert.ok(urls.includes("/api/organiser/group-buys/G/reshippers/resh/onward-payments"));
  assert.ok(byId("organiser-onward-wallet"));
  assert.equal(byId("input-onward-wallet-address"), null);
  await click("button-expand-onward-payment-O");
  await click("button-onward-confirm-O");
  assert.ok(urls.includes("/api/organiser/group-buys/G/reshippers/resh/orders/O/onward-payments/R/confirm"));
  assert.ok(byId("status-onward-payment-paid"));
  await type("select-organiser-onward-reshipper", "other");
  assert.ok(urls.includes("/api/organiser/group-buys/G/reshippers/other/onward-payments"));
});
test("reshipper matrix requests and saves use the reshipper-owned API", async () => {
  const { onwardApi } = await import("../../lib/onward-delivery");
  const calls: { url: string; init?: RequestInit }[] = [];
  const fetcher = async (url: string, init?: RequestInit) => {
    calls.push({ url, init }); return json(init?.method === "PUT" ? { matrix: { enabled: true } } : { reshippers: [] });
  };
  await onwardApi.getConfig(fetcher, "reshipper", "G");
  await onwardApi.saveMatrix(fetcher, "reshipper", "G", "resh", { enabled: true, currency: "USD", rates: [] });
  assert.equal(calls[0].url, "/api/reshipper/gb/G/onward-delivery");
  assert.equal(calls[1].url, "/api/reshipper/gb/G/onward-delivery/resh");
  assert.equal(calls[1].init?.method, "PUT");
  assert.equal(JSON.parse(String(calls[1].init?.body)).currency, "USD");
});
