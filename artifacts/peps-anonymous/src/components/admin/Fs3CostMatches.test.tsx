import { beforeEach, afterEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is provided by the workspace without optional typings.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "HTMLSelectElement", "Element", "Node", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const React = await import("react");
const { act, createElement: h } = React;
const { createRoot } = await import("react-dom/client");
const { Fs3CostMatches } = await import("./Fs3CostMatches");
let host: HTMLDivElement, root: ReturnType<typeof createRoot>, saved: any[];
const changed = vi.fn().mockResolvedValue(undefined);
const requests: any[] = [];
const props = { secret: "binding", costs: [{ productName: "KPV 30mg", unitCost: 110 }],
  vendors: [{ id: "supplier-a", name: "Supplier A" }], onChanged: changed };
function button(text: string) {
  return [...host.querySelectorAll("button")].find(b => b.textContent === text)!;
}
function field(text: string) {
  return [...host.querySelectorAll("label")].find(l => l.textContent?.startsWith(text))!.querySelector("input,select") as HTMLInputElement;
}
async function set(text: string, value: string) {
  const el = field(text);
  await act(async () => {
    const proto = el.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(el, value);
    el.dispatchEvent(new dom.window.Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  });
}
async function click(text: string) { await act(async () => button(text).click()); }
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  saved = []; requests.length = 0; changed.mockClear();
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: any = {}) => {
    const method = init.method ?? "GET";
    if (method !== "GET") {
      const body = JSON.parse(init.body); requests.push({ method, body });
      if (method === "DELETE") saved = [];
      else saved = [{ ...body, active: true, reviewedAt: "2026-10-29T00:00:00Z", reviewedBy: "Admin" }];
    }
    return { ok: true, json: async () => method === "GET" ? saved : {} };
  }));
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.restoreAllMocks();
});
it("requires explicit review, saves supplier scope and refreshes prices, then displays the persisted match", async () => {
  await act(async () => root.render(h(Fs3CostMatches, props)));
  await set("Supplier scope", "supplier-a");
  await set("Ordered product name", "NA KPV 30mg");
  await set("Saved supplier-cost name", "KPV 30mg");
  await set("Review note", "Supplier confirms compound and dose");
  expect(button("Approve and save match").disabled).toBe(true);
  await act(async () => (field("I have checked") as HTMLInputElement).click());
  expect(button("Approve and save match").disabled).toBe(false);
  await click("Approve and save match");
  expect(requests[0].body).toEqual({ vendorId: "supplier-a", productName: "NA KPV 30mg",
    costName: "KPV 30mg", reviewNote: "Supplier confirms compound and dose", reviewed: true });
  expect(changed).toHaveBeenCalledOnce();
  expect(host.textContent).toContain("NA KPV 30mg");
  expect(host.textContent).toContain("Supplier A");
  expect(field("Ordered product name").value).toBe("");
  await click("Edit");
  expect(field("Ordered product name").value).toBe("NA KPV 30mg");
  expect(button("Approve and save match").disabled).toBe(true);
  await act(async () => field("I have checked").click());
  await set("Ordered product name", "NA KPV 40mg");
  expect(field("I have checked").checked).toBe(false);
});
it("revokes only after confirmation and refreshes the saved-cost consumers", async () => {
  saved = [{ vendorId: null, productName: "NA KPV 30mg", costName: "KPV 30mg", active: true,
    reviewNote: "Confirmed", reviewedBy: "Owner", reviewedAt: "2026-10-29T00:00:00Z" }];
  await act(async () => root.render(h(Fs3CostMatches, props)));
  vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  await click("Revoke"); expect(requests).toHaveLength(0);
  await click("Revoke");
  expect(requests[0]).toEqual({ method: "DELETE", body: { vendorId: null, productName: "NA KPV 30mg" } });
  expect(host.textContent).toContain("No reviewed matches.");
  expect(changed).toHaveBeenCalledOnce();
});
it("reports failed loading and blocks approvals until matches load", async () => {
  vi.mocked(fetch).mockResolvedValueOnce({ ok: false } as Response);
  await act(async () => root.render(h(Fs3CostMatches, props)));
  expect(host.querySelector('[role="alert"]')?.textContent).toContain("Unable to load");
  expect((host.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(true);
  await click("Reload matches");
  expect((host.querySelector("fieldset") as HTMLFieldSetElement).disabled).toBe(false);
});
