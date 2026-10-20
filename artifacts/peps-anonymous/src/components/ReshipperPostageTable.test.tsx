import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ReshipperPostageTable, groupEuPostageRows } = await import("./ReshipperPostageTable");
const { visibleReshipperShippingOptions } = await import("../lib/reshipper-shipping-options");
const { importEuCustomPostage } = await import("../lib/country-shipping-options");
const options = importEuCustomPostage([
  { id: "us", label: "US Shipping", country: "US", price: 12 },
  { id: "global", label: "Global", price: 5 },
], { enabled: true, currency: "USD", rates: [
  { country: "IT", pickupSmall: 7.5, pickupLarge: 11.5, homeSmall: 15, homeLarge: 20 },
  { country: "HR", pickupSmall: null, pickupLarge: null, homeSmall: 21.3, homeLarge: 27.3 },
] }, "USD");
const entries = visibleReshipperShippingOptions(options, ["IT", "HR"]);
let root: Root;
let el: HTMLDivElement;
beforeEach(() => { el = document.createElement("div"); document.body.appendChild(el); root = createRoot(el); });
afterEach(() => { act(() => root.unmount()); el.remove(); });

it("groups EU options into one alphabetically sorted row per country without including global or other countries", () => {
  const { rows, indexes } = groupEuPostageRows(entries);
  expect(rows.map(row => row.name)).toEqual(["Croatia", "Italy"]);
  expect(rows[0].pickup).toBeUndefined();
  expect(rows[1].pickup?.index).toBe(2);
  expect(indexes.has(1)).toBe(false); // global is managed separately, read-only
  expect(indexes.has(0)).toBe(false); // US is not assigned
});

it("shows all four kit bands, marks missing services unavailable and edits the exact source option", async () => {
  const onChange = vi.fn();
  await act(async () => root.render(createElement(ReshipperPostageTable, { entries, currency: "USD", onChange, onEdit: vi.fn(), onRemove: vi.fn() })));
  expect(el.querySelectorAll("tbody tr")).toHaveLength(2);
  expect(el.textContent).toContain("Pickup point");
  expect(el.textContent).toContain("Home delivery");
  const input = el.querySelector<HTMLInputElement>('[aria-label="Italy pickup point over 5 to 25 kits"]')!;
  expect(input.value).toBe("11.5");
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "12.75");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  expect(onChange).toHaveBeenCalledWith(2, { upTo5: 7.5, upTo25: 12.75 });
  expect(el.querySelector('[aria-label="Croatia pickup point up to 5 kits"]')).toBeNull();
  expect(el.querySelector('td[aria-label="Croatia pickup point unavailable"]')).not.toBeNull();
});

it("keeps edit and remove controls linked to their original option indexes", async () => {
  const onEdit = vi.fn(); const onRemove = vi.fn();
  await act(async () => root.render(createElement(ReshipperPostageTable, { entries, currency: "USD", onChange: vi.fn(), onEdit, onRemove })));
  await act(async () => el.querySelector<HTMLButtonElement>('[aria-label="Edit Italy home delivery settings"]')!.click());
  expect(onEdit).toHaveBeenCalledWith(3);
  await act(async () => el.querySelector<HTMLButtonElement>('[aria-label="Remove Italy pickup point"]')!.click());
  expect(onRemove).toHaveBeenCalledWith(2);
});

it("does not expose price edits or option actions for read-only entries", async () => {
  await act(async () => root.render(createElement(ReshipperPostageTable, {
    entries: entries.map(entry => ({ ...entry, editable: false })), currency: "USD",
    onChange: vi.fn(), onEdit: vi.fn(), onRemove: vi.fn(),
  })));
  expect([...el.querySelectorAll<HTMLInputElement>("input")].every(input => input.disabled)).toBe(true);
  expect(el.querySelector("button")).toBeNull();
});
