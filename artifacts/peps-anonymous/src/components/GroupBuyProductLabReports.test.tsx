import { JSDOM } from "jsdom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, getComputedStyle: dom.window.getComputedStyle });
Object.defineProperty(globalThis, "navigator", { value: dom.window.navigator, configurable: true });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement, root: ReturnType<typeof createRoot>;
async function render(element: React.ReactNode) { await React.act(async () => { root.render(element); }); }
async function waitFor(check: () => void) {
  let failure: unknown;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { check(); return; } catch (error) { failure = error; }
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  }
  throw failure;
}
function control(name: string) { return container.querySelector(`[aria-label="${name}"]`) as HTMLSelectElement; }
async function change(name: string, value: string) { await React.act(async () => {
  control(name).value = value; control(name).dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}); }
async function save() { await React.act(async () => {
  [...container.querySelectorAll("button")].find(button => button.textContent === "Save lab report")!.click();
}); }
vi.mock("@/pages/LabTests", () => ({ ReportModal: () => null, parseBatchDate: () => null }));
vi.mock("framer-motion", async () => {
  const React = await import("react");
  return { motion: { div: React.forwardRef(({ children, initial, animate, exit, transition, ...props }: any, ref: any) =>
    React.createElement("div", { ...props, ref }, children)) }, AnimatePresence: ({ children }: any) => children };
});
const { GroupBuyProductLabReports } = await import("./GroupBuyProductLabReports");
const { LabReportPopup } = await import("./LabTestsPopup");
const fetchMock = vi.fn();
const certificate = { id: 12, peptideName: "HGH", nominalDose: "36 IU", supplier: "Test supplier", batchCode: "CHOSEN-36",
  url: "https://example.com/report", createdAt: "2026-10-01", testDate: "2026-10-01", janoshikId: null,
  purityPct: null, sterilityPass: null, isThirdPartyTest: false, labName: "Test lab", mgAmount: null,
  massUnit: null, notes: null, endotoxinEuMg: null, testType: null, productCategory: null, blendComponents: null };
beforeEach(() => {
  fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock);
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await React.act(async () => root.unmount()); container.remove(); vi.unstubAllGlobals(); });

it.each([["Admin", "admin", "test-secret"], ["Organiser", "organiser", undefined]])("%s can choose one report, save it only on the GB link, and restore Automatic", async (_role, route, secret) => {
  fetchMock.mockImplementation(async (url, init) => ({
    ok: true,
    json: async () => init?.method === "PATCH" ? { ok: true } : String(url).includes("/lab-tests?")
      ? [certificate] : [{ id: "p1", productId: "p1", name: "HGH 36iu", labReportId: null }],
  }));
  await render(React.createElement(GroupBuyProductLabReports, { gbId: "gb-a", adminSecret: secret }));
  const details = container.querySelector("details")!;
  await React.act(async () => { details.open = true; details.dispatchEvent(new dom.window.Event("toggle")); });
  await waitFor(() => expect(container.textContent).toContain("HGH 36iu"));
  await change("Lab report product", "p1");
  await waitFor(() => expect(container.textContent).toContain("CHOSEN-36"));
  await change("Lab report", "12");
  await save();
  await waitFor(() => expect(container.textContent).toContain("Report #12 saved"));
  const saved = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH");
  expect(saved?.[0]).toBe(`/api/${route}/group-buys/gb-a/products/p1`);
  expect(JSON.parse(saved?.[1].body)).toEqual({ labReportId: 12 });
  await change("Lab report", "");
  await save();
  await waitFor(() => expect(container.textContent).toContain("Automatic matching restored"));
  expect(JSON.parse(fetchMock.mock.calls.filter(([, init]) => init?.method === "PATCH").at(-1)?.[1].body)).toEqual({ labReportId: null });
});

it("uses only the chosen report even when batch and supplier matching would choose others", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => certificate });
  await render(React.createElement(LabReportPopup, { productName: "HGH 36iu", labReportId: 12, batchPrefixes: ["OTHER"], gbLabSupplier: "Other supplier", onClose: () => {} }));
  await waitFor(() => expect(container.textContent).toContain("CHOSEN-36"));
  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/lab-tests/12"]);
});
it("does not silently show unrelated reports if the selected certificate has been deleted", async () => {
  fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: "Not found" }) });
  await render(React.createElement(LabReportPopup, { productName: "HGH 36iu", labReportId: 12, onClose: () => {} }));
  await waitFor(() => expect(container.querySelector('[role="alert"]')?.textContent).toContain("selected lab report is unavailable"));
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
it("retains automatic matching when no report is selected for the group product", async () => {
  fetchMock.mockResolvedValue({ ok: true, json: async () => [certificate, { ...certificate, id: 13, batchCode: "OTHER-HGH" }] });
  await render(React.createElement(LabReportPopup, { productName: "HGH 36iu", onClose: () => {} }));
  await waitFor(() => expect(container.textContent).toContain("OTHER-HGH"));
  expect(container.textContent).toContain("CHOSEN-36");
  expect(fetchMock.mock.calls.every(([url]) => String(url).startsWith("/api/lab-tests?"))).toBe(true);
});
