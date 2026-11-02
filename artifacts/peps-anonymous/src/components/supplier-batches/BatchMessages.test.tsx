import assert from "node:assert/strict";
import test from "node:test";
// @ts-expect-error Existing workspace test dependency has no declarations.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
});
const React = await import("react");
Object.assign(globalThis, { React });
const { act, createElement } = React;
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { BatchMessages } = await import("./BatchMessages");
// @ts-expect-error Existing workspace test dependency.
const { fireEvent } = await import("../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js");
const batches = ["a", "b", "released"].map((id, i) => ({
  id, reference: `GB / 00${i + 1}`, state: id === "released" ? "released" : "ordered",
  snapshot: { token: id, region: { name: "United Kingdom" } },
})) as any;

test("selects batches, previews before sending, and preserves idempotency on a lost response", async () => {
  const original = globalThis.fetch;
  const calls: { path: string; body: any }[] = [];
  let failFirstSend = true;
  globalThis.fetch = async (input, init) => {
    const path = String(input), body = init?.body ? JSON.parse(String(init.body)) : null;
    calls.push({ path, body });
    if (path.endsWith("/preview")) return Response.json({ token: "preview-token", references: ["GB / 001", "GB / 002"],
      text: "Your update", recipientCount: 2, telegramCount: 1, missingAccounts: 0 });
    if (path.endsWith("/send")) {
      if (failFirstSend) { failFirstSend = false; throw new Error("Connection lost"); }
      return Response.json({ requestKey: body.requestKey, recipientCount: 2, telegramCount: 1 });
    }
    return Response.json([]);
  };
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host), client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const button = (pattern: RegExp) => [...host.querySelectorAll("button")].find(b => pattern.test(b.textContent!))!;
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client },
      createElement(BatchMessages, { groupBuyId: "hgh", batches, headers: { "x-admin-secret": "synthetic" } }))));
    await act(async () => button(/Message batch members/).click());
    assert.equal(host.querySelectorAll('input[type="checkbox"]').length, 2);
    await act(async () => {
      for (const checkbox of host.querySelectorAll('input[type="checkbox"]')) fireEvent.click(checkbox);
      fireEvent.change(host.querySelector("textarea")!, { target: { value: "Your update" } });
    });
    assert.equal(calls.filter(c => c.path.endsWith("/send")).length, 0);
    await act(async () => { button(/Preview recipients/).click(); await new Promise(r => setTimeout(r, 30)); });
    assert.match(host.textContent!, /2 unique members/);
    assert.deepEqual(calls.find(c => c.path.endsWith("/preview"))!.body, { batchIds: ["a", "b"], message: "Your update" });
    await act(async () => { button(/Confirm & send/).click(); await new Promise(r => setTimeout(r, 20)); });
    assert.match(host.textContent!, /Connection lost/);
    assert.equal(host.querySelector("textarea")!.matches(":disabled"), true);
    await act(async () => { button(/Retry same send/).click(); await new Promise(r => setTimeout(r, 20)); });
    const sends = calls.filter(c => c.path.endsWith("/send"));
    assert.equal(sends.length, 2);
    assert.deepEqual(sends[0].body, sends[1].body);
    assert.equal(sends[0].body.confirm, true);
    assert.equal(sends[0].body.previewToken, "preview-token");
    assert.match(host.textContent!, /Website message recorded for 2 unique members/);
    assert.equal((host.querySelector("textarea") as HTMLTextAreaElement).value, "");
  } finally {
    await act(async () => root.unmount()); host.remove(); client.clear(); globalThis.fetch = original;
  }
});

test("an edited message requires a new preview", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async input => Response.json(String(input).endsWith("/preview")
    ? { token: "preview", references: ["GB / 001"], text: "First", recipientCount: 1, telegramCount: 0, missingAccounts: 0 } : []);
  const host = document.createElement("div"); document.body.append(host);
  const root = createRoot(host), client = new QueryClient();
  const button = (pattern: RegExp) => [...host.querySelectorAll("button")].find(b => pattern.test(b.textContent!))!;
  try {
    await act(async () => root.render(createElement(QueryClientProvider, { client }, createElement(BatchMessages, { groupBuyId: "hgh", batches }))));
    await act(async () => button(/Message batch members/).click());
    await act(async () => {
      fireEvent.click(host.querySelector("input")!);
      fireEvent.change(host.querySelector("textarea")!, { target: { value: "First" } });
    });
    await act(async () => { button(/Preview recipients/).click(); await new Promise(r => setTimeout(r, 20)); });
    assert.ok(host.querySelector('[data-testid="batch-message-preview"]'));
    await act(async () => fireEvent.change(host.querySelector("textarea")!, { target: { value: "Changed" } }));
    assert.equal(host.querySelector('[data-testid="batch-message-preview"]'), null);
    assert.equal(button(/Confirm & send/), undefined);
  } finally {
    await act(async () => root.unmount()); host.remove(); client.clear(); globalThis.fetch = original;
  }
});
