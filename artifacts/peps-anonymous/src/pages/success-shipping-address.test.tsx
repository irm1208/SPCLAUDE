import { beforeEach, afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test/success" });
for (const key of ["window", "document", "navigator", "localStorage", "HTMLElement", "HTMLInputElement", "Element", "Node", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const state = vi.hoisted(() => ({
  loggedIn: true, loading: false,
  query: { data: null as any, isPending: false, isError: false, refetch: vi.fn() },
}));
vi.mock("@/hooks/use-account", async importOriginal => ({
  ...await importOriginal<any>(),
  useAccount: () => ({ account: state.loggedIn ? { telegramUsername: "buyer" } : null, isLoggedIn: state.loggedIn, isLoading: state.loading }),
  useAccountOrderDetail: () => state.query,
}));
vi.mock("framer-motion", async () => {
  const { createElement } = await import("react");
  return { AnimatePresence: ({ children }: any) => children, motion: {
    div: ({ initial, animate, exit, transition, ...props }: any) => createElement("div", props),
  } };
});
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { SuccessShippingAddress } = await import("./Success");
let root: ReturnType<typeof createRoot>, host: HTMLDivElement;
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  state.loggedIn = true; state.loading = false;
  Object.assign(state.query, { data: null, isPending: false, isError: false });
  host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })));
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
const render = async (receipt?: any) => {
  await act(async () => root.render(h(SuccessShippingAddress, { orderId: "order-1", deliveryMethod: "Vendor Shipping", receipt })));
};
it("shows the server-saved wholesale address instead of asking for it again", async () => {
  state.query.data = { id: "order-1", shippingName: "Test Buyer", shippingAddress: "10 Test Street, London, W1A 1AA", shippingCountry: "GB" };
  await render();
  expect(host.textContent).toContain("Test Buyer");
  expect(host.textContent).toContain("10 Test Street");
  expect(host.textContent).toContain("No need to enter it again");
  expect(host.querySelector("form")).toBeNull();
});
it("uses a matching receipt for guest checkout, but never another order's address", async () => {
  state.loggedIn = false;
  await render({ orderId: "order-1", shippingName: "Guest Buyer", shippingAddress: "Guest Street" });
  expect(host.textContent).toContain("Guest Buyer");
  expect(host.querySelector("form")).toBeNull();
  await render({ orderId: "other-order", shippingName: "Other Buyer", shippingAddress: "Other Street" });
  expect(host.textContent).not.toContain("Other Buyer");
  expect(host.querySelector("form")).not.toBeNull();
});
it("waits for the saved order and offers retry rather than a blank form after failure", async () => {
  state.query.isPending = true;
  await render();
  expect(host.querySelector("form")).toBeNull();
  expect(host.textContent).toContain("Checking your saved shipping address");
  state.query.isPending = false; state.query.isError = true;
  await render();
  expect(host.querySelector("form")).toBeNull();
  await act(async () => host.querySelector<HTMLButtonElement>("button")!.click());
  expect(state.query.refetch).toHaveBeenCalledOnce();
});
it("prefills partial details and still saves a genuinely missing address", async () => {
  state.query.data = { id: "order-1", shippingName: "Existing Buyer", shippingCountry: "GB", shippingAddress: null };
  await render();
  expect(host.querySelector<HTMLInputElement>("#ship-name")!.value).toBe("Existing Buyer");
  expect(host.querySelector<HTMLSelectElement>("#ship-country")!.value).toBe("GB");
  const input = async (id: string, value: string) => act(async () => {
    const field = host.querySelector<HTMLInputElement>(`#${id}`)!;
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(field, value);
    field.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await input("ship-street", "10 Test Street"); await input("ship-city", "London"); await input("ship-postcode", "W1A 1AA");
  await act(async () => host.querySelector("form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(fetch).toHaveBeenCalledOnce();
  expect(JSON.parse((fetch as any).mock.calls[0][1].body)).toMatchObject({ shippingName: "Existing Buyer", shippingAddress: "10 Test Street\nLondon\nW1A 1AA" });
  expect(host.querySelector("form")).toBeNull();
  expect(host.textContent).toContain("Shipping address saved");
});
it("treats an explicit missing server address as authoritative over a stale receipt", async () => {
  state.query.data = { id: "order-1", shippingName: null, shippingAddress: null };
  await render({ orderId: "order-1", shippingName: "Stale Buyer", shippingAddress: "Stale Street" });
  expect(host.querySelector("form")).not.toBeNull();
  expect(host.textContent).not.toContain("Stale Buyer");
});
it("retains order identity and checkout shipping details before clearing the draft", () => {
  const source = readFileSync(new URL("./Review.tsx", import.meta.url), "utf8");
  const receipt = source.slice(source.indexOf('localStorage.setItem("peps:lastReceipt"'));
  expect(receipt).toContain("orderId: oid");
  for (const field of ["shippingName", "shippingAddress", "shippingCountry"]) {
    expect(receipt).toContain(`${field}: data.${field} !== undefined ? data.${field}`);
  }
  expect(receipt.indexOf("shippingAddress:")).toBeLessThan(receipt.indexOf("draft.clearDraft()"));
});
