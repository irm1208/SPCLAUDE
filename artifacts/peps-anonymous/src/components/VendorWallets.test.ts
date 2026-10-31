import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom(); beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { VendorWalletPanel, VendorPaymentHistory, useVendorWallets } = await import("./VendorWallets");
const { setVendorCsrfToken } = await import("../lib/vendor-auth-client");
let root: ReturnType<typeof createRoot>;
function setup() { const el = dom.window.document.createElement("div"); dom.window.document.body.appendChild(el); root = createRoot(el); return el; }
afterEach(async () => { if (root) await act(async () => root.unmount()); dom.window.document.body.innerHTML = ""; vi.unstubAllGlobals(); });
const options = [{ currency: "ETH", network: "Ethereum", family: "evm", decimals: 18 }, { currency: "SOL", network: "Solana", family: "solana", decimals: 9 }];
const wallets = [{ id: "eth-wallet", vendorId: "a", currency: "ETH", network: "Ethereum", address: "0x1111111111111111111111111111111111111111", label: "Main" }, { id: "sol-wallet", vendorId: "a", currency: "SOL", network: "Solana", address: "11111111111111111111111111111111", label: null }];
it("saves multiple wallet entries through the CSRF-protected API without vendor IDs", async () => {
  setVendorCsrfToken("wallet-test-token");
  const fetchMock = vi.fn(async (_url: string, _request?: RequestInit) => new Response(JSON.stringify({ wallets, options })));
  vi.stubGlobal("fetch", fetchMock);
  function Harness() { return createElement(VendorWalletPanel, { state: useVendorWallets(true) }); }
  const el = setup();
  await act(async () => root.render(createElement(Harness)));
  expect(el.querySelectorAll("fieldset")).toHaveLength(2);
  await act(async () => el.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  const [url, request] = fetchMock.mock.calls[1];
  expect(url).toBe("/api/vendor/wallets"); expect(request?.method).toBe("PUT");
  expect(new Headers(request?.headers).get("x-vendor-csrf")).toBe("wallet-test-token");
  expect(JSON.parse(request?.body as string)).toEqual({ wallets: wallets.map(({ vendorId, label, ...wallet }) => ({ ...wallet, ...(label != null ? { label } : {}) })) });
  expect(el.textContent).toContain("Payment wallets saved.");
});
it("does not allow removal of the final wallet", async () => {
  const el = setup();
  const state = { data: { wallets: wallets.slice(0, 1), options }, loading: false, error: null, refresh: vi.fn(), save: vi.fn() };
  await act(async () => root.render(createElement(VendorWalletPanel, { state })));
  expect([...el.querySelectorAll("button")].find(button => button.textContent === "Remove wallet 1")!.disabled).toBe(true);
});
it("clears loaded wallet data when disabled", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ wallets, options }))));
  function Harness({ enabled }: { enabled: boolean }) { const state = useVendorWallets(enabled); return createElement("div", null, JSON.stringify(state.data)); }
  const el = setup();
  await act(async () => root.render(createElement(Harness, { enabled: true })));
  expect(el.textContent).toContain("eth-wallet");
  await act(async () => root.render(createElement(Harness, { enabled: false })));
  expect(el.textContent).toBe("null");
});
it("shows receipt snapshots, order allocations and void details", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ payments: [{ id: "receipt", txid: "tx-synthetic", currency: "ETH", network: "Ethereum", cryptoAmount: "0.02", usdAmount: "50.00", walletSnapshot: { address: "historical-address", currency: "ETH", network: "Ethereum" }, orders: [{ submissionId: "order", reference: "8001", amountUsd: "50.00" }], paidAt: "2026-10-30T12:00:00Z", recordedAt: "2026-10-30T13:00:00Z", voidedAt: "2026-10-31T12:00:00Z", voidReason: "Incorrect transaction" }] }))));
  const el = setup(); await act(async () => root.render(createElement(VendorPaymentHistory)));
  expect(el.textContent).toContain("do not verify transactions on the blockchain");
  expect(el.textContent).toContain("0.02 ETH · Ethereum"); expect(el.textContent).toContain("historical-address");
  expect(el.textContent).toContain("Order #8001: $50.00"); expect(el.textContent).toContain("Voided"); expect(el.textContent).toContain("Incorrect transaction");
});
