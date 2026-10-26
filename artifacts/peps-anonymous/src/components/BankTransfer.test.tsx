import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import type { BankTransfer } from "@workspace/api-zod/bank-transfer";

const bank: BankTransfer = {
  uk: { enabled: true, accountHolder: "Example Ltd", sortCode: "12-34-56", accountNumber: "00123456", bankName: "Example Bank" },
  international: { enabled: true, accountHolder: "Example Ltd", accountNumber: "DE89 3704 0044 0532 0130 00", swiftBic: "COBADEFFXXX", bankName: "Example Bank", bankAddress: "1 Bank Street, Berlin", clearingCode: "123456789" },
};

test("bank settings, copy details and payment claim work without ever confirming payment", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    React, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    Node: dom.window.Node, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
    MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const originalFetch = globalThis.fetch;
  let copied = "";
  Object.defineProperty(dom.window.navigator, "clipboard", { value: { writeText: async (text: string) => { copied = text; } }, configurable: true });
  const { createRoot } = await import("react-dom/client");
  const { BankTransferSettings } = await import("./BankTransferSettings");
  const { default: PaymentPanel } = await import("./PaymentPanel");
  const { act } = React;
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const posts: { url: string; body: Record<string, unknown> }[] = [];
  const statuses: string[] = [];
  let settings = bank;
  function Form() {
    const [value, setValue] = React.useState(bank);
    return React.createElement(BankTransferSettings, { value, onChange: (v: BankTransfer) => { settings = v; setValue(v); } });
  }
  try {
    await act(async () => root.render(React.createElement(Form)));
    assert.match(container.textContent!, /UK → UK bank transfer/);
    assert.match(container.textContent!, /International bank transfer/);
    assert.equal(container.querySelectorAll("input[type=text]").length, 10);
    const toggle = container.querySelectorAll<HTMLInputElement>("input[type=checkbox]")[1];
    await act(async () => toggle.click());
    assert.equal(settings.international?.enabled, false);
    assert.equal(settings.uk?.accountNumber, "00123456");
    assert.equal(container.querySelectorAll("input[type=text]").length, 4);

    globalThis.fetch = async (url, init) => {
      if (init?.method === "POST") {
        posts.push({ url: String(url), body: JSON.parse(String(init.body)) });
        return new Response(JSON.stringify({ ok: true, paymentStatus: "pending_confirmation" }));
      }
      return new Response(JSON.stringify({ bankTransfer: bank, paymentsEnabled: true, isGroupBuyOrder: true, orderCode: "12345", collectedBy: { type: "organiser" } }));
    };
    const props = {
      orderId: "order-one", grandTotal: 125.5, currency: "GBP", paymentStatus: "unpaid",
      paymentTxHash: null, paymentTestAmount: null, testPaymentTxHash: null,
      onStatusChange: (value: string) => statuses.push(value),
    };
    await act(async () => root.render(React.createElement(PaymentPanel, props)));
    assert.match(container.textContent!, /Amount to pay: GBP 125\.50/);
    assert.match(container.textContent!, /00123456/);
    assert.match(container.textContent!, /COBADEFFXXX/);
    assert.match(container.textContent!, /123456789/);
    assert.match(container.textContent!, /12345/);
    const copy = container.querySelector<HTMLButtonElement>('[aria-label="Copy Account number"]')!;
    await act(async () => copy.click());
    assert.equal(copied, "00123456");
    const submit = [...container.querySelectorAll("button")].find(b => b.textContent?.includes("I've sent"))!;
    await act(async () => submit.click());
    assert.deepEqual(posts.filter(p => p.url.endsWith("/confirm-fiat")), [{ url: "/api/orders/order-one/confirm-fiat", body: { method: "bank_transfer" } }]);
    assert.deepEqual(statuses, ["pending_confirmation"]);
    assert.match(container.textContent!, /Awaiting Organiser Confirmation/i);
    assert.doesNotMatch(container.textContent!, /Payment Confirmed/);
    await act(async () => root.render(React.createElement(PaymentPanel, { ...props, key: "euro-order", currency: "EUR" })));
    assert.match(container.textContent!, /Amount to pay: EUR 125\.50/);
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, value] of previous) {
      if (value) Object.defineProperty(globalThis, key, value);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  }
});
