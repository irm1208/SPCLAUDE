import type { Root } from "react-dom/client";
import { afterAll, afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is available through the workspace test harness.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
function setupDomGlobals() {
  for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
    vi.stubGlobal(name, name === "window" ? dom.window : dom.window[name]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDomGlobals();
const { act, createElement, useState } = await import("react");
const { createRoot } = await import("react-dom/client");
const { GroupBuyStockControls } = await import("./GroupBuyStockControls");
const { default: GbProductsTab } = await import("../pages/organiser-v2/GbProductsTab");
const { organiserApi } = await import("../pages/organiser-v2/api/organiser-api");

let root: Root;
let container: HTMLDivElement;
const updated = vi.fn();

function Harness() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  return createElement(GroupBuyStockControls, {
    groupId: "GB1", productIds: ["p1", "p2"], selectedIds: selected,
    onSelectionChange: setSelected, onUpdated: updated,
  });
}

beforeEach(async () => {
  setupDomGlobals();
  updated.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(Harness)); });
});
afterAll(() => dom.window.close());
afterEach(async () => {
  await act(async () => { root.unmount(); });
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function selectAndEnterQuantity() {
  await act(async () => {
    container.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
  });
  await act(async () => {
    const input = container.querySelector<HTMLInputElement>('input[type="number"]')!;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "5");
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

it("selects all, submits the editable quantity, updates products and clears the form", async () => {
  const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({
    products: [{ id: "p1", stock: 8, sold: 3 }, { id: "p2", stock: 5, sold: 0 }], updatedCount: 2,
  }) });
  vi.stubGlobal("fetch", request);
  await selectAndEnterQuantity();
  expect(container.textContent).toContain("2 selected");
  const submit = [...container.querySelectorAll("button")].find(button => button.textContent === "Update stock")!;
  expect(submit.disabled).toBe(false);
  await act(async () => { submit.click(); });
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ productIds: ["p1", "p2"], mode: "set", quantity: 5 });
  expect(updated).toHaveBeenCalledWith([{ id: "p1", stock: 8, sold: 3 }, { id: "p2", stock: 5, sold: 0 }]);
  expect(container.textContent).toContain("0 selected");
  expect(container.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe("");
  expect(container.querySelector('[role="status"]')!.textContent).toContain("2 products in this group buy only");
});

it("keeps the selection and quantity after a server error", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Refresh and try again." }) }));
  await selectAndEnterQuantity();
  await act(async () => {
    [...container.querySelectorAll("button")].find(button => button.textContent === "Update stock")!.click();
  });
  expect(updated).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')!.textContent).toBe("Refresh and try again.");
  expect(container.textContent).toContain("2 selected");
  expect(container.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe("5");
});

it("toggles all V2 products on and off using the catalogue header button", async () => {
  vi.spyOn(organiserApi, "products").mockResolvedValue([
    { id: "p1", name: "Product one", price: 10, vendor: "Vendor", stock: 20, sold: 0, active: true },
    { id: "p2", name: "Product two", price: 12, vendor: "Vendor", stock: 30, sold: 0, active: true },
  ]);
  await act(async () => { root.render(createElement(GbProductsTab, { selectedGbId: "GB1", currency: "USD" })); });
  const button = container.querySelector<HTMLButtonElement>(".products-split__selection-actions > button")!;
  expect(button.textContent).toBe("Select all (2)");
  await act(async () => { button.click(); });
  expect(button.textContent).toBe("Deselect all (2)");
  expect(container.querySelector(".products-split__bulk > strong")!.textContent).toBe("2 selected");
  expect([...container.querySelectorAll<HTMLInputElement>(".products-split__row input")].every(input => input.checked)).toBe(true);
  await act(async () => { button.click(); });
  expect(button.textContent).toBe("Select all (2)");
  expect(container.querySelector(".products-split__bulk > strong")!.textContent).toBe("0 selected");
});
