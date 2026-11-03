import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "Event", "MouseEvent"])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
(globalThis as any).React = React;
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { MemberOrderRevision } = await import("./MemberOrderRevision");
const { OrganiserOrderRevisions } = await import("./OrganiserOrderRevisions");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const items = [
  { id: "own-line", productId: "own", productName: "Own stock", quantity: 2, unitPrice: 50, lineTotal: 100 },
  { id: "shared-line", productId: "shared", productName: "Shared catalogue", quantity: 1, unitPrice: 20, lineTotal: 20 },
];
const request = { id: "r", orderId: "o", orderCode: "123", member: "member", status: "pending", message: "Updated price",
  createdAt: new Date().toISOString(), before: { items, grandTotal: 1200 },
  proposal: { items: [{ ...items[0], unitPrice: 40, lineTotal: 80 }, items[1]], grandTotal: 1180 },
  currency: "USD", eligible: true, ineligibleReason: null };
const view = { enabled: true, eligible: true, products: [{ id: "own", name: "Own stock" }], requests: [],
  orders: [
    { id: "o", code: "123", telegramUsername: "member", currency: "USD", grandTotal: 120, eligible: true, ineligibleReason: null, items },
    { id: "paid", code: "124", telegramUsername: "paid-member", currency: "USD", grandTotal: 120, eligible: false, ineligibleReason: "Already paid", items: [] },
  ] };
beforeEach(() => { host = document.createElement("div"); document.body.append(host); root = createRoot(host); });
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function render(component: any, props: any) {
  await act(async () => root.render(h(component, props)));
  await act(async () => { await new Promise(r => setTimeout(r, 15)); });
}
async function click(selector: string) {
  await act(async () => (host.querySelector(selector) as HTMLElement).click());
  await act(async () => { await new Promise(r => setTimeout(r, 10)); });
}
async function change(selector: string, value: string) {
  const element = host.querySelector(selector) as HTMLInputElement;
  const prototype = element.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype
    : element.tagName === "SELECT" ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
    element.dispatchEvent(new window.Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
it("hides controls for unrelated groups and members without requests", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ ...view, eligible: false })));
  await render(OrganiserOrderRevisions, { groupBuyId: "g" });
  expect(host.textContent).toBe("");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: false, requests: [] })));
  await render(MemberOrderRevision, { orderId: "o" });
  expect(host.textContent).toBe("");
});
it("keeps the organiser workflow opt-in and posts only the toggle", async () => {
  let enabled = false;
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "PUT") { enabled = JSON.parse(String(init.body)).enabled; return Response.json({ enabled }); }
    return Response.json({ ...view, enabled });
  });
  vi.stubGlobal("fetch", fetcher);
  await render(OrganiserOrderRevisions, { groupBuyId: "g" });
  expect(host.querySelector('[data-testid="input-unit-price-own-line"]')).toBeNull();
  await click('[data-testid="toggle-order-revisions"]');
  expect(enabled).toBe(true);
  expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
});
it("keeps non-owned lines read-only and excludes paid orders", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(view)));
  await render(OrganiserOrderRevisions, { groupBuyId: "g" });
  await click('[data-testid="select-order-o"]');
  expect((host.querySelector('[data-testid="input-unit-price-shared-line"]') as HTMLInputElement).disabled).toBe(true);
  expect((host.querySelector('[data-testid="input-unit-price-own-line"]') as HTMLInputElement).disabled).toBe(false);
  expect(host.querySelector('[data-testid="select-order-paid"]')).toBeNull();
  expect(host.textContent).toContain("Already paid");
  expect((host.querySelector('[data-testid="input-quantity-own-line"]') as HTMLInputElement).step).toBe("0.5");
});
it("shows before/after amounts with thousands and sends an explicit accept decision", async () => {
  let status = "pending";
  const changed = vi.fn();
  const fetcher = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") { status = JSON.parse(String(init.body)).decision; return Response.json({ status }); }
    return Response.json({ enabled: true, requests: [{ ...request, status }] });
  });
  vi.stubGlobal("fetch", fetcher);
  await render(MemberOrderRevision, { orderId: "o", onChanged: changed });
  expect(host.textContent).toContain("1,200.00");
  expect(host.textContent).toContain("1,180.00");
  await click('[data-testid="button-accept-r"]');
  expect(status).toBe("accepted");
  expect(changed).toHaveBeenCalledOnce();
  expect(fetcher.mock.calls.some(([url]) => url === "/api/orders/o/order-revisions/r/decision")).toBe(true);
});
it("prevents acceptance after payment or disabling while retaining decline", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ enabled: false,
    requests: [{ ...request, eligible: false, ineligibleReason: "Order already paid" }] })));
  await render(MemberOrderRevision, { orderId: "o" });
  expect((host.querySelector('[data-testid="button-accept-r"]') as HTMLButtonElement).disabled).toBe(true);
  expect((host.querySelector('[data-testid="button-decline-r"]') as HTMLButtonElement).disabled).toBe(false);
});
it("keeps server errors visible and does not report acceptance on conflict", async () => {
  const changed = vi.fn();
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => init?.method === "POST"
    ? Response.json({ error: "Order has already been paid." }, { status: 409 })
    : Response.json({ enabled: true, requests: [request] })));
  await render(MemberOrderRevision, { orderId: "o", onChanged: changed });
  await click('[data-testid="button-accept-r"]');
  expect(host.textContent).toContain("Order has already been paid.");
  expect(changed).not.toHaveBeenCalled();
});
it("bulk pricing submits all original lines but changes only selected own-stock orders", async () => {
  let submitted: any;
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") { submitted = JSON.parse(String(init.body)); return Response.json({ created: 1 }); }
    return Response.json(view);
  }));
  await render(OrganiserOrderRevisions, { groupBuyId: "g" });
  await click('[data-testid="select-order-o"]');
  await change('[data-testid="select-bulk-product"]', "own");
  await change('[data-testid="input-bulk-price"]', "40");
  await click('[data-testid="button-apply-bulk"]');
  await change('[data-testid="input-revision-message"]', "Correcting our product price");
  await act(async () => host.querySelector("form")!.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
  expect(submitted?.changes).toEqual([{ orderId: "o", items: [
    { id: "own-line", quantity: 2, unitPrice: 40 }, { id: "shared-line", quantity: 1, unitPrice: 20 },
  ] }]);
});
