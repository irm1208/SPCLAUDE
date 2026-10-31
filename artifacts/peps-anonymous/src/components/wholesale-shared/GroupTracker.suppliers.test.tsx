// @ts-expect-error The existing test harness provides jsdom without its declaration package.
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import type { WholesaleShareDetail } from "@/hooks/use-wholesale-shares";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { GroupTracker } = await import("./GroupTracker");

it("separates each member's items by supplier without changing their status or totals", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const share = {
    status: "open", currentUsername: "member", delivery: {},
    settings: { availableVendors: [{ id: "u", name: "Uther" }, { id: "j", name: "JBG/YT" }] },
    members: [{
      username: "member", isYou: true, kits: 3, subtotal: 170, tip: 0, isConfirmed: false,
      items: [
        { productId: "u1", productName: "Retatrutide", vendorId: "u", vendorName: "Uther", quantity: 1, unitPrice: 70 },
        { productId: "j1", productName: "Retatrutide", vendorId: "j", vendorName: "JBG/YT", quantity: 2, unitPrice: 50 },
      ],
    }],
  } as unknown as WholesaleShareDetail;
  try {
    await React.act(async () => root.render(<GroupTracker share={share} showItems onPayMember={() => {}} />));
    expect(container.querySelector('[data-vendor-items="u"]')?.textContent).toContain("Uther");
    expect(container.querySelector('[data-vendor-items="u"]')?.textContent).toContain("$70.00");
    expect(container.querySelector('[data-vendor-items="j"]')?.textContent).toContain("JBG/YT");
    expect(container.querySelector('[data-vendor-items="j"]')?.textContent).toContain("$100.00");
    expect(container.textContent).toContain("Awaiting confirmation");
    expect(container.textContent).toContain("$170.00");
  } finally {
    await React.act(async () => root.unmount());
    container.remove();
  }
});
