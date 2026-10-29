import React, { act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: vi.fn(), navigate: vi.fn(), invalidate: vi.fn(), draft: {} as Record<string, unknown> }));
vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.query,
  useQueryClient: () => ({ invalidateQueries: mocks.invalidate }),
}));
vi.mock("wouter", () => ({ useLocation: () => ["/review", mocks.navigate] }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/use-draft-store", () => ({ useDraftStore: () => mocks.draft }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ account: null, isLoggedIn: false, isLoading: false }),
  useMyGroupBuys: () => ({ data: [{ id: "hgh", name: "HGH", currency: "USD", paymentsEnabled: true }] }),
  useAccountOrders: () => ({ data: [] }),
  useCountryLegs: () => ({ data: [] }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock("@workspace/api-client-react", () => ({ useUpdateOrder: () => ({ mutateAsync: vi.fn(), isPending: false }) }));
vi.mock("@/hooks/use-sidebar-expanded", () => ({ useSidebarExpanded: () => false }));
vi.mock("@/components/PageLayout", () => ({ PageLayout: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/HubBottomNav", () => ({ HubBottomNav: () => null }));
vi.mock("@/components/DashboardShell", () => ({ DashboardShell: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/components/SiteAnnouncements", () => ({ SiteAnnouncements: () => null }));
vi.mock("@/components/RulesetModal", () => ({ RulesetModal: () => null }));

const realDraft = await vi.importActual<typeof import("@/hooks/use-draft-store")>("@/hooks/use-draft-store");
const { default: Review } = await import("./Review");
const options = [{ id: "us", label: "US Shipping", country: "US", price: 12, requiresAddress: true }];
const loaded = { data: options, isPending: false, isError: false, refetch: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.draft = { ...realDraft.useDraftStore.getState(), groupBuyId: "hgh", deliveryMethodId: "us",
    deliveryMethod: "US Shipping", shippingCountry: "United States", shippingName: "Test Member",
    shippingAddress: "123 Example Street", telegramUsername: "synthetic-review",
    lineItems: [{ id: "line", productId: "product", productName: "HGH 36IU", quantity: 1, unitPrice: 150, lineTotal: 150 }] };
  mocks.query.mockReturnValue(loaded);
});
afterEach(() => vi.unstubAllGlobals());

function render() {
  return new JSDOM(renderToStaticMarkup(<Review />));
}

it("shows the actual US address editor on review using the configured courier requirement", () => {
  const dom = render();
  const doc = dom.window.document;
  expect(doc.querySelector("#review-shipping-name")?.getAttribute("required")).not.toBeNull();
  expect(doc.querySelector("#review-shipping-address")?.textContent).toBe("123 Example Street");
  expect(doc.querySelector("#review-shipping-country")?.getAttribute("value")).toBe("United States");
  expect(doc.querySelector("#review-shipping-country")?.hasAttribute("readonly")).toBe(true);
  expect(doc.querySelector("#review-shipping-phone")?.hasAttribute("required")).toBe(false);
  expect(doc.body.textContent).not.toContain("Delivery Address");
  dom.window.close();
});

it.each(["label", "top-up"])("does not add an address editor to %s delivery", kind => {
  if (kind === "label") mocks.query.mockReturnValue({ ...loaded, data: [{ ...options[0], requiresAddress: false, requiresQrCode: true }] });
  else mocks.draft.additionOfOrderId = "parent";
  const dom = render();
  expect(dom.window.document.querySelector("#review-shipping-address")).toBeNull();
  dom.window.close();
});

it.each(["loading", "error"])("blocks placing an order while delivery requirements are %s", state => {
  mocks.query.mockReturnValue({ ...loaded, data: undefined, isPending: state === "loading", isError: state === "error",
    error: new Error("Could not load delivery requirements.") });
  const dom = render();
  const doc = dom.window.document;
  const submit = [...doc.querySelectorAll("button")].find(button => button.textContent?.includes("Place Order"));
  expect(submit?.hasAttribute("disabled")).toBe(true);
  expect(doc.querySelector(state === "loading" ? '[role="status"]' : '[role="alert"]')).not.toBeNull();
  if (state === "error") expect(doc.body.textContent).toContain("Retry loading delivery details");
  dom.window.close();
});

it("loads fresh group-buy options for the selected country and fails explicitly on request errors", async () => {
  const dom = render();
  dom.window.close();
  const query = mocks.query.mock.calls.find(([query]) => query.queryKey[0] === "review-shipping-options")![0];
  const signal = new AbortController().signal;
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => [{ id: "hgh", shippingOptions: options }] });
  vi.stubGlobal("fetch", fetcher);
  expect(await query.queryFn({ signal })).toEqual(options);
  expect(fetcher).toHaveBeenCalledWith("/api/group-buys?shippingCountry=United%20States", { credentials: "include", signal });
  fetcher.mockResolvedValue({ ok: false });
  await expect(query.queryFn({ signal })).rejects.toThrow(/Could not load/);
});

it.each([
  ["separate", "These items will form a separate order with its own payment"],
  ["merged", "These items will be added to your original order"],
] as const)("explains the %s addition outcome without changing included delivery", (outcome, message) => {
  mocks.draft.additionOfOrderId = "parent-order";
  mocks.query.mockImplementation(query => query.queryKey[0] === "addition-eligibility"
    ? { data: { additionOutcome: outcome }, isPending: false, isError: false } : loaded);
  const dom = render();
  expect(dom.window.document.body.textContent).toContain(message);
  expect(dom.window.document.body.textContent).toContain("Delivery remains included");
  expect(dom.window.document.body.textContent).toContain("original order's address");
  dom.window.close();
});

it.each(["separate", "merged"] as const)("submits an addition and uses the server's %s receipt and destination", async outcome => {
  const browser = new JSDOM('<div id="root"></div>', { url: "https://synthetic.test/review" });
  Object.defineProperty(browser.window, "matchMedia", { value: () => ({
    matches: false, addEventListener() {}, removeEventListener() {},
  }) });
  vi.stubGlobal("window", browser.window);
  vi.stubGlobal("document", browser.window.document);
  vi.stubGlobal("navigator", browser.window.navigator);
  vi.stubGlobal("localStorage", browser.window.localStorage);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const clearDraft = vi.fn();
  mocks.draft = { ...mocks.draft, additionOfOrderId: "parent-order", ensureAdditionRequestId: () => "stable-submission-id", clearDraft };
  mocks.query.mockImplementation(query => query.queryKey[0] === "addition-eligibility"
    ? { data: { additionOutcome: outcome } } : loaded);
  const response = { id: outcome === "separate" ? "child-order" : "parent-order", code: "server-code",
    additionOutcome: outcome, mergedIntoExistingOrder: outcome === "merged",
    grandTotal: 20, productSubtotal: 20, creditsApplied: 5, amountDue: outcome === "merged" ? 15 : 0,
    deliveryPrice: 0, vendorShipping: 0, vendorShippingIsTbd: false, groupBuyId: "hgh",
    shippingAddress: "Server parent address", lineItems: [{ productName: "Canonical", quantity: 2, unitPrice: 10, lineTotal: 20 }] };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => response });
  vi.stubGlobal("fetch", fetcher);
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(browser.window.document.getElementById("root")!);
  try {
    await act(async () => { root.render(<Review />); });
    const buttons = browser.window.document.querySelectorAll("button") as NodeListOf<HTMLButtonElement>;
    const button = Array.from(buttons).find(button => button.textContent?.includes("Add to Order"))!;
    expect(button).toBeDefined();
    await act(async () => { button.click(); });
    expect(mocks.navigate).toHaveBeenCalledWith(`/account/orders/${response.id}`);
    const body = JSON.parse(fetcher.mock.calls.find(([url]) => url === "/api/orders")![1].body);
    expect(body).toMatchObject({ additionOfOrderId: "parent-order", additionRequestId: "stable-submission-id" });
    expect(clearDraft).toHaveBeenCalledOnce();
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["account", "orders"] });
    expect(mocks.invalidate).toHaveBeenCalledWith({ queryKey: ["account", "me"] });
    const receipt = browser.window.localStorage.getItem("peps:lastReceipt");
    if (outcome === "separate") {
      expect(JSON.parse(receipt!)).toMatchObject({ orderId: "child-order", code: "server-code",
        grandTotal: 20, productSubtotal: 20, creditsApplied: 5, amountDue: 15,
        shippingAddress: "Server parent address", vendorShippingIsTbd: false,
        lineItems: [{ productName: "Canonical", quantity: 2, unitPrice: 10, lineTotal: 20 }] });
    } else expect(receipt).toBeNull();
  } finally {
    await act(async () => root.unmount());
    browser.window.close();
  }
});
