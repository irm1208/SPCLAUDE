import React, { act } from "react";
import type { Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, expect, it, vi } from "vitest";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

let root: Root;
let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let EuCustomPostageImport: typeof import("./EuCustomPostageTools").EuCustomPostageImport;
beforeAll(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node", "MouseEvent"])
    vi.stubGlobal(key, dom.window[key]);
  createRoot = (await import("react-dom/client")).createRoot;
  EuCustomPostageImport = (await import("./EuCustomPostageTools")).EuCustomPostageImport;
});
afterAll(() => dom.window.close());
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ""; vi.unstubAllGlobals(); });
it("imports the saved reshipper prices without changing UK options or saving automatically", async () => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const template = { enabled: true, currency: "USD", rates: [{ country: "IT", pickupSmall: 7.5, pickupLarge: 11.5, homeSmall: 15, homeLarge: 20 }] };
  const saved = { ...template, rates: [{ country: "IT", pickupSmall: 9, pickupLarge: 13, homeSmall: 17, homeLarge: 22 }] };
  const fetcher = vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify({ template, countries: [], currencies: ["USD"], reshippers: [{ username: "resh", enabled: true, matrix: saved }] }), { status: 200 }));
  const onChange = vi.fn();
  const uk = { id: "royal", label: "Royal Mail", country: "GB", price: 3 };
  const node = document.createElement("div"); document.body.append(node); root = createRoot(node);
  await act(async () => root.render(<EuCustomPostageImport gbId="G" currency="USD" scope="admin" fetcher={fetcher} options={[uk]} onChange={onChange} />));
  await act(async () => (node.querySelector("button") as HTMLButtonElement).click());
  expect(fetcher.mock.calls[0][0]).toBe("/api/admin/group-buys/G/onward-delivery");
  expect((node.querySelector("select") as HTMLSelectElement).value).toBe("resh");
  expect(onChange).not.toHaveBeenCalled();
  const button = [...node.querySelectorAll("button")].find(button => button.textContent === "Import rates")!;
  await act(async () => button.click());
  expect(onChange.mock.calls[0][0]).toEqual([
    uk,
    expect.objectContaining({ country: "IT", label: "Italy — Pickup point", kitPrices: { upTo5: 9, upTo25: 13 } }),
    expect.objectContaining({ country: "IT", label: "Italy — Home delivery", kitPrices: { upTo5: 17, upTo25: 22 } }),
  ]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(node.textContent).toContain("then save your postage options");
});
