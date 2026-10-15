import { act } from "react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { MemberOffersResponse } from "../../lib/half-kit-api";
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
  for (const key of ["window", "document", "navigator", "location", "history", "localStorage", "HTMLElement", "HTMLInputElement", "Event", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  Object.defineProperty(globalThis, "addEventListener", { configurable: true, value: dom.window.addEventListener.bind(dom.window) });
  Object.defineProperty(globalThis, "removeEventListener", { configurable: true, value: dom.window.removeEventListener.bind(dom.window) });
  Object.defineProperty(globalThis, "dispatchEvent", { configurable: true, value: dom.window.dispatchEvent.bind(dom.window) });
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
  it("starts a normal new-order checkout without prematurely taking an orderless member's half kit", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    const data: MemberOffersResponse = {
      group: { id: "g1", name: "Autumn GB", currency: "USDT", allowCredits: true },
      offers: [
        { id: "h1", productId: "p1", productName: "Ara-290 16mg", price: 30, deliveryCharge: 4, vendorShippingCharge: 7, version: 2 },
        { id: "h2", productId: "p2", productName: "CJC-1295 10mg", price: 40, deliveryCharge: 4, vendorShippingCharge: 7, version: 1 },
      ],
      orders: [], creditsBalance: 20,
    };
    const originalFetch = globalThis.fetch;
    const fetcher = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) => ({ ok: true, json: async () => data } as Response));
    globalThis.fetch = fetcher;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: Infinity } } });
    client.setQueryData(["member-half-kits", "g1"], data);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const { useDraftStore } = await import("../../hooks/use-draft-store");
    try {
      useDraftStore.getState().setTelegramUsername("member");
      await act(async () => root.render(<QueryClientProvider client={client}><HalfKitOffers gbId="g1" embedded /></QueryClientProvider>));
      const button = container.querySelector('button[aria-label="Add Ara-290 16mg half kit to my order"]') as HTMLButtonElement;
      expect(button.disabled).toBe(false);
      await act(async () => button.click());
      const state = useDraftStore.getState();
      expect(state.groupBuyId).toBe("g1");
      expect(state.telegramUsername).toBe("member");
      expect(state.halfKitCheckout).toMatchObject({ offerId: "h1", productId: "p1", version: 2, price: 30 });
      expect(state.lineItems).toMatchObject([{ productId: "p1", quantity: 0.5, unitPrice: 60, lineTotal: 30 }]);
      expect(state.deliveryPrice).toBe(0);
      expect(state.vendorShipping).toBe(0); // checkout resolves NORMAL shipping, not offer supplements 4 + 7
      expect(window.location.pathname + window.location.search).toBe("/order?gbId=g1");
      expect(fetcher.mock.calls.every(args => !String(args[0]).includes("/claim"))).toBe(true);
      // Controls in the existing cart drawer cannot accidentally turn this into a full-kit order.
      state.updateLineItem(state.lineItems[0].id, { quantity: 2 });
      state.removeLineItem(state.lineItems[0].id);
      state.addLineItem();
      expect(useDraftStore.getState().lineItems).toHaveLength(1);
      expect(useDraftStore.getState().lineItems[0].quantity).toBe(0.5);
      await act(async () => (container.querySelector('[data-testid="button-claim-h2"]') as HTMLButtonElement).click());
      expect(useDraftStore.getState().lineItems).toMatchObject([
        { productId: "p1", quantity: 0.5, lineTotal: 30 }, { productId: "p2", quantity: 0.5, lineTotal: 40 },
      ]);
      expect(useDraftStore.getState().halfKitCheckout?.additionalOffers).toMatchObject([{ offerId: "h2", price: 40 }]);
      expect((container.querySelector('[data-testid="button-claim-h1"]') as HTMLButtonElement).disabled).toBe(true);
      expect((container.querySelector('[data-testid="button-claim-h2"]') as HTMLButtonElement).disabled).toBe(true);
      expect(useDraftStore.getState().deliveryPrice).toBe(0);
      state.clearDraft();
      expect(useDraftStore.getState().halfKitCheckout).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove(); client.clear(); globalThis.fetch = originalFetch;
      window.history.replaceState(null, "", "/");
    }
  });
  it("keeps the timed unavailable message visible after the taken offer disappears", async () => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    let taken = false;
    const data = {
      group: { id: "g1", name: "Autumn GB", currency: "GBP", allowCredits: false },
      offers: [{ id: "h1", productId: "p1", productName: "Ara-290 16mg", price: 30, deliveryCharge: 0, vendorShippingCharge: 0, version: 1 }],
      orders: [{ id: "o1", code: "12345", paymentStatus: "confirmed", amountDue: 0 }],
      creditsBalance: 0,
    };
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.endsWith("/claim")) {
        taken = true;
        return { ok: false, status: 409, json: async () => ({ error: "Sorry, this half kit was taken 2 seconds ago.", code: "HALF_KIT_TAKEN" }) };
      }
      return { ok: true, status: 200, json: async () => ({ ...data, offers: taken ? [] : data.offers }) };
    }));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
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
      await act(async () => root.render(<QueryClientProvider client={client}><HalfKitOffers gbId="g1" embedded /></QueryClientProvider>));
      await waitFor(() => expect(container.querySelector('[data-testid="button-claim-h1"]')).not.toBeNull());
      const section = container.querySelector("details") as HTMLDetailsElement;
      expect(section.open).toBe(false);
      await act(async () => (container.querySelector('[data-testid="toggle-half-kit-offers"]') as HTMLElement).click());
      expect(section.open).toBe(true);
      await act(async () => (container.querySelector('[data-testid="toggle-half-kit-offers"]') as HTMLElement).click());
      expect(section.open).toBe(false);
      await act(async () => (container.querySelector('[data-testid="toggle-half-kit-offers"]') as HTMLElement).click());
      await act(async () => (container.querySelector('[data-testid="button-claim-h1"]') as HTMLButtonElement).click());
      await waitFor(() => expect(container.querySelector('[data-testid="button-confirm-claim"]')).not.toBeNull());
      await act(async () => (container.querySelector('[data-testid="button-confirm-claim"]') as HTMLButtonElement).click());
      await waitFor(() => {
        expect(container.querySelector('[role="dialog"] [role="alert"]')?.textContent).toContain("Sorry, this half kit was taken 2 seconds ago.");
        expect(container.querySelector('[data-testid="button-confirm-claim"]')).toBeNull();
        expect(container.querySelector('[data-testid="button-claim-h1"]')).toBeNull();
        expect(container.querySelector('[data-testid="button-cancel-claim"]')?.textContent).toBe("Close");
      });
    } finally {
      await act(async () => root.unmount());
      client.clear(); container.remove(); vi.unstubAllGlobals();
    }
  });
  it.each([
    { label: "removes the last half and availability link", failRefresh: false, hasOther: false },
    { label: "removes the last half even when the refresh fails", failRefresh: true, hasOther: false },
    { label: "removes only the claimed half and keeps other offers available", failRefresh: false, hasOther: true },
  ])("$label", async ({ failRefresh, hasOther }) => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    let available = true;
    const group = { id: "g1", name: "Autumn GB", currency: "GBP", allowCredits: false };
    const offer = { id: "h1", productId: "p1", productName: "Ara-290 16mg", price: 30, deliveryCharge: 0, vendorShippingCharge: 0, version: 1 };
    const remainingOffers = hasOther ? [{ ...offer, id: "h2", productId: "p2", productName: "CJC-1295 10mg" }] : [];
    const existing = { id: "o1", code: "12345", paymentStatus: "confirmed", amountDue: 0 };
    const requests = vi.fn(async (url: string, init?: RequestInit) => {
      let body: unknown;
      if (url.endsWith("/claim")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({ orderId: "o1", version: 1, expectedCredit: 0, useCredits: false });
        available = false;
        body = { claimId: "c1", orderId: "o1", orderCode: "12345", amountDue: 30, paymentPath: "/account/orders/o1" };
      } else if (url.endsWith("/counts")) {
        if (!available && failRefresh) throw new Error("Refresh temporarily unavailable");
        body = { counts: available ? { g1: 1 + remainingOffers.length } : hasOther ? { g1: 1 } : {} };
      } else {
        if (!available && failRefresh) throw new Error("Refresh temporarily unavailable");
        body = { group, offers: available ? [offer, ...remainingOffers] : remainingOffers, orders: [existing], creditsBalance: 0 };
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
        expect(client.getQueryData<MemberOffersResponse>(["member-half-kits", "g1"])?.offers).toEqual(remainingOffers);
        if (hasOther) {
          expect(container.querySelector('[data-testid="available-link"]')).not.toBeNull();
          expect(container.querySelector('[data-testid="button-claim-h2"]')).not.toBeNull();
        } else {
          expect(container.querySelector('[data-testid="available-link"]')).toBeNull();
        }
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
