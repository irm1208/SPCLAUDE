// @ts-ignore -- jsdom has no declarations in this workspace (shared by existing UI tests).
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { SharedLabProduct } from "@/lib/shared-wholesale-lab-reports";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.assign(globalThis, {
  window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement,
  Element: dom.window.Element, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true,
});
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
vi.mock("@/pages/LabTests", () => ({ ReportModal: () => null, parseBatchDate: () => null }));
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { useSharedWholesaleLabReports } = await import("./use-shared-wholesale-lab-reports");
const { LabReportPopup } = await import("@/components/LabTestsPopup");

let root: ReturnType<typeof createRoot>;
let container: HTMLDivElement;
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await React.act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

function Fixture({ products }: { products: SharedLabProduct[] }) {
  const reports = useSharedWholesaleLabReports(products);
  const [selected, setSelected] = React.useState<string | null>(null);
  const report = selected ? reports[selected] : null;
  return <>
    {products.map(p => reports[p.id] && <button key={p.id} data-product={p.id}
      onClick={() => setSelected(p.id)}>Lab Reports</button>)}
    {report && <LabReportPopup key={selected} productName={report.productName}
      batchPrefixes={report.batchPrefixes} vendor={report.supplier} onClose={() => setSelected(null)} />}
  </>;
}

const mixed = [
  { id: "uther", name: "Retatrutide 10mg", vendorName: "UR" },
  { id: "jbg", name: "Retatrutide 10mg", vendorName: "JBG/YT" },
];
const response = (codes: unknown) => ({ ok: true, json: async () => codes });
async function render(products: SharedLabProduct[]) {
  await React.act(async () => root.render(<Fixture products={products} />));
}

it("opens supplier-filtered popup requests for identically named mixed-supplier products", async () => {
  const request = vi.fn(async (input: string) => response(input.includes("/batch-codes?") ? ["RE10-1234"] : []));
  vi.stubGlobal("fetch", request);
  await render(mixed);
  expect(container.querySelectorAll("button[data-product]")).toHaveLength(2);
  for (const [id, supplier] of [["uther", "Uther"], ["jbg", "JBG/YT"]]) {
    await React.act(async () => container.querySelector<HTMLButtonElement>(`[data-product="${id}"]`)!.click());
    const calls = request.mock.calls.map(([url]) => url).filter(url => url.startsWith("/api/lab-tests?"));
    const params = new URL(calls.at(-1)!, "http://localhost").searchParams;
    expect(params.get("supplier")).toBe(supplier);
    expect(params.get("batchPrefix")?.split(",")).toContain("RE10");
  }
  expect(request.mock.calls.every(([url]) => new URL(url, "http://localhost").searchParams.has("supplier"))).toBe(true);
});

it("hides the JBG action when only Uther has matching approved reports", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => response(url.includes("supplier=Uther") ? ["RE10-1234"] : [])));
  await render(mixed);
  expect(container.querySelector('[data-product="uther"]')).not.toBeNull();
  expect(container.querySelector('[data-product="jbg"]')).toBeNull();
});

it("discards late responses and old badges when a catalogue changes supplier", async () => {
  let finishOld!: (value: ReturnType<typeof response>) => void;
  const oldRequest = new Promise<ReturnType<typeof response>>(resolve => { finishOld = resolve; });
  vi.stubGlobal("fetch", vi.fn((url: string) => url.includes("supplier=Uther")
    ? oldRequest : Promise.resolve(response([]))));
  await render([mixed[0]]);
  await render([{ ...mixed[0], vendorName: "JBG/YT" }]);
  await React.act(async () => finishOld(response(["RE10-1234"])));
  expect(container.querySelector("button[data-product]")).toBeNull();
  await render([]);
  expect(container.querySelector("button[data-product]")).toBeNull();
});

it("hides a loaded action and its open popup immediately while replacement reports load", async () => {
  let finishNew!: (value: ReturnType<typeof response>) => void;
  const newRequest = new Promise<ReturnType<typeof response>>(resolve => { finishNew = resolve; });
  vi.stubGlobal("fetch", vi.fn((url: string) => {
    if (url.includes("supplier=JBG")) return newRequest;
    return Promise.resolve(response(url.includes("/batch-codes?") ? ["RE10-1234"] : []));
  }));
  await render([mixed[0]]);
  await React.act(async () => container.querySelector<HTMLButtonElement>("[data-product]")!.click());
  expect(container.textContent).toContain("No lab reports found for this product");
  await render([{ ...mixed[0], vendorName: "JBG/YT" }]);
  expect(container.querySelector("[data-product]")).toBeNull();
  expect(container.textContent).not.toContain("No lab reports found for this product");
  await React.act(async () => finishNew(response([])));
  expect(container.querySelector("[data-product]")).toBeNull();
});

it("wires the shared page actions and popup to product IDs and the resolved supplier", () => {
  const source = readFileSync(new URL("../pages/WholesaleShared.tsx", import.meta.url), "utf8");
  expect(source).toContain("useSharedWholesaleLabReports(products)");
  expect(source).toContain("productLabReports[p.id]");
  expect(source).toContain("setLabTestsProductId(p.id)");
  expect(source).toContain("vendor={labTestsProduct.supplier}");
  expect(source).not.toContain('fetch("/api/lab-tests/batch-codes"');
});
