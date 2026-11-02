import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
vi.mock("@/components/PaymentPanel", () => ({ default: () => null }));
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement"])
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const React = await import("react");
(globalThis as any).React = React;
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { WholesaleAccessSection } = await import("./WholesaleAccessSection");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); });
async function render(data: unknown) {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json(data)));
  await act(async () => root.render(h(WholesaleAccessSection)));
  await act(async () => { await new Promise(r => setTimeout(r, 20)); });
}
it("shows the configured $5 fee and $5 credit, never the old $50 explanation", async () => {
  await render({ request: null, accessFee: 5 });
  expect(host.textContent).toContain("Pay the $5 access fee.");
  expect(host.textContent).toContain("The full $5 is added back");
  expect(host.textContent).not.toContain("$50");
  expect(host.textContent).not.toContain("lowest available shipping");
});
it("follows later Admin fee changes without hardcoded pricing", async () => {
  await render({ request: null, accessFee: 12.5 });
  expect(host.textContent).toContain("$12.5 access fee");
  expect(host.textContent).not.toContain("$5 access fee");
});
it("does not invent a fee when one is not configured", async () => {
  await render({ request: null, accessFee: null });
  expect(host.textContent).toContain("access fee shown on your request");
  expect(host.textContent).not.toMatch(/\$\d/);
});
