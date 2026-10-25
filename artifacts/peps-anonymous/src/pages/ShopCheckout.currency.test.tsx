import React, { act } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
// @ts-expect-error This workspace installs jsdom without its optional type declarations.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";

vi.mock("@/components/PageLayout", () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ account: { telegramUsername: "buyer" } }) }));
vi.mock("wouter", () => ({ useLocation: () => ["/shop/checkout", vi.fn()] }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  const tags = new Map();
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy({}, { get: (_target, tag: string) => {
      if (!tags.has(tag)) tags.set(tag, ({ children, initial, animate, exit, transition, whileHover, whileTap, ...props }: any) =>
        React.createElement(tag, props, children));
      return tags.get(tag);
    } }),
  };
});

let createRoot: typeof import("react-dom/client").createRoot;
let ShopCheckout: typeof import("./ShopCheckout").default;
let CartDrawer: typeof import("../components/CartDrawer").CartDrawer;
let SellerTelegramSettings: typeof import("../components/SellerTelegramSettings").SellerTelegramSettings;
let cart: typeof import("../hooks/use-vial-cart").useVialCart;
let root: Root | undefined;
let dom: JSDOM;
const response = (body: unknown, ok = true) => new Response(JSON.stringify(body), { status: ok ? 200 : 422, headers: { "Content-Type": "application/json" } });
async function settle() { await act(async () => { await new Promise(r => setTimeout(r, 0)); }); }
async function click(text: string) {
  const button = [...document.querySelectorAll("button")].find(b => b.textContent?.includes(text));
  expect(button, text).toBeTruthy();
  await act(async () => button!.click());
  await settle();
}

describe("vial shop currency UI", () => {
  beforeAll(async () => {
    dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/shop/checkout" });
    for (const name of ["window", "document", "navigator", "location", "history", "localStorage", "HTMLElement", "HTMLInputElement", "HTMLButtonElement", "Event", "Node"]) {
      Object.defineProperty(globalThis, name, { configurable: true, value: (dom.window as any)[name] });
    }
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    createRoot = (await import("react-dom/client")).createRoot;
    ShopCheckout = (await import("./ShopCheckout")).default;
    CartDrawer = (await import("../components/CartDrawer")).CartDrawer;
    SellerTelegramSettings = (await import("../components/SellerTelegramSettings")).SellerTelegramSettings;
    cart = (await import("../hooks/use-vial-cart")).useVialCart;
  });
  afterEach(() => {
    act(() => root?.unmount());
    root = undefined;
    cart.getState().clearCart();
    vi.unstubAllGlobals();
  });
  afterAll(() => dom.window.close());

  async function render(element: React.ReactNode) {
    document.body.innerHTML = "<div id='test-root'></div>";
    root = createRoot(document.getElementById("test-root")!);
    await act(async () => root!.render(element));
    await settle();
  }
  function seed() {
    cart.getState().clearCart();
    cart.getState().addItem({ id: "p", name: "KLOW 80mg", price: 16, stock: 5, currency: "GBP" });
  }
  it("keeps pounds in the basket drawer", async () => {
    seed(); cart.getState().setCartOpen(true);
    await render(<CartDrawer />);
    expect(document.body.textContent).toContain("£16.00");
    expect(document.body.textContent).not.toContain("$16.00");
    expect(document.body.textContent).not.toContain("16.00 USDT");
  });
  it("keeps pounds through review/details and shows the server's separate converted crypto amount", async () => {
    seed();
    const fetchMock = vi.fn().mockResolvedValue(response({
      id: "order", code: "LV-TEST", currency: "GBP", total: 16, subtotal: 16,
      paymentUsdAmount: 20.8, paymentCurrency: "USDT", discountAmount: 0,
      discountCodeUsed: null, orderStatus: "accepted", paymentStatus: "unpaid",
      walletAddress: `0x${"1".repeat(40)}`,
      items: [{ productName: "KLOW 80mg", quantity: 1, unitPrice: 16, lineTotal: 16 }],
    }));
    vi.stubGlobal("fetch", fetchMock);
    await render(<ShopCheckout />);
    expect(document.body.textContent).toContain("£16.00");
    expect(document.body.textContent).not.toContain("$16.00");
    await click("Continue to Details");
    expect(document.body.textContent).toContain("£16.00");
    await click("Place Order");
    expect(fetchMock).toHaveBeenCalledWith("/api/vial/checkout", expect.objectContaining({
      body: expect.stringContaining('"productId":"p"'),
    }));
    expect(document.body.textContent).toContain("Order total: £16.00");
    expect(document.body.textContent).toContain("20.80");
    expect(document.body.textContent).toContain("USDT");
    expect(document.body.textContent).not.toContain("$16.00");
  });
  it("shows a failed Telegram test rather than a false success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: "Start the bot first" }, false)));
    await render(<SellerTelegramSettings chatId="123" savedChatId="123" enabled headers={{}}
      onChatId={() => {}} onEnabled={() => {}} />);
    await click("Send test notification");
    expect(document.body.textContent).toContain("Start the bot first");
    expect(document.body.textContent).not.toContain("Test message sent");
  });
});
