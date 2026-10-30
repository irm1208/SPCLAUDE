import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
import type { DispatchCfg } from "./AdminDispatch";

const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { act } = React;
const { DispatchManager } = await import("./AdminDispatch");

afterEach(() => { document.body.innerHTML = ""; });

function button(root: ParentNode, text: string) {
  const result = [...root.querySelectorAll("button")].find(el => el.textContent?.trim() === text || el.getAttribute("aria-label") === text);
  expect(result, `Missing button: ${text}`).toBeTruthy();
  return result!;
}

describe("Admin pending packing slips", () => {
  it("prints selected pending orders without parcels or an assigned reshipper, without dispatching", async () => {
    const orders = [
      { id: "order-one", code: "12345", telegramUsername: "member_one", status: "Submitted", deliveryMethod: "Post", reshipperUsername: null, shippingName: "Example Recipient", shippingAddress: "Example Street", shippingCity: "London", shippingPostcode: "TEST", shippingCountry: "GB", lineItems: [{ productName: "Example product", quantity: 2 }] },
      { id: "order-two", code: "12346", telegramUsername: "member_two", status: "Processing", deliveryMethod: "Post", reshipperUsername: null, lineItems: [{ productName: "Other product", quantity: 1 }] },
    ];
    const dfetch = vi.fn(async (path: string) => {
      const data = path.endsWith("/scope-options") ? { reshippers: [], countryLegs: [] }
        : path.endsWith("/gb-info") ? { name: "Example group buy" }
        : path.startsWith("/admin/orders?") ? { orders }
        : [];
      return { ok: true, json: async () => data } as Response;
    });
    const cfg: DispatchCfg = {
      role: "admin", base: "/admin/dispatch", gbId: "example-gb", dfetch,
      ordersPath: qs => `/admin/orders?${qs}`, groupBuysPath: "/admin/group-buys-list",
      gbParcelsPath: id => `/admin/group-buys/${id}/parcels`,
      orderImagesPath: id => `/admin/orders/${id}/dispatch-images`,
    };
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => { root.render(<DispatchManager cfg={cfg} />); });
      await act(async () => { button(container, "All Orders").click(); });
      const member = [...container.querySelectorAll("span")].find(el => el.textContent === "@member_one");
      expect(member).toBeTruthy();
      await act(async () => { (member as HTMLElement).click(); });
      await act(async () => { button(container, "Print Packing Slips (1)").click(); });
      const modal = button(container, "Print / Save PDF").closest(".fixed") as HTMLElement;
      expect(modal.textContent).toContain("Example Recipient");
      expect(modal.textContent).toContain("Example product");
      expect(modal.textContent).toContain("Example Street");
      expect(modal.textContent).not.toContain("Other product");
      expect(dfetch.mock.calls.every(([path]) => !/compute|confirm|mark-.*shipped/.test(path))).toBe(true);
      const write = vi.fn();
      const open = vi.spyOn(window, "open").mockReturnValue({ document: { write, close: vi.fn() } } as unknown as Window);
      try {
        await act(async () => { button(modal, "Print / Save PDF").click(); });
        expect(write.mock.calls[0][0]).toContain("Example product");
        expect(write.mock.calls[0][0]).toContain("window.print()");
        expect(write.mock.calls[0][0]).not.toContain("Other product");
      } finally { open.mockRestore(); }
      await act(async () => { button(modal, "Close packing slips").click(); });
      await act(async () => { button(container, "Clear").click(); });
      expect(button(container, "Print Packing Slips (0)").disabled).toBe(true);
      await act(async () => { button(container, "Select all").click(); });
      await act(async () => { button(container, "Print Packing Slips (2)").click(); });
      const bulkModal = button(container, "Print / Save PDF").closest(".fixed") as HTMLElement;
      await act(async () => { button(bulkModal, "4×6 Labels").click(); });
      expect(bulkModal.textContent).toContain("Example product");
      expect(bulkModal.textContent).toContain("Other product");
      expect(dfetch.mock.calls.every(([path]) => !/compute|confirm|mark-.*shipped/.test(path))).toBe(true);
      await act(async () => { button(bulkModal, "Close packing slips").click(); });
      await act(async () => { button(container, "Country Leg").click(); });
      expect(container.textContent).not.toContain("Print / Save PDF");
      await act(async () => { button(container, "All Orders").click(); });
      expect(button(container, "Print Packing Slips (0)").disabled).toBe(true);
    } finally {
      await act(async () => root.unmount());
    }
  });
});
