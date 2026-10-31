import React, { act } from "react";
import assert from "node:assert/strict";
import { afterAll as after, afterEach, beforeAll as before, test } from "vitest";
import type { Root } from "react-dom/client";
import { JSDOM } from "jsdom";
import type { CombinedOrderShippingProps } from "./CombinedOrderShipping";

let createRoot: typeof import("react-dom/client").createRoot;
let Component: typeof import("./CombinedOrderShipping").default;
let dom: JSDOM;
let container: HTMLDivElement;
let root: Root | undefined;

const prefix = "/admin/group-buys";
const groupBuyId = "GB one";

function response(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fixture(options: { id?: string; paymentStatus?: string; canDispatch?: boolean; reason?: string | null } = {}) {
  const id = options.id ?? "parent-a";
  const code = id === "parent-b" ? "PEP-204" : "PEP-104";
  return {
    parentId: id,
    orders: [
      { id: `${id}-order-a`, code, status: "ready", paymentStatus: options.paymentStatus ?? "confirmed" },
      { id: `${id}-order-b`, code: id === "parent-b" ? "PEP-205" : "PEP-105", status: "ready", paymentStatus: options.paymentStatus ?? "test_confirmed" },
    ],
    printOrder: {
      id,
      code,
      telegramUsername: "orchid",
      status: "ready",
      deliveryMethod: "Tracked post",
      shippingName: "Rae",
      shippingAddress: "12 Cedar Lane",
      shippingCity: "Leeds",
      shippingPostcode: "LS1 2AB",
      shippingCountry: "United Kingdom",
      lineItems: [{ productName: "Starter kit", quantity: 2 }],
    },
    canDispatch: options.canDispatch ?? true,
    canPrint: true,
    reason: options.reason ?? null,
    trackingNumber: null,
    dispatched: false,
    parcels: [{ id: "parcel-a", label: "Parcel A", status: "packed" }],
  };
}

function props(
  dfetch: CombinedOrderShippingProps["dfetch"],
  overrides: Partial<CombinedOrderShippingProps> = {},
): CombinedOrderShippingProps {
  return {
    groupBuyId,
    prefix,
    dfetch,
    onPrint: () => undefined,
    ...overrides,
  };
}

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
    pretendToBeVisual: true,
  });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const name of [
    "window", "document", "navigator", "location", "history", "HTMLElement",
    "HTMLInputElement", "HTMLButtonElement", "Event", "MouseEvent", "Node",
    "DOMException", "MutationObserver", "SVGElement",
  ]) {
    globals[name] = (dom.window as unknown as Record<string, unknown>)[name];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  globals.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  globals.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
  globals.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
  createRoot = (await import("react-dom/client")).createRoot;
  Component = (await import("./CombinedOrderShipping")).default;
});

after(() => dom.window.close());

afterEach(async () => {
  if (root) {
    const mountedRoot = root;
    await act(async () => mountedRoot.unmount());
    container.remove();
    root = undefined;
  }
});

async function mount(componentProps: CombinedOrderShippingProps) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<Component {...componentProps} />);
  });
  await settle();
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
}

function button(testId: string): HTMLButtonElement {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  assert.ok(element instanceof HTMLButtonElement, `Expected button ${testId}`);
  return element;
}

function input(testId: string): HTMLInputElement {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  assert.ok(element instanceof HTMLInputElement, `Expected input ${testId}`);
  return element;
}

test("renders a ready confirmed/test-confirmed group and posts the exact endpoint and selected parcel IDs", async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const dfetch: CombinedOrderShippingProps["dfetch"] = async (path, options) => {
    calls.push({ path, options });
    if (options?.method === "POST") {
      return response({ ok: true, orderIds: ["order-a", "order-b"], trackingNumber: "TRK-44", replayed: false });
    }
    return response({ groups: [fixture()] });
  };
  await mount(props(dfetch));

  assert.match(container.textContent ?? "", /PEP-104, PEP-105/);
  assert.match(container.textContent ?? "", /Common destination/);
  assert.equal(container.querySelector('[data-testid="payment-status-parent-a-order-a"]')?.textContent, "PEP-104 · Paid");
  assert.equal(container.querySelector('[data-testid="payment-status-parent-a-order-b"]')?.textContent, "PEP-105 · Test paid");

  const tracking = input("input-tracking-parent-a");
  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  assert.ok(valueSetter);
  await act(async () => {
    valueSetter.call(tracking, "TRK-44");
    tracking.dispatchEvent(new Event("input", { bubbles: true }));
    tracking.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await act(async () => button("button-dispatch-linked-parent-a").click());
  await settle();

  const post = calls.find((call) => call.options?.method === "POST");
  assert.ok(post);
  assert.equal(post.path, "/admin/group-buys/GB%20one/linked-orders/parent-a/dispatch");
  assert.deepEqual(JSON.parse(String(post.options?.body)), {
    trackingNumber: "TRK-44",
    parcelIds: ["parcel-a"],
  });
  assert.equal(post.options?.headers && (post.options.headers as Record<string, string>)["Content-Type"], "application/json");
  assert.match(container.textContent ?? "", /Tracking TRK-44 was applied to all orders/);
});

test("unpaid groups remain visible but dispatch is disabled with the backend wait reason", async () => {
  const dfetch: CombinedOrderShippingProps["dfetch"] = async () =>
    response({ groups: [fixture({ paymentStatus: "unpaid", canDispatch: false, reason: "Awaiting customer payment." })] });
  await mount(props(dfetch));

  assert.equal(button("button-dispatch-linked-parent-a").disabled, true);
  assert.match(container.textContent ?? "", /Awaiting customer payment/);
  assert.equal(container.querySelector('[data-testid="payment-status-parent-a-order-a"]')?.textContent, "PEP-104 · Not paid · Unpaid");
});

test("print invokes the supplied combined print callback exactly once", async () => {
  let printed = 0;
  const dfetch: CombinedOrderShippingProps["dfetch"] = async () => response({ groups: [fixture()] });
  await mount(props(dfetch, { onPrint: () => { printed += 1; } }));

  await act(async () => button("button-print-linked-parent-a").click());
  assert.equal(printed, 1);
});

test("changing group-buy scope never retains the prior group's data, including late fetch responses", async () => {
  let resolveFirst: ((value: Response) => void) | undefined;
  const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
  const dfetch: CombinedOrderShippingProps["dfetch"] = async (path) => {
    if (path.includes("/GB%20one/")) return firstResponse;
    return response({ groups: [fixture({ id: "parent-b" })] });
  };
  await mount(props(dfetch));
  await act(async () => {
    root?.render(<Component {...props(dfetch, { groupBuyId: "GB two" })} />);
  });
  await settle();
  assert.match(container.textContent ?? "", /parent-b/);
  assert.match(container.textContent ?? "", /PEP-204/);
  assert.doesNotMatch(container.textContent ?? "", /PEP-104/);

  resolveFirst?.(response({ groups: [fixture({ id: "parent-a" })] }));
  await settle();
  assert.match(container.textContent ?? "", /parent-b/);
  assert.doesNotMatch(container.textContent ?? "", /parent-a/);
});
