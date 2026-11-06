import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<html><body></body></html>", {
  url: "https://example.test/success?oid=credit-order",
});
for (const key of ["window", "document", "navigator", "localStorage", "HTMLElement", "Element", "Node"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const state = vi.hoisted(() => ({
  paymentProps: null as any,
  lockedUsdTotal: 2647.30,
}));
vi.mock("wouter", () => ({ useLocation: () => ["/success", vi.fn()] }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ account: { telegramUsername: "buyer" }, isLoggedIn: true, isLoading: false }),
  useAccountOrders: () => ({ data: [] }),
  useAccountOrderDetail: () => ({ data: null, isPending: false, isError: false }),
  useLogout: () => ({ mutate: vi.fn() }),
  useMyGroupBuys: () => ({ data: [], refetch: vi.fn() }),
}));
vi.mock("@/components/DashboardShell", () => ({
  DashboardShell: ({ children }: any) => children,
}));
vi.mock("@/components/PageLayout", () => ({ PageLayout: ({ children }: any) => children }));
vi.mock("@/components/SiteAnnouncements", () => ({ SiteAnnouncements: () => null }));
vi.mock("@/components/PaymentPanel", () => ({
  default: (props: any) => {
    state.paymentProps = props;
    // The payment API locks the gross USD amount. Credits must still be supplied
    // separately, even when the local receipt already contains an amountDue.
    return `Send ${(Math.max(0, state.lockedUsdTotal - (props.creditsUsd ?? 0))).toFixed(2)} USDC`;
  },
}));
vi.mock("framer-motion", async () => {
  const { createElement } = await import("react");
  return { AnimatePresence: ({ children }: any) => children, motion: new Proxy({}, {
    get: (_target, tag: string) => ({ initial, animate, exit, transition, ...props }: any) => createElement(tag, props),
  }) };
});

const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: Success } = await import("./Success");
let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
beforeEach(() => {
  localStorage.clear();
  state.paymentProps = null;
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

it.each([
  { kind: "wholesale", gross: 2647.30, credits: 90, due: 2557.30 },
  { kind: "normal", gross: 150, credits: 25, due: 125 },
  { kind: "no-credit", gross: 150, credits: 0, due: 150 },
])("deducts $kind order credits once after loading the gross crypto lock", async ({ gross, credits, due }) => {
  state.lockedUsdTotal = gross;
  localStorage.setItem("peps:lastReceipt", JSON.stringify({
    orderId: "credit-order", code: "12345", grandTotal: gross,
    amountDue: due, creditsApplied: credits, currency: "USD", lineItems: [],
  }));
  await act(async () => root.render(h(Success)));
  expect(state.paymentProps).toMatchObject({ grandTotal: gross, creditsUsd: credits });
  expect(host.textContent).toContain(`Send ${due.toFixed(2)} USDC`);
});

it("preserves gross GBP for conversion and supplies USD credits separately", async () => {
  state.lockedUsdTotal = 250;
  localStorage.setItem("peps:lastReceipt", JSON.stringify({
    orderId: "credit-order", code: "12345", grandTotal: 200,
    amountDue: 175, creditsApplied: 25, currency: "GBP", lineItems: [],
  }));
  await act(async () => root.render(h(Success)));
  expect(state.paymentProps).toMatchObject({ grandTotal: 200, creditsUsd: 25, currency: "GBP" });
  expect(host.textContent).toContain("Send 225.00 USDC");
});

it("does not request another payment when credits cover the entire order", async () => {
  localStorage.setItem("peps:lastReceipt", JSON.stringify({
    orderId: "credit-order", code: "12345", grandTotal: 90,
    amountDue: 0, creditsApplied: 90, currency: "USD", lineItems: [],
  }));
  await act(async () => root.render(h(Success)));
  expect(state.paymentProps).toBeNull();
});
