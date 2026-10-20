import { afterAll, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ShippingOptionsEditor } = await import("./core");
afterAll(() => vi.unstubAllGlobals());
it("lets Admin route EU postage to Fazi, excluding UK-only reshippers and Direct Shipping", async () => {
  const el = document.createElement("div"); document.body.append(el);
  const root = createRoot(el); const onChange = vi.fn();
  const option = { id: "eu-postage-DE-pickup", country: "DE", label: "Germany pickup", price: 17.3 };
  await act(async () => root.render(createElement(ShippingOptionsEditor, {
    options: [option], onChange, reshippers: [
      { reshipperUsername: "fazi28", country: "AT", countries: ["AT", "DE"], enabled: true },
      { reshipperUsername: "uk", country: "GB", countries: ["GB"], enabled: true },
    ],
  })));
  const select = el.querySelector<HTMLSelectElement>('select[aria-label="Reshipper route for Germany pickup"]')!;
  expect(select.textContent).toContain("@fazi28");
  expect(select.textContent).not.toContain("@uk");
  expect(select.textContent).not.toContain("Direct Shipping");
  await act(async () => { select.value = "fazi28"; select.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  expect(onChange).toHaveBeenCalledWith([{ ...option, reshipperUsername: "fazi28" }]);
  await act(async () => root.unmount()); el.remove();
});

it.each([
  ["US", "US Shipping", "us-reshipper"],
  ["UK", "Royal Mail — upload PDF label", "uk-reshipper"],
  ["GB", "InPost — upload QR", "uk-reshipper"],
])("offers the correct Admin routing choice for %s postage", async (country, label, username) => {
  const el = document.createElement("div"); document.body.append(el);
  const root = createRoot(el); const onChange = vi.fn();
  const option = { id: "postage", country, label, price: 12 };
  await act(async () => root.render(createElement(ShippingOptionsEditor, {
    options: [option], onChange, reshippers: [
      { reshipperUsername: "us-reshipper", country: "US", countries: ["US"], enabled: true },
      { reshipperUsername: "uk-reshipper", country: "GB", countries: ["GB"], enabled: true },
      { reshipperUsername: "fazi28", country: "AT", countries: ["AT", "DE"], enabled: true },
    ],
  })));
  const select = el.querySelector<HTMLSelectElement>('select[aria-label^="Reshipper route for"]')!;
  expect([...select.options].map(row => row.value)).toEqual(["", username]);
  await act(async () => { select.value = username; select.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  expect(onChange).toHaveBeenCalledWith([{ ...option, reshipperUsername: username }]);
  await act(async () => root.unmount()); el.remove();
});
