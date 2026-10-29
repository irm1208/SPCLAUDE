import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { Fs3SupplierCostImport } = await import("./Fs3SupplierCostImport");
let root: ReturnType<typeof createRoot>;
afterEach(async () => { if (root) await act(async () => root.unmount()); document.body.innerHTML = ""; vi.restoreAllMocks(); });
const plan = { vendorId: "ur", preserved: 1, previewToken: "a".repeat(64), matches: [{ id: "p", name: "Semaglutide 10mg", cost: "50.00" }], skipped: [{ id: "q", name: "Unknown", reason: "Missing saved cost" }], updated: 0, applied: false };
async function mount(onApplied = vi.fn(), disabledReason?: string) {
  const el = document.createElement("div"); document.body.append(el); root = createRoot(el);
  await act(async () => root.render(createElement(Fs3SupplierCostImport, { secret: "session-marker", vendorId: "ur", vendorName: "UR", onApplied, disabledReason })));
  return el;
}
const click = async (el: Element, testId: string) => act(async () => {
  (el.querySelector(`[data-testid="${testId}"]`) as HTMLElement).click();
  await new Promise(r => setTimeout(r, 5));
});
it("reviews first, then applies the reviewed token and refreshes the saved catalogue", async () => {
  const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return { ok: true, json: async () => body.apply ? { ...plan, applied: true, updated: 1 } : plan };
  });
  vi.stubGlobal("fetch", fetchMock);
  const onApplied = vi.fn();
  const el = await mount(onApplied);
  expect(fetchMock).not.toHaveBeenCalled();
  await click(el, "review-fs3-cost-import");
  expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toEqual({ vendorId: "ur", apply: false });
  expect(el.textContent).toContain("Semaglutide 10mg");
  expect(el.textContent).toContain("Unknown");
  expect(el.textContent).toContain("$50.00");
  await click(el, "apply-fs3-cost-import");
  expect(JSON.parse(fetchMock.mock.calls[1][1].body as string)).toEqual({ vendorId: "ur", apply: true, previewToken: plan.previewToken });
  expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
  expect(onApplied).toHaveBeenCalledOnce();
  expect(el.textContent).toContain("Imported 1 supplier cost");
  expect(el.querySelector('[data-testid="apply-fs3-cost-import"]')).toBeNull();
});
it("invalidates a stale review, surfaces the server error and never reports success", async () => {
  let calls = 0;
  vi.stubGlobal("fetch", vi.fn(async () => ++calls === 1
    ? { ok: true, json: async () => plan }
    : { ok: false, status: 409, json: async () => ({ error: "Prices changed; review again." }) }));
  const onApplied = vi.fn();
  const el = await mount(onApplied);
  await click(el, "review-fs3-cost-import");
  await click(el, "apply-fs3-cost-import");
  expect(el.querySelector('[role="alert"]')?.textContent).toContain("Prices changed");
  expect(el.querySelector('[data-testid="apply-fs3-cost-import"]')).toBeNull();
  expect(onApplied).not.toHaveBeenCalled();
});
it("does not import while product edits are unsaved", async () => {
  const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
  const el = await mount(vi.fn(), "Save your unsaved product edits before importing FS3 costs.");
  expect((el.querySelector('[data-testid="review-fs3-cost-import"]') as HTMLButtonElement).disabled).toBe(true);
  await click(el, "review-fs3-cost-import");
  expect(fetchMock).not.toHaveBeenCalled();
  expect(el.textContent).toContain("Save your unsaved product edits");
});
