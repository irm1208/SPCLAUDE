import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";

test("manual payment requires a private note, preserves it on failure, and refreshes only after server confirmation", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    React, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Element: dom.window.Element, HTMLInputElement: dom.window.HTMLInputElement,
    HTMLTextAreaElement: dom.window.HTMLTextAreaElement, DocumentFragment: dom.window.DocumentFragment,
    Node: dom.window.Node, NodeFilter: dom.window.NodeFilter, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
    CustomEvent: dom.window.CustomEvent, MutationObserver: dom.window.MutationObserver,
    getComputedStyle: dom.window.getComputedStyle, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const originalFetch = globalThis.fetch;
  const { createRoot } = await import("react-dom/client");
  const { MarkOrdersPaid } = await import("./MarkOrdersPaid");
  const root = createRoot(dom.window.document.getElementById("root")!);
  const { act } = React;
  let refreshed = 0, attempts = 0;
  const requests: any[] = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url: String(url), body: JSON.parse(String(init?.body)), credentials: init?.credentials });
    attempts++;
    return new Response(JSON.stringify(attempts === 1 ? { error: "An order changed. Refresh and try again." } : { updated: 2, skipped: 0 }), { status: attempts === 1 ? 409 : 200 });
  };
  const button = (label: string) => [...dom.window.document.querySelectorAll<HTMLButtonElement>("button")].find(b => b.textContent === label)!;
  async function input(text: string) {
    const textarea = dom.window.document.querySelector("textarea")!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, text);
      textarea.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
  }
  try {
    await act(async () => root.render(React.createElement(MarkOrdersPaid, { groupBuyId: "G", orderIds: ["O", "O2"], onSaved: async () => { refreshed++; } })));
    await act(async () => button("Mark as paid").click());
    assert.equal(button("Confirm paid").disabled, true);
    assert.match(dom.window.document.body.textContent!, /staff only/);
    await input("   "); assert.equal(button("Confirm paid").disabled, true);
    await input("  Bank statement checked  "); assert.equal(button("Confirm paid").disabled, false);
    await act(async () => button("Confirm paid").click());
    assert.equal(refreshed, 0);
    assert.match(dom.window.document.body.textContent!, /An order changed/);
    assert.equal(dom.window.document.querySelector("textarea")!.value, "  Bank statement checked  ");
    await act(async () => button("Confirm paid").click());
    assert.equal(refreshed, 1);
    assert.equal(dom.window.document.querySelector("textarea"), null);
    assert.match(dom.window.document.body.textContent!, /2 orders marked paid/);
    assert.deepEqual(requests[1], { url: "/api/organiser/group-buys/G/orders/mark-paid", body: { orderIds: ["O", "O2"], note: "Bank statement checked" }, credentials: "include" });
    await act(async () => root.render(React.createElement(MarkOrdersPaid, { groupBuyId: "G", orderIds: ["O"], allowed: false, onSaved: () => {} })));
    assert.equal(button("Mark as paid").disabled, true);
    assert.match(dom.window.document.body.textContent!, /Admin must enable/);
    const changes: string[] = [];
    await act(async () => root.render(React.createElement(MarkOrdersPaid, {
      groupBuyId: "G", orderIds: ["O"], onSaved: async () => { refreshed++; },
      paymentStatusField: { value: "failed", onChange: (value: string) => changes.push(value) },
    })));
    const select = dom.window.document.querySelector("select")!;
    assert.ok(select, "Payment status field must offer Paid in the edit form");
    assert.equal([...select.options].find(option => option.value === "confirmed")?.text, "Paid");
    await act(async () => {
      select.value = "confirmed";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.equal(button("Confirm paid").disabled, true, "Paid must still require a payment note");
    assert.deepEqual(changes, [], "Do not bypass the manual payment endpoint through an ordinary edit");
    assert.equal(select.value, "failed", "Status stays unchanged until confirmation succeeds");
    await act(async () => button("Cancel").click());
    assert.equal(select.value, "failed");
    await act(async () => {
      select.value = "unpaid";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    assert.deepEqual(changes, ["unpaid"]);
    await act(async () => {
      select.value = "confirmed";
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await input("Cash received");
    await act(async () => button("Confirm paid").click());
    assert.equal(refreshed, 2);
    assert.deepEqual(requests[2].body, { orderIds: ["O"], note: "Cash received" });
    assert.deepEqual(changes, ["unpaid"], "Paid is never sent through the normal status setter");
    await act(async () => root.render(React.createElement(MarkOrdersPaid, {
      groupBuyId: "G", orderIds: ["O"], allowed: false, onSaved: () => {},
      paymentStatusField: { value: "failed", onChange: () => {} },
    })));
    assert.equal(dom.window.document.querySelector("select")!.disabled, true);
  } finally {
    await act(async () => root.unmount()); globalThis.fetch = originalFetch; dom.window.close();
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
