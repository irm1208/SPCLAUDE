import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";

const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { PackingSlipsPanel } = await import("./PackingSlipsPanel");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

function button(root: ParentNode, text: string) {
  const found = [...root.querySelectorAll("button")].find(el => el.textContent?.trim() === text || el.getAttribute("aria-label") === text);
  expect(found, text).toBeTruthy();
  return found!;
}
async function select(root: ParentNode, label: string, value: string) {
  const el = root.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;
  expect(el).toBeTruthy();
  await React.act(async () => { el.value = value; el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
}

it("offers a dedicated packing slips tab inside Admin group-buy detail", () => {
  const source = readFileSync(new URL("../GbDetailShell.tsx", import.meta.url), "utf8");
  expect(source).toContain('id: "packing-slips", label: "Packing slips"');
  expect(source).toContain('<PackingSlipsPanel key={currentGb.id} secret={secret} groupBuyId={currentGb.id} groupBuyName={currentGb.name}');
});

it("loads all pages, filters countries and unassigned reshippers, and prints only selected visible orders without dispatching", async () => {
  const base = { status: "Submitted", telegramUsername: "example", deliveryMethod: "Post", shippingAddress: "Example Street", lineItems: [{ productName: "Example product", quantity: 2 }] };
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, options) => {
    const url = new URL(String(input), "https://example.test");
    expect(url.pathname).toBe("/api/admin/orders");
    expect(url.searchParams.get("groupBuyId")).toBe("gb-example");
    expect(options?.headers).toEqual({ "x-admin-secret": "test-admin" });
    expect(options?.method ?? "GET").toBe("GET");
    return { ok: true, json: async () => ({
      orders: url.searchParams.get("page") === "1" ? [
        { ...base, id: "one", code: "10001", shippingCountry: "GB", reshipperUsername: null, shippingName: "Unassigned recipient" },
        { ...base, id: "two", code: "10002", shippingCountry: "Germany", reshipperUsername: "@ExampleLead", shippingName: "Assigned recipient" },
      ] : [{ ...base, id: "three", code: "10003", shippingCountry: "United Kingdom", reshipperUsername: "examplelead", shippingName: "Third recipient" }],
      pagination: { totalPages: 2 },
    }) } as Response;
  });
  const el = document.createElement("div");
  document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<PackingSlipsPanel secret="test-admin" groupBuyId="gb-example" groupBuyName="Example GB" />); });
    expect(request).toHaveBeenCalledTimes(2);
    expect(el.textContent).toContain("Third recipient");
    await select(el, "Country", "United Kingdom");
    expect(el.textContent).not.toContain("Assigned recipient");
    await select(el, "Reshipper", "__none__");
    expect(el.textContent).toContain("Unassigned recipient");
    expect(el.textContent).not.toContain("Third recipient");
    await React.act(async () => { button(el, "Select all filtered").click(); });
    await React.act(async () => { button(el, "Print Packing Slips (1)").click(); });
    const modal = button(el, "Print / Save PDF").closest(".fixed")!;
    expect(modal.textContent).toContain("Unassigned recipient");
    expect(modal.textContent).toContain("Example product");
    expect(modal.textContent).not.toContain("Third recipient");
    await React.act(async () => { button(el, "Close packing slips").click(); });
    await select(el, "Reshipper", "examplelead");
    expect(button(el, "Print Packing Slips (0)").disabled).toBe(true);
    expect(el.textContent).toContain("Third recipient");
    expect(request).toHaveBeenCalledTimes(2);
  } finally { await React.act(async () => root.unmount()); }
});

it("shows an error and does not allow printing a partial failed load", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "Session expired" }) } as Response);
  const el = document.createElement("div");
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<PackingSlipsPanel secret="test-admin" groupBuyId="gb-example" groupBuyName="Example GB" />); });
    expect(el.textContent).toContain("Session expired");
    expect(button(el, "Print Packing Slips (0)").disabled).toBe(true);
  } finally { await React.act(async () => root.unmount()); }
});
