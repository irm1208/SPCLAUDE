import assert from "node:assert/strict";
import React, { act } from "react";
import { after, afterEach, before, test } from "node:test";
import type { Root } from "react-dom/client";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";
// @ts-expect-error Existing workspace browser-test dependency.
import { fireEvent } from "../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js";

Object.assign(globalThis, { React });
let dom: JSDOM;
let root: Root | undefined;
let client: import("@tanstack/react-query").QueryClient;
let Manager: typeof import("./GroupBuyUpdatesManager").GroupBuyUpdatesManager;
let query: typeof import("@tanstack/react-query");
let createRoot: typeof import("react-dom/client").createRoot;
const nativeFetch = globalThis.fetch;
const requests: Array<{ url: string; body: unknown }> = [];
let updates: Record<string, unknown>[] = [];
let stage = "open";
const detail = () => ({ groupBuy: { id: "G", name: "Test group" }, stage, stageUpdatedAt: null, updates });

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test/" });
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Event", "Node", "MutationObserver", "MouseEvent"]) {
    globals[key] = dom.window[key];
  }
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  query = await import("@tanstack/react-query");
  Manager = (await import("./GroupBuyUpdatesManager")).GroupBuyUpdatesManager;
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  client?.clear();
  document.body.innerHTML = "";
  globalThis.fetch = nativeFetch;
  requests.length = 0; updates = []; stage = "open";
});
after(() => dom.window.close());

async function mount(scope: "admin" | "organiser") {
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (init?.method === "PUT" && url.endsWith("/progress")) {
      const body = JSON.parse(String(init.body));
      requests.push({ url, body }); stage = body.stage;
      return Response.json(detail());
    }
    if (init?.method === "POST" || init?.method === "PUT") {
      const body = init.body as FormData;
      requests.push({ url, body });
      return Response.json({ update: { id: "N", groupBuyId: "G", title: body.get("title"), note: body.get("note"),
        published: body.get("published") === "true", kind: "note", imageUrl: null,
        createdAt: "2026-10-15T12:00:00Z", updatedAt: "2026-10-15T12:00:00Z" } });
    }
    return Response.json(detail());
  };
  client = new query.QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => {
    root!.render(React.createElement(query.QueryClientProvider, { client }, React.createElement(Manager, { scope, groupBuyId: "G" })));
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
}
function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const found = document.querySelector(`[data-testid="${id}"]`);
  assert.ok(found, `Missing ${id}`);
  return found as T;
}
async function click(id: string) {
  await act(async () => { fireEvent.click(element(id)); await new Promise(resolve => setTimeout(resolve, 10)); });
}
async function change(id: string, value: string) {
  await act(async () => { fireEvent.change(element(id), { target: { value } }); });
}

for (const scope of ["organiser", "admin"] as const) {
  test(`${scope}: stage alerts default off, are submitted explicitly, and reset after saving`, async () => {
    await mount(scope);
    assert.equal(element<HTMLInputElement>("checkbox-gb-stage-telegram-alert").checked, false);
    await change("select-gb-stage", "ordered");
    await click("button-save-gb-stage");
    assert.deepEqual(requests[0], { url: `/api/${scope}/group-buys/G/progress`,
      body: { stage: "ordered", expectedUpdatedAt: null, sendTelegramAlert: false } });
    await change("select-gb-stage", "in_transit");
    await click("checkbox-gb-stage-telegram-alert");
    await click("button-save-gb-stage");
    assert.equal((requests[1].body as { sendTelegramAlert: boolean }).sendTelegramAlert, true);
    assert.equal(element<HTMLInputElement>("checkbox-gb-stage-telegram-alert").checked, false);
  });
  test(`${scope}: publication and Telegram alerts are separate choices`, async () => {
    await mount(scope);
    const add = document.querySelector<HTMLButtonElement>('[data-testid="button-new-gb-update"]');
    assert.ok(add);
    await act(async () => { fireEvent.click(add); });
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").checked, false);
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").disabled, true);
    await click("checkbox-gb-update-published");
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").checked, false);
    await click("checkbox-gb-update-telegram-alert");
    await change("input-gb-update-note", "New vendor update");
    await click("button-save-gb-update");
    const body = requests[0].body as FormData;
    assert.equal(body.get("published"), "true");
    assert.equal(body.get("sendTelegramAlert"), "true");
  });
  test(`${scope}: quick publication opens the alert choices instead of sending immediately`, async () => {
    updates = [{ id: "draft", groupBuyId: "G", title: "Draft", note: "Private", kind: "note", published: false,
      imageUrl: null, createdAt: "2026-10-15T12:00:00Z", updatedAt: "2026-10-15T12:00:00Z" }];
    await mount(scope);
    await click("button-toggle-gb-update-draft");
    assert.equal(requests.length, 0);
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").checked, false);
  });
  test(`${scope}: clearing publication clears the alert choice`, async () => {
    await mount(scope);
    await click("button-new-gb-update");
    await click("checkbox-gb-update-published");
    await click("checkbox-gb-update-telegram-alert");
    await click("checkbox-gb-update-published");
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").checked, false);
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").disabled, true);
  });
  test(`${scope}: already-announced updates cannot be accidentally broadcast again`, async () => {
    updates = [{ id: "sent", groupBuyId: "G", title: "Sent", note: "News", kind: "note", published: true,
      telegramAlertQueued: true, imageUrl: null, createdAt: "2026-10-15T12:00:00Z", updatedAt: "2026-10-15T12:00:00Z" }];
    await mount(scope);
    await click("button-edit-gb-update-sent");
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").disabled, true);
    assert.equal(element<HTMLInputElement>("checkbox-gb-update-telegram-alert").checked, false);
  });
}
