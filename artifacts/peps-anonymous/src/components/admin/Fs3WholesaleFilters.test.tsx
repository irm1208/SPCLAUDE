import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error workspace jsdom
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"])
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { Fs3WholesaleFilters } = await import("./Fs3WholesaleFilters");
let root: ReturnType<typeof createRoot>;
afterEach(async () => { await act(async () => root.unmount()); document.body.innerHTML = ""; });
it("provides independent paid/status filters and the Paid + Submitted shortcut", async () => {
  const onChange = vi.fn();
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const render = async (payment = "", status = "") => act(async () =>
    root.render(createElement(Fs3WholesaleFilters, { payment, status, onChange })));
  await render();
  await act(async () => document.querySelector("button")!.click());
  expect(onChange).toHaveBeenLastCalledWith("paid", "Submitted");
  await render("paid", "Submitted");
  expect(document.querySelector("button")!.getAttribute("aria-pressed")).toBe("true");
  const payment = document.querySelector('[aria-label="Wholesale payment"]') as HTMLSelectElement;
  await act(async () => { payment.value = "unpaid"; payment.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  expect(onChange).toHaveBeenLastCalledWith("unpaid", "Submitted");
  const status = document.querySelector('[aria-label="Wholesale order status"]') as HTMLSelectElement;
  await act(async () => { status.value = "Processing"; status.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
  expect(onChange).toHaveBeenLastCalledWith("paid", "Processing");
  await render();
  expect(payment.value).toBe("");
  expect(status.value).toBe("");
});
