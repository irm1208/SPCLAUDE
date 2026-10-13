import { act } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

let createRoot: typeof import("react-dom/client").createRoot;
let QueryClient: typeof import("@tanstack/react-query").QueryClient;
let QueryClientProvider: typeof import("@tanstack/react-query").QueryClientProvider;
let HalfKitOffers: typeof import("../../pages/GroupBuyHalfKits").HalfKitOffers;
let useHalfKitAvailability: typeof import("../../hooks/use-half-kit-availability").useHalfKitAvailability;
let dom: JSDOM;
beforeAll(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "navigator", "location", "history", "HTMLElement", "HTMLInputElement", "Event", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  Object.defineProperty(globalThis, "addEventListener", { configurable: true, value: dom.window.addEventListener.bind(dom.window) });
  Object.defineProperty(globalThis, "removeEventListener", { configurable: true, value: dom.window.removeEventListener.bind(dom.window) });
  ({ createRoot } = await import("react-dom/client"));
  ({ QueryClient, QueryClientProvider } = await import("@tanstack/react-query"));
  ({ HalfKitOffers } = await import("../../pages/GroupBuyHalfKits"));
  ({ useHalfKitAvailability } = await import("../../hooks/use-half-kit-availability"));
});
afterAll(() => dom?.window.close());

function AvailabilityLink() {
  const { data } = useHalfKitAvailability(true);
  return (data?.counts.g1 ?? 0) > 0 ? <a data-testid="available-link" href="/group-buys/g1/half-kits">Fill half kits</a> : null;
}

describe("inline half-kit claims", () => {
  it("claims into an existing order and removes the last offer and availability link", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    let available = true;
    const group = { id: "g1", name: "Autumn GB", currency: "GBP", allowCredits: false };
    const offer = { id: "h1", productId: "p1", productName: "Ara-290 16mg", price: 30, deliveryCharge: 0, vendorShippingCharge: 0, version: 1 };
    const existing = { id: "o1", code: "12345", paymentStatus: "confirmed", amountDue: 0 };
    const requests = vi.fn(async (url: string, init?: RequestInit) => {
      let body: unknown;
      if (url.endsWith("/claim")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ orderId: "o1", version: 1, expectedCredit: 0, useCredits: false });
        available = false;
        body = { claimId: "c1", orderId: "o1", orderCode: "12345", amountDue: 30, paymentPath: "/account/orders/o1" };
      } else if (url.endsWith("/counts")) {
        body = { counts: available ? { g1: 1 } : {} };
      } else {
        body = { group, offers: available ? [offer] : [], orders: [existing], creditsBalance: 0 };
      }
      return { ok: true, status: 200, json: async () => body };
    });
    vi.stubGlobal("fetch", requests);
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const waitFor = async (check: () => void) => {
      let error: unknown;
      for (let i = 0; i < 100; i++) {
        await act(async () => { await new Promise(r => setTimeout(r, 10)); });
        try { check(); return; } catch (e) { error = e; }
      }
      throw error;
    };
    try {
      await act(async () => root.render(<QueryClientProvider client={client}><AvailabilityLink /><HalfKitOffers gbId="g1" embedded /></QueryClientProvider>));
      await waitFor(() => {
        expect(container.querySelector('[data-testid="available-link"]')).not.toBeNull();
        expect(container.querySelector('[data-testid="button-claim-h1"]')).not.toBeNull();
      });
      await act(async () => (container.querySelector('[data-testid="button-claim-h1"]') as HTMLButtonElement).click());
      await waitFor(() => expect(container.querySelector('[data-testid="button-confirm-claim"]')).not.toBeNull());
      await act(async () => (container.querySelector('[data-testid="button-confirm-claim"]') as HTMLButtonElement).click());
      await waitFor(() => {
        expect(container.querySelector('[data-testid="available-link"]')).toBeNull();
        expect(container.querySelector('[data-testid="button-claim-h1"]')).toBeNull();
        expect(container.querySelector('[data-testid="status-claim-success"]')).not.toBeNull();
        expect(container.textContent).toContain("12345");
      });
      expect(requests.mock.calls.filter(([url]) => url.endsWith("/claim"))).toHaveLength(1);
    } finally {
      await act(async () => root.unmount());
      client.clear(); container.remove(); vi.unstubAllGlobals();
    }
  });
});
