import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import type { GbUpdatesResponse } from "../../lib/group-buy-updates";

test("staff can enable MOQ, keep a draft across refreshes, save visibility and disable it again", async () => {
  // Radix/React DOM must first load after the browser globals exist.
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  const globals: Record<string, unknown> = {
    React, window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement,
    Node: dom.window.Node, Event: dom.window.Event, MouseEvent: dom.window.MouseEvent,
    MutationObserver: dom.window.MutationObserver, getComputedStyle: dom.window.getComputedStyle,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [name, value] of Object.entries(globals)) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  const originalFetch = globalThis.fetch;
  const { createRoot } = await import("react-dom/client");
  const { GroupBuyMoqSettings } = await import("./GroupBuyMoqSettings");
  const { act } = React;
  const root = createRoot(dom.window.document.getElementById("root")!);
  const container = dom.window.document.getElementById("root")!;
  const initial: GbUpdatesResponse = {
    groupBuy: { id: "GB1", name: "Group" }, stage: "open", stageUpdatedAt: null, updates: [],
    moq: { enabled: false, targetKits: null, showToMembers: false, orderedKits: 0, remainingKits: null, met: false, updatedAt: null,
      products: [{ productId: "hgh36", name: "HGH 36IU", targetKits: null, orderedKits: 0, paidKits: 0 }] },
  };
  const payloads: Record<string, unknown>[] = [];
  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(String(init?.body));
    payloads.push(payload);
    return new Response(JSON.stringify({
      ...initial,
      moq: {
        ...payload, orderedKits: payload.enabled ? 12.5 : 0, remainingKits: payload.enabled ? 87.5 : 100,
        met: false, updatedAt: `2026-10-20T09:00:0${payloads.length}.000Z`,
        paidKits: payload.enabled ? 10 : 0,
        products: initial.moq!.products!.map(product => ({
          ...product, targetKits: payload.productTargets?.find((p: { productId: string }) => p.productId === product.productId)?.targetKits ?? null,
          orderedKits: 12.5, paidKits: 10,
        })),
      },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  let refresh!: () => void;
  function Harness() {
    const [data, setData] = React.useState(initial);
    refresh = () => setData({ ...initial, moq: { ...initial.moq! } });
    return React.createElement(GroupBuyMoqSettings, {
      moq: data.moq, scope: "organiser", gbId: "GB1", blocked: false,
      run: async (fn, apply) => {
        const result = await fn();
        setData(old => apply(old, result));
        return result;
      },
      reload: async () => data.moq ?? null,
    });
  }
  const click = async (element: Element) => act(async () => {
    element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
  });
  try {
    await act(async () => root.render(React.createElement(Harness)));
    assert.equal(container.querySelector("input[type=number]"), null);
    await click(container.querySelector('[role="switch"]')!);
    const input = container.querySelector("input[type=number]") as HTMLInputElement;
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "100");
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await click(container.querySelectorAll('[role="switch"]')[1]);
    await act(async () => refresh());
    assert.equal((container.querySelector("input[type=number]") as HTMLInputElement).value, "100");
    assert.equal(container.querySelectorAll('[role="switch"]')[1].getAttribute("aria-checked"), "true");
    await click([...container.querySelectorAll("button")].find(button => button.textContent === "Save MOQ settings")!);
    assert.deepEqual(payloads[0], { enabled: true, targetKits: 100, showToMembers: true,
      countMode: "active", productTargets: [], expectedUpdatedAt: null });
    assert.match(container.textContent!, /MOQ settings saved/);
    assert.match(container.textContent!, /12.5 \/ 100 kits ordered/);
    await click(container.querySelector('[role="switch"]')!);
    await click([...container.querySelectorAll("button")].find(button => button.textContent === "Save MOQ settings")!);
    assert.equal(payloads[1].enabled, false);
    assert.equal(payloads[1].targetKits, 100);
    assert.equal(payloads[1].expectedUpdatedAt, "2026-10-20T09:00:01.000Z");
    assert.equal(container.querySelector('[data-testid="gb-moq-progress"]'), null);
    await click(container.querySelector('[role="switch"]')!);
    const setInput = async (element: HTMLInputElement, value: string) => act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(element, value);
      element.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await setInput(container.querySelector("input[type=number]")!, "");
    await setInput(container.querySelector('input[aria-label="HGH 36IU MOQ (kits)"]')!, "50");
    for (const mode of ["both", "paid", "active"]) {
      await act(async () => {
        const select = container.querySelector("select")!;
        select.value = mode;
        select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      });
      await click([...container.querySelectorAll("button")].find(button => button.textContent === "Save MOQ settings")!);
      const last = payloads.at(-1)!;
      assert.equal(last.countMode, mode);
      assert.equal(last.targetKits, null);
      assert.deepEqual(last.productTargets, [{ productId: "hgh36", targetKits: 50 }]);
      assert.equal(container.querySelector("select")!.value, mode);
      assert.equal((container.querySelector('input[aria-label="HGH 36IU MOQ (kits)"]') as HTMLInputElement).value, "50");
      const text = container.textContent!;
      assert.equal(text.includes("12.5 / 50 kits ordered"), mode !== "paid");
      assert.equal(text.includes("10 / 50 kits paid"), mode !== "active");
    }
  } finally {
    await act(async () => root.unmount());
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
