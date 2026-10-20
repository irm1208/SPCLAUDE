import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
// @ts-expect-error This workspace installs jsdom without its optional type declarations.
import { JSDOM } from "jsdom";

test("members can complete, filter, reload and restore a group buy using account-saved requests", async () => {
  const dom = new JSDOM("<!doctype html><div id='root'></div>", { url: "http://localhost", pretendToBeVisual: true });
  const previous = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({
    window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement, Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  })) {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  const originalFetch = globalThis.fetch;
  let saved = [
    { id: "a", name: "Open group", status: "active", archived: false },
    { id: "b", name: "Closed group", status: "closed", archived: false },
  ];
  let fail = false;
  const writes: { url: string; credentials: RequestCredentials | undefined }[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (init?.method === "POST") {
      writes.push({ url, credentials: init.credentials });
      if (fail) return new Response(JSON.stringify({ error: "Could not save completion" }), { status: 500 });
      const archived = url.endsWith("/archive");
      saved = saved.map(g => g.id === "a" ? { ...g, archived } : g);
      return new Response(JSON.stringify({ ok: true, archived }));
    }
    assert.equal(url, "/api/group-buys");
    return new Response(JSON.stringify(saved));
  };

  const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
  const { createRoot } = await import("react-dom/client");
  const { useMyGroupBuys, useSetGroupBuyArchived } = await import("../hooks/use-account");
  const { MemberGroupBuyFilters } = await import("./MemberGroupBuyFilters");
  const { filterMemberGroupBuys } = await import("../lib/member-group-buys");
  const { act } = React;
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  function Harness() {
    const { data = [] } = useMyGroupBuys();
    const mutation = useSetGroupBuyArchived();
    const [filter, setFilter] = React.useState<"all" | "open" | "closed" | "completed">("all");
    return <>
      <MemberGroupBuyFilters groups={data} value={filter} onChange={setFilter} />
      {filterMemberGroupBuys(data, filter).map(g => (
        <div key={g.id} data-group={g.id}>
          {g.name}
          <button data-action={g.id} disabled={mutation.isPending} onClick={() =>
            mutation.mutate({ groupBuyId: g.id, archived: !g.archived })
          }>{g.archived ? "Restore group buy" : "Mark as completed"}</button>
        </div>
      ))}
      {mutation.isError && <p role="alert">{mutation.error.message}</p>}
    </>;
  }
  async function settle() {
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
  }
  async function click(selector: string) {
    const button = container.querySelector<HTMLButtonElement>(selector);
    assert.ok(button, selector);
    await act(async () => button.click());
    await settle();
  }
  function filterButton(name: string) {
    return [...container.querySelectorAll<HTMLButtonElement>("[aria-pressed]")].find(b => b.textContent?.startsWith(name))!;
  }
  async function choose(name: string) {
    await act(async () => filterButton(name).click());
    await settle();
  }
  const render = () => root.render(<QueryClientProvider client={client}><Harness /></QueryClientProvider>);
  try {
    await act(async () => { render(); });
    await settle();
    assert.equal(filterButton("All").textContent, "All2");
    assert.equal(filterButton("Open").textContent, "Open1");
    await choose("Open");
    await click("[data-action='a']");
    assert.equal(container.querySelector("[data-group='a']"), null);
    assert.equal(filterButton("Completed").textContent, "Completed1");
    assert.equal(saved[0].status, "active", "personal completion does not close a group for others");
    assert.deepEqual(writes[0], { url: "/api/group-buys/a/archive", credentials: "include" });
    await choose("Completed");
    assert.ok(container.textContent?.includes("Restore group buy"));
    await choose("All");
    assert.equal(container.querySelectorAll("[data-group]").length, 2);

    // Simulate navigation/remount plus a fresh list request, not just cached state.
    await act(async () => root.render(<></>));
    client.clear();
    await act(async () => { render(); });
    await settle();
    await choose("Completed");
    assert.ok(container.querySelector("[data-group='a']"));
    await click("[data-action='a']");
    assert.equal(filterButton("Completed").textContent, "Completed0");
    assert.equal(container.querySelector("[data-group='a']"), null);
    assert.deepEqual(writes[1], { url: "/api/group-buys/a/unarchive", credentials: "include" });
    await choose("Open");
    assert.ok(container.querySelector("[data-group='a']"));

    fail = true;
    await click("[data-action='a']");
    assert.match(container.querySelector("[role='alert']")?.textContent ?? "", /Could not save completion/);
    assert.ok(container.querySelector("[data-group='a']"), "failed save must not move the group");
    assert.equal(filterButton("Completed").textContent, "Completed0");
  } finally {
    await act(async () => root.unmount());
    client.clear();
    globalThis.fetch = originalFetch;
    dom.window.close();
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as Record<string, unknown>)[key];
    }
  }
});
