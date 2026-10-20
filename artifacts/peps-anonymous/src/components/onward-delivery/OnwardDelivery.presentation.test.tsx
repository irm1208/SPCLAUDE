import { act } from "react";
import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { writeFileSync } from "node:fs";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let Picker: typeof import("./OnwardDelivery").OnwardDeliveryPicker;
beforeAll(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node", "MutationObserver"]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import("react-dom/client"));
  ({ OnwardDeliveryPicker: Picker } = await import("./OnwardDelivery"));
});
afterAll(() => dom.window.close());

it("keeps estimates in a cohesive blue card without changing optional selection or prices", async () => {
  const estimate = {
    status: "available", configured: true, country: "DE", kits: 11, currency: "USD",
    reshipperUsername: "reshipper", selectedMethod: null,
    options: [{ method: "pickup", amount: 23 }, { method: "home", amount: 26 }],
  };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => estimate })));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const change = vi.fn();
  const props = { gbId: "g1", country: "DE", kits: 11, onChange: change };
  try {
    await act(async () => root.render(<Picker {...props} value="home" />));
    await act(async () => { await new Promise(r => setTimeout(r, 450)); });
    const card = container.querySelector('[data-testid="card-onward-picker"]')!;
    expect(card.classList.contains("onward-estimate-card")).toBe(true);
    expect(card.getAttribute("aria-label")).toBe("Potential onwards delivery charge");
    expect(card.querySelector("h3")?.textContent).toBe("Potential onwards delivery charge");
    expect(card.querySelector(".onward-estimate-options")).not.toBeNull();
    expect(card.querySelector(".onward-estimate-context")?.textContent).toContain("11 kits");
    expect(card.textContent).toContain("Germany");
    expect(card.textContent).toContain("Pay onward delivery after placing your order");
    expect(card.querySelector(".onward-estimate-optional")).toBeNull();
    expect(card.textContent).toContain("Not included in your order total");
    const home = card.querySelector('[data-testid="button-onward-home"]') as HTMLButtonElement;
    const pickup = card.querySelector('[data-testid="button-onward-pickup"]') as HTMLButtonElement;
    expect(home.getAttribute("aria-pressed")).toBe("true");
    expect(home.textContent).toContain("$26.00");
    expect(pickup.textContent).toContain("$23.00");
    await act(async () => pickup.click());
    expect(change).toHaveBeenLastCalledWith("pickup");
    await act(async () => home.click());
    expect(change).toHaveBeenLastCalledWith(null);
    if (process.env.ONWARD_UI_PREVIEW) {
      writeFileSync("/tmp/onward-estimate-preview.html", `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body style="margin:0;padding:20px;background:var(--t-bg);font-family:Inter,system-ui,sans-serif"><main style="max-width:850px;margin:32px auto"><h1 style="font-size:24px;font-weight:700;color:var(--t-text);margin-bottom:24px">Order delivery</h1>${card.outerHTML}</main><script>document.documentElement.dataset.theme=new URLSearchParams(location.search).get("theme")||"light"</script></body></html>`);
    }
  } finally {
    await act(async () => root.unmount());
    container.remove(); vi.unstubAllGlobals();
  }
});

it("hides the estimate card when the selected country has no matrix rates", async () => {
  const estimate = {
    status: "unavailable", configured: true, country: "GB", kits: 1, currency: null,
    reshipperUsername: "reshipper", selectedMethod: null, options: [],
  };
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => estimate })));
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const change = vi.fn();
  try {
    await act(async () => root.render(<Picker gbId="g1" country="GB" kits={1} value="home" onChange={change} />));
    await act(async () => { await new Promise(r => setTimeout(r, 450)); });
    expect(change).toHaveBeenLastCalledWith(null);
    expect(container.querySelector('[data-testid="card-onward-picker"]')).toBeNull();
  } finally {
    await act(async () => root.unmount());
    container.remove(); vi.unstubAllGlobals();
  }
});
