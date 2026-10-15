import assert from "node:assert/strict";
import React, { act, useState } from "react";
import { after, before, test } from "node:test";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

Object.assign(globalThis, { React });
let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let Picker: typeof import("./ReshipperGroupBuyPicker").ReshipperGroupBuyPicker;
before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>");
  const globals = globalThis as unknown as Record<string, unknown>;
  for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node", "MouseEvent"]) globals[key] = dom.window[key];
  globals.IS_REACT_ACT_ENVIRONMENT = true;
  createRoot = (await import("react-dom/client")).createRoot;
  Picker = (await import("./ReshipperGroupBuyPicker")).ReshipperGroupBuyPicker;
});
after(() => dom.window.close());

const assignments = [
  { id: "a", gbId: "old", country: "GB", gb: { name: "Old group" } },
  { id: "b", gbId: "new", country: "GB", gb: { name: "New group" } },
];
const colors = { panel2: "#fff", border: "#ddd", muted: "#555", text: "#111", chip: "#eee" };

test("hidden groups stay out of the list until Show hidden, then can be restored", async () => {
  const changes: unknown[] = [];
  function Harness() {
    const [show, setShow] = useState(false);
    const [selected, select] = useState("new");
    const [hidden, setHidden] = useState(["old"]);
    return <Picker assignments={assignments} hiddenIds={hidden} selectedId={selected}
      showHidden={show} saving={false} colors={colors} accent="#123456" onSelect={select}
      onShowHidden={setShow} onSetHidden={(id, hide) => {
        changes.push([id, hide]);
        setHidden(hide ? [...hidden, id] : hidden.filter(h => h !== id));
      }} />;
  }
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () => root.render(<Harness />));
    assert.equal(container.querySelector('[data-testid="button-select-gb-a"]'), null);
    assert.ok(container.querySelector('[data-testid="button-select-gb-b"]'));
    await act(async () => (container.querySelector("input") as HTMLInputElement).click());
    await act(async () => (container.querySelector('[data-testid="button-select-gb-a"]') as HTMLButtonElement).click());
    assert.match(container.textContent!, /Restore group buy/);
    await act(async () => (container.querySelector('[data-testid="button-toggle-gb-visibility"]') as HTMLButtonElement).click());
    assert.deepEqual(changes, [["old", false]]);
    assert.match(container.textContent!, /Show hidden \(0\)/);
    await act(async () => (container.querySelector("input") as HTMLInputElement).click());
    assert.ok(container.querySelector('[data-testid="button-select-gb-a"]'));
    await act(async () => (container.querySelector('[data-testid="button-toggle-gb-visibility"]') as HTMLButtonElement).click());
    assert.deepEqual(changes.at(-1), ["old", true]);
    assert.equal(container.querySelector('[data-testid="button-select-gb-a"]'), null);
  } finally { await act(async () => root.unmount()); container.remove(); }
});

test("all-hidden state offers recovery and saving disables competing actions", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const props = {
    assignments, hiddenIds: ["old", "new"], selectedId: "", showHidden: false, saving: false,
    colors, accent: "#123456", onSelect: () => {}, onShowHidden: () => {}, onSetHidden: () => {},
  };
  try {
    await act(async () => root.render(<Picker {...props} />));
    assert.match(container.textContent!, /All group buys are hidden/);
    assert.ok(container.querySelector("input"));
    await act(async () => root.render(<Picker {...props} selectedId="old" showHidden saving />));
    for (const element of container.querySelectorAll("button, input")) {
      assert.equal((element as HTMLButtonElement).disabled, true);
    }
  } finally { await act(async () => root.unmount()); container.remove(); }
});
