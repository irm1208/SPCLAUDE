import React from "react";
import { act } from "react";
import { beforeAll, describe, it, expect, vi } from "vitest";
// @ts-expect-error jsdom is available for tests; this workspace has no declaration package.
import { JSDOM } from "jsdom";
let createRoot: typeof import("react-dom/client").createRoot;
let ReceiptShipmentActions: typeof import("./ReceiptShipmentActions").ReceiptShipmentActions;
beforeAll(async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>");
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
  ({ createRoot } = await import("react-dom/client"));
  ({ ReceiptShipmentActions } = await import("./ReceiptShipmentActions"));
});

describe("batch receipt shipment review", () => {
  it("shows the exact parcel and excluded addition before dispatch, then targets only that order", async () => {
    const host = document.createElement("div");
    const root = createRoot(host);
    const fetcher = vi.fn(async (_path: string, _opts?: RequestInit) => new Response(JSON.stringify({ ok: true, marked: 1 })));
    const parent: any = { id: "p", code: "100", status: "Processing", paymentStatus: "confirmed", amountDue: 0,
      shippingTotal: 0, currency: "USD", lineItems: [{ productName: "HGH", quantity: 2 }],
      batches: [{ id: "one", reference: "GB / 001", kits: 2, items: [{ productName: "HGH", quantity: 2 }] }],
      relatedOrderIds: ["c"], shipmentOrderIds: ["p"], separateOrderIds: ["c"], reviewReason: null, readiness: null };
    const child = { ...parent, id: "c", code: "101", readiness: "Waiting for payment", shipmentOrderIds: ["c"],
      relatedOrderIds: ["p"], separateOrderIds: ["p"], batches: [{ ...parent.batches[0], id: "two", reference: "GB / 002" }] };
    const print = vi.fn();
    await act(async () => root.render(<ReceiptShipmentActions orders={[parent, child]} visibleOrders={[{ ...parent, telegramUsername: "test", deliveryMethod: "Post" }]}
      fetcher={fetcher} path="/dispatch/gb" onPrint={print} onUpdated={() => {}} error={null} />));
    const buttons = () => [...host.querySelectorAll("button")];
    expect(host.textContent).toContain("GB / 001");
    await act(async () => buttons().find(b => b.textContent?.includes("Review & dispatch"))!.click());
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Pack this shipment");
    expect(dialog.textContent).toContain("2 × HGH");
    expect(dialog.textContent).toContain("Not in this parcel");
    expect(dialog.textContent).toContain("101");
    expect(fetcher).not.toHaveBeenCalled();
    await act(async () => [...dialog.querySelectorAll("button")].find(b => b.textContent?.includes("Confirm shipped"))!.click());
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1]!.body as string)).toEqual({ orderIds: ["p"] });
    await act(async () => root.unmount());
  });
});
