import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace test harness.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";
import type { SetupDraftSnapshot } from "./setup-draft";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
  vi.stubGlobal(name, name === "window" ? dom.window : dom.window[name]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { SetupDraftProvider } = await import("./setup-draft-context");
const { buildSetupPayload } = await import("./setup-draft");
const steps = await Promise.all([
  import("./steps/BasicsStep"), import("./steps/ProductsStep"), import("./steps/ShippingStep"),
  import("./steps/PaymentsStep"), import("./steps/AccessStep"), import("./steps/RulesStep"),
]);
let root: Root;
let el: HTMLDivElement;
beforeEach(() => {
  el = document.createElement("div");
  document.body.appendChild(el);
  root = createRoot(el);
});
afterEach(() => { act(() => root.unmount()); el.remove(); });

it("keeps edited basics when continuing and returning, including the save payload", async () => {
  const snapshotRef = { current: {} as SetupDraftSnapshot };
  const render = async (index: number) => act(async () => {
    root.render(createElement(SetupDraftProvider, { snapshotRef, children: createElement(steps[index].default) }));
  });
  await render(0);
  const input = el.querySelector("input")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "Customer GB");
    input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  expect(snapshotRef.current.basics?.name).toBe("Customer GB");
  await render(1);
  await render(0);
  expect(el.querySelector("input")!.value).toBe("Customer GB");
  expect(buildSetupPayload(snapshotRef.current).name).toBe("Customer GB");
});

const saved: SetupDraftSnapshot = {
  basics: { name: "Saved GB", description: "Description", currency: "USD", closeDate: "2026-12-01T12:00", manufacturer: "Supplier", manufacturerCountry: "China", labTestSupplier: "Lab" },
  products: { products: [{ id: "p1", name: "Product", price: "23", category: "Supplier", stock: "100" }] },
  shipping: { options: [{ id: "s1", label: "Tracked", price: "8", description: "Postage", region: "GB", requiresAddress: false, requiresQr: true }] },
  payments: { cryptoEnabled: true, cryptoWallets: [{ id: "w1", currency: "USDT", network: "TRC20", address: "test-wallet" }], anonpayEnabled: true, anonpayWallet: "test-anon", anonpayCurrency: "USDT", anonpayNetwork: "TRC20", revolutEnabled: true, revolutHandle: "example", paypalEnabled: true, paypalHandle: "example", bankTransfer: { uk: { enabled: true, accountHolder: "Example Ltd", sortCode: "12-34-56", accountNumber: "00123456", bankName: "Example Bank" } } },
  access: { entryFeeEnabled: true, entryFeeAmount: "4", entryFeeLabel: "Entry", countryMode: "allow", countries: ["GB"], blockedAccounts: ["blocked"], pinEnabled: true, pin: "1234" },
  rules: { welcomeMessage: "Welcome", rules: [{ id: "r1", text: "A saved rule" }], disclaimer: "Disclaimer", additionalInfo: "Details" },
};

saved.payments!.allowCredits = false;

it("retains the credit toggle between setup steps and submits the selected policy", async () => {
  const snapshotRef = { current: structuredClone(saved) };
  const renderStep = async (index: number) => act(async () => {
    root.render(createElement(SetupDraftProvider, { snapshotRef, children: createElement(steps[index].default) }));
  });
  await renderStep(3);
  const toggle = el.querySelector<HTMLInputElement>('[aria-label="Allow store credits"]');
  expect(toggle).not.toBeNull();
  expect(toggle!.checked).toBe(false);
  expect(buildSetupPayload(snapshotRef.current).allowCredits).toBe(false);
  await act(async () => toggle!.click());
  expect(snapshotRef.current.payments?.allowCredits).toBe(true);
  await renderStep(4);
  await renderStep(3);
  expect(el.querySelector<HTMLInputElement>('[aria-label="Allow store credits"]')!.checked).toBe(true);
  expect(buildSetupPayload(snapshotRef.current).allowCredits).toBe(true);
});

for (const [index, section] of (["basics", "products", "shipping", "payments", "access", "rules"] as const).entries()) {
  it(`restores every saved ${section} field instead of replacing it with defaults`, async () => {
    const snapshotRef = { current: structuredClone(saved) };
    await act(async () => root.render(createElement(SetupDraftProvider, {
      snapshotRef, children: createElement(steps[index].default),
    })));
    expect(snapshotRef.current[section]).toEqual(saved[section]);
  });
}
