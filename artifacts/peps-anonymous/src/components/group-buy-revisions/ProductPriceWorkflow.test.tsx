import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace harness without declarations.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "Event", "MouseEvent", "Node", "location", "history"])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
vi.mock("../GroupBuyProductLabReports", () => ({ GroupBuyProductLabReports: () => null }));
const React = await import("react");
(globalThis as any).React = React;
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { default: V2Products } = await import("../../pages/organiser-v2/GbProductsTab");
const { organiserApi } = await import("../../pages/organiser-v2/api/organiser-api");
const { ProductsTab } = await import("../../pages/GbOrganiser");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, sent: any;
const product = { id: "own", name: "Own product", price: 50, vendor: "Synthetic", mgSize: "10mg", stock: 10, active: true };
const items = [{ id: "line", productId: "own", productName: product.name, quantity: 2, unitPrice: 50, lineTotal: 100 }];
const view = { enabled: true, eligible: true, products: [product], requests: [], orders: [
  { id: "order", code: "123", telegramUsername: "member", currency: "USD", grandTotal: 100, eligible: true, items },
  { id: "paid", code: "124", telegramUsername: "paid", currency: "USD", grandTotal: 100, eligible: false, ineligibleReason: "Already paid", items },
] };
beforeEach(() => {
  sent = undefined;
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  vi.spyOn(organiserApi, "products").mockResolvedValue([product]);
  vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (init?.method === "POST") { sent = JSON.parse(String(init.body)); return Response.json({ created: 1 }); }
    if (url.endsWith("/order-revisions")) return Response.json(view);
    if (url.endsWith("/products")) return Response.json([product]);
    if (url.endsWith("/organiser/me")) return Response.json({});
    return Response.json([]);
  }));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
async function render(v2: boolean, groupId = "group") {
  await act(async () => root.render(v2 ? h(V2Products, { selectedGbId: groupId, currency: "USD" })
    : h(ProductsTab, { gb: { id: groupId, name: "Synthetic", currency: "USD" } as any })));
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
}
async function click(selector: string) {
  await act(async () => (host.querySelector(selector) as HTMLElement).click());
}
async function input(selector: string, value: string) {
  const el = host.querySelector(selector) as HTMLInputElement;
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}
it.each([true, false])("stages manual product prices and sends only unpaid orders in dashboard V2=%s", async v2 => {
  await render(v2);
  expect(host.textContent).not.toContain("Order change requests");
  expect(host.querySelector('[data-testid="input-revision-message"]')).toBeNull();
  expect(host.querySelector('[data-testid="product-new-price-own"]')).not.toBeNull();
  await input('[data-testid="product-new-price-own"]', "40");
  expect(sent).toBeUndefined();
  await click('[data-testid="review-product-prices"]');
  expect((host.querySelector('[data-testid="input-quantity-line"]') as HTMLInputElement).value).toBe("2");
  await input('[data-testid="input-revision-message"]', "Supplier negotiated a lower price");
  await act(async () => host.querySelector('[data-testid="button-send-revision"]')!.closest("form")!.dispatchEvent(new window.Event("submit", { bubbles: true, cancelable: true })));
  expect(sent.changes).toEqual([{ orderId: "order", items: [{ id: "line", quantity: 2, unitPrice: 40 }] }]);
  expect(host.querySelector('[data-testid="input-revision-message"]')).toBeNull();
});
it.each([true, false])("opens review on demand and closes it without losing staged prices in dashboard V2=%s", async v2 => {
  await render(v2);
  expect(host.querySelector('[data-testid="price-update-csv"]')).not.toBeNull();
  await input('[data-testid="product-new-price-own"]', "40");
  expect(host.querySelector('[data-testid="input-revision-message"]')).toBeNull();
  await click('[data-testid="review-product-prices"]');
  expect(host.querySelector('[data-testid="input-revision-message"]')).not.toBeNull();
  await click('[data-testid="close-price-review"]');
  expect(host.querySelector('[data-testid="input-revision-message"]')).toBeNull();
  expect((host.querySelector('[data-testid="product-new-price-own"]') as HTMLInputElement).value).toBe("40");
  await click('[data-testid="review-product-prices"]');
  expect(host.querySelector('[data-testid="input-revision-message"]')).not.toBeNull();
  expect(sent).toBeUndefined();
});
it.each([true, false])("previews CSV without writes and clears drafts on group switch in dashboard V2=%s", async v2 => {
  await render(v2);
  const fileInput = host.querySelector('[data-testid="price-update-csv"]') as HTMLInputElement;
  Object.defineProperty(fileInput, "files", { configurable: true, value: [{
    size: 100, text: async () => "Product ID,New price\nown,35",
  }] });
  await act(async () => fileInput.dispatchEvent(new window.Event("change", { bubbles: true })));
  expect(host.textContent).toContain("35.00");
  expect((host.querySelector('[data-testid="product-new-price-own"]') as HTMLInputElement).value).toBe("");
  const stageButton = [...host.querySelectorAll("button")].find(b => b.textContent === "Stage 1 proposed prices")!;
  await act(async () => stageButton.click());
  expect((host.querySelector('[data-testid="product-new-price-own"]') as HTMLInputElement).value).toBe("35");
  expect(sent).toBeUndefined();
  await render(v2, "other-group");
  expect((host.querySelector('[data-testid="product-new-price-own"]') as HTMLInputElement).value).toBe("");
});
it("requires another review if a product price changes after review", async () => {
  await render(true);
  await input('[data-testid="product-new-price-own"]', "40");
  await click('[data-testid="review-product-prices"]');
  await input('[data-testid="input-revision-message"]', "Updated supplier prices");
  await input('[data-testid="product-new-price-own"]', "30");
  expect((host.querySelector('[data-testid="button-send-revision"]') as HTMLButtonElement).disabled).toBe(true);
  expect(host.textContent).toContain("New prices changed after review");
});
it("does not stage a partially invalid CSV or create duplicate products", async () => {
  await render(true);
  const el = host.querySelector('[data-testid="price-update-csv"]') as HTMLInputElement;
  Object.defineProperty(el, "files", { configurable: true, value: [{
    size: 100, text: async () => "Product ID,New price\nown,35\nforeign,40",
  }] });
  await act(async () => el.dispatchEvent(new window.Event("change", { bubbles: true })));
  expect(host.textContent).toContain("Row 3");
  const stageButton = [...host.querySelectorAll("button")].find(b => b.textContent === "Stage 1 proposed prices")!;
  expect(stageButton.disabled).toBe(true);
  expect(sent).toBeUndefined();
});
