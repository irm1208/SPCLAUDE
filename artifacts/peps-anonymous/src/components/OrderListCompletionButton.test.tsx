import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
// @ts-expect-error This workspace installs jsdom without its optional type declarations.
import { JSDOM } from "jsdom";

test("order completion saves to the account, restores after reload, and rolls back failed saves", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [name, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  }
  const originalFetch = globalThis.fetch;
  let savedIds: string[] = [];
  let failWrite = false;
  let failRead = false;
  const writes: unknown[] = [];
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), "/api/account/hidden-orders");
    assert.equal(init?.credentials, "include");
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      writes.push(body);
      if (failWrite) return new Response("Save failed", { status: 500 });
      if (body.add) savedIds = [...new Set([...savedIds, body.add])];
      if (body.remove) savedIds = savedIds.filter(id => id !== body.remove);
      return new Response(JSON.stringify({ hiddenOrderIds: savedIds }));
    }
    if (failRead) return new Response("Load failed", { status: 500 });
    return new Response(JSON.stringify(savedIds));
  };

  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { useHiddenOrders, useToggleHiddenOrder } = await import("../hooks/use-account");
  const { OrderListCompletionButton } = await import("./OrderListCompletionButton");
  const { filterMemberOrderCards } = await import("../lib/member-order-list");
  const { createRoot } = await import("react-dom/client");
  const { act } = React;
  const client = new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: Infinity }, mutations: { retry: false, gcTime: Infinity },
  } });
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const cards = [
    { kind: "gb", title: "Group buy", order: { id: "gb", status: "Submitted", code: "123", lineItems: [] } },
    { kind: "shared", title: "Shared", order: { id: "shared", status: "Shipped", code: "456", lineItems: [] } },
    { kind: "wholesale", title: "Wholesale", order: { id: "wholesale", status: "Completed", code: "789", lineItems: [] } },
  ];
  function Harness() {
    const query = useHiddenOrders();
    const change = useToggleHiddenOrder();
    const [section, setSection] = React.useState<"active" | "completed">("active");
    const ids = new Set(query.data ?? []);
    const selected = query.isLoading || query.isError ? [] : filterMemberOrderCards(cards, ids, {
      section, type: "all", status: "all", search: "",
    });
    return <>
      <button data-section="active" onClick={() => setSection("active")}>Active</button>
      <button data-section="completed" onClick={() => setSection("completed")}>Completed</button>
      {selected.map(card => <div data-order={card.order.id} key={card.order.id}>
        {card.title}
        <OrderListCompletionButton completed={ids.has(card.order.id)} pending={change.isPending}
          onClick={() => change.mutate({ orderId: card.order.id, hidden: !ids.has(card.order.id) })} />
      </div>)}
      {change.isError && <p role="alert">{change.error.message}</p>}
      {query.isError && <p role="alert">{query.error.message}</p>}
    </>;
  }
  const render = () => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 40)); }); };
  const click = async (selector: string) => {
    const button = container.querySelector<HTMLButtonElement>(selector);
    assert.ok(button, selector);
    await act(async () => button.click());
    await settle();
  };
  try {
    await act(async () => { render(); });
    await settle();
    assert.equal(container.querySelectorAll("[data-order]").length, 3, "All includes every type");
    await click("[data-order='gb'] button");
    assert.deepEqual(writes[0], { add: "gb" });
    assert.equal(container.querySelector("[data-order='gb']"), null);
    assert.equal(cards[0].order.status, "Submitted");
    await click("[data-section='completed']");
    assert.equal(container.querySelectorAll("[data-order]").length, 1);
    assert.ok(container.textContent?.includes("Restore to active orders"));

    await act(async () => root.render(<></>));
    client.clear();
    await act(async () => { render(); });
    await settle();
    assert.equal(container.querySelector("[data-order='gb']"), null, "saved completion survives a fresh fetch");
    await click("[data-section='completed']");
    await click("[data-order='gb'] button");
    assert.deepEqual(writes[1], { remove: "gb" });
    assert.equal(container.querySelectorAll("[data-order]").length, 0);
    await click("[data-section='active']");
    assert.equal(container.querySelectorAll("[data-order]").length, 3);

    failWrite = true;
    await click("[data-order='shared'] button");
    assert.ok(container.querySelector("[data-order='shared']"), "failed save restores the card");
    assert.match(container.querySelector("[role='alert']")?.textContent ?? "", /Failed to update/);
    assert.deepEqual(savedIds, []);

    failRead = true;
    await act(async () => { await client.invalidateQueries({ queryKey: ["account", "hidden-orders"] }); });
    await settle();
    assert.match(container.textContent ?? "", /Could not load completed orders/);
    assert.equal(container.querySelectorAll("[data-order]").length, 0, "do not silently show completed orders as active on load failure");
  } finally {
    await act(async () => root.unmount());
    client.clear();
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete (globalThis as Record<string, unknown>)[name];
    }
  }
});
