import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom declarations are optional.
import { JSDOM } from "jsdom";
const mocks = vi.hoisted(() => ({ inspect: vi.fn(), render: vi.fn(), compose: vi.fn() }));
vi.mock("@/lib/royal-mail-pdf-preview", () => ({ inspectRoyalMailPdf: mocks.inspect, renderRoyalMailPage: mocks.render }));
vi.mock("@/lib/royal-mail-labels", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/royal-mail-labels")>(), composeLabelPdf: mocks.compose,
}));
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Element", "DocumentFragment", "Node", "NodeFilter", "MutationObserver", "Event", "CustomEvent", "MouseEvent", "HTMLButtonElement"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, getComputedStyle: dom.window.getComputedStyle });
const { createRoot } = await import("react-dom/client");
const { RoyalMailLabelsExport } = await import("./RoyalMailLabelsExport");
const { createLabelPreviewCache } = await import("@/lib/royal-mail-preview-cache");
const source = `data:application/pdf;base64,${btoa("%PDF-1.7\nsynthetic fixture")}`;
const page = { pageIndex: 0, viewBox: [0, 0, 288, 432], rotation: 0, crop: { x: 0, y: 0, width: 1, height: 1 }, confirmed: true, reason: "Already label-sized" };
const props = { gbId: "group", gbName: "HGH Test", batchName: "GB-TEST / 001", scopeDescription: "GB-TEST / 001 · Not Posted", mode: "admin" as const, adminSecret: "fixture-secret",
  orders: [{ id: "one", code: "10001", telegramUsername: "synthetic" }], onClose: vi.fn() };
function button(text: string) {
  const found = [...document.querySelectorAll("button")].find(item => item.textContent?.trim() === text);
  expect(found, text).toBeTruthy(); return found!;
}
beforeEach(() => {
  mocks.inspect.mockReset().mockResolvedValue([page]);
  mocks.render.mockReset().mockResolvedValue(undefined);
  mocks.compose.mockReset().mockResolvedValue(new TextEncoder().encode("%PDF-1.7\noutput"));
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:synthetic");
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(dom.window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  vi.spyOn(dom.window.HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage: vi.fn() } as any);
});
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });
function mount() {
  const el = document.createElement("div"); document.body.append(el); return createRoot(el);
}

it("uses read-only authorised endpoints, deduplicates fields within an order but not across orders, and downloads one combined PDF", async () => {
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({
    royalMailQrCode: source, qrCodes: { "royal-mail": source.replace("application/pdf", "application/octet-stream"), inpost: source },
  }));
  const root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} orders={[...props.orders, { id: "two", code: "10002", telegramUsername: "second" }]} />));
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(mocks.inspect).toHaveBeenCalledTimes(2);
    expect(document.body.textContent).toContain("2 labels included · 0 exclusions · 0 need attention");
    for (const [url, options] of fetcher.mock.calls) {
      expect(String(url)).toMatch(/^\/api\/admin\/group-buys\/group\/orders\/(?:one|two)\/qr-data$/);
      expect(options?.method ?? "GET").toBe("GET");
      expect(options?.headers).toEqual({ "x-admin-secret": "fixture-secret" });
    }
    await React.act(async () => button("Download combined 4×6 PDF (2)").click());
    expect(mocks.compose.mock.calls[0][0]).toHaveLength(2);
    expect(document.body.textContent).toContain("Downloaded 2 labels in one PDF");
    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(fetcher).toHaveBeenCalledTimes(2);
  } finally { await React.act(async () => root.unmount()); }
});

it("requires explicit failed-file exclusion before downloading the remaining labels", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async input => Response.json(
    String(input).includes("/one/") ? { royalMailQrCode: source } : { royalMailQrCode: "data:image/png;base64,aaaa" }));
  const root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} orders={[...props.orders, { id: "bad", code: "10002", telegramUsername: "bad-file" }]} />));
    expect(button("Download combined 4×6 PDF (1)").disabled).toBe(true);
    expect(document.body.textContent).toMatch(/not a PDF|PDF, JPEG or PNG/);
    const bad = [...document.querySelectorAll("section")].find(section => section.textContent?.includes("bad-file"))!;
    await React.act(async () => (bad.querySelector("input[type=checkbox]") as HTMLInputElement).click());
    expect(button("Download combined 4×6 PDF (1)").disabled).toBe(false);
    expect(document.body.textContent).toContain("1 exclusions");
  } finally { await React.act(async () => root.unmount()); }
});

it("supports uncertain multipage crops, explicit page exclusion and multiple label regions on one page", async () => {
  mocks.inspect.mockResolvedValue([{ ...page, confirmed: false }, { ...page, pageIndex: 1, confirmed: false }]);
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ royalMailQrCode: source }));
  const root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} mode="organiser" />));
    expect(button("Download combined 4×6 PDF (2)").disabled).toBe(true);
    const regionCheckboxes = [...document.querySelectorAll("label")].filter(label => label.textContent === "Exclude this region").map(label => label.querySelector("input")!);
    await React.act(async () => regionCheckboxes[1].click());
    await React.act(async () => button("Preview / adjust crop").click());
    await React.act(async () => button("Confirm label").click());
    expect(button("Download combined 4×6 PDF (1)").disabled).toBe(false);
    await React.act(async () => button("Add another label region").click());
    expect(button("Download combined 4×6 PDF (2)").disabled).toBe(true);
    await React.act(async () => button("Confirm this label crop").click());
    await React.act(async () => button("Download combined 4×6 PDF (2)").click());
    expect(mocks.compose.mock.calls.at(-1)![0][0].labels.map((label: any) => label.pageIndex)).toEqual([0, 0]);
  } finally { await React.act(async () => root.unmount()); }
});

it("cancels an in-progress export without downloading when conversion resolves late", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ royalMailQrCode: source }));
  let finish!: (value: Uint8Array) => void;
  mocks.compose.mockImplementation(() => new Promise<Uint8Array>(resolve => { finish = resolve; }));
  const closed = vi.fn(), root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} onClose={closed} />));
    await React.act(async () => button("Download combined 4×6 PDF (1)").click());
    await React.act(async () => button("Cancel export").click());
    expect(closed).toHaveBeenCalledOnce();
    expect(mocks.compose.mock.calls[0][1].aborted).toBe(true);
    await React.act(async () => finish(new Uint8Array([1, 2])));
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  } finally { await React.act(async () => root.unmount()); }
});

it("bounds loading to one order at a time and ignores late data after unmount", async () => {
  let finish!: (response: Response) => void;
  const fetcher = vi.spyOn(globalThis, "fetch").mockImplementation(() => new Promise<Response>(resolve => { finish = resolve; }));
  const root = mount();
  await React.act(async () => root.render(<RoyalMailLabelsExport {...props} orders={[...props.orders, { id: "two", code: "10002", telegramUsername: "second" }]} />));
  expect(fetcher).toHaveBeenCalledTimes(1);
  const signal = fetcher.mock.calls[0][1]?.signal;
  await React.act(async () => root.unmount());
  expect(signal?.aborted).toBe(true);
  await React.act(async () => finish(Response.json({ royalMailQrCode: source })));
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(mocks.inspect).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

it("shows an identified print preview and confirms straight through the pending labels", async () => {
  mocks.inspect.mockResolvedValue([{ ...page, confirmed: false }]);
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ royalMailQrCode: source }));
  const root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} orders={[...props.orders, { id: "two", code: "10002", telegramUsername: "second-member" }]} />));
    await React.act(async () => button("Show preview").click());
    const current = () => document.querySelector('[aria-label="Current label"]')!;
    expect(current().textContent).toContain("#10001 · @synthetic");
    expect(current().textContent).toContain("Label 1 of 2");
    expect(document.querySelectorAll("canvas")).toHaveLength(1);
    expect(document.querySelectorAll("section")).toHaveLength(1);
    expect(button("Download combined 4×6 PDF (2)").disabled).toBe(true);
    await React.act(async () => button("Confirm & next").click());
    expect(current().textContent).toContain("#10002 · @second-member");
    expect(current().textContent).toContain("Label 2 of 2");
    expect(document.body.textContent).toContain("1 awaiting confirmation");
    await React.act(async () => button("Confirm label").click());
    expect(document.body.textContent).toContain("0 need attention");
    expect(button("Download combined 4×6 PDF (2)").disabled).toBe(false);
    expect(mocks.compose.mock.calls.flatMap(call => call[0]).every(file => file.labels.length === 1)).toBe(true);
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  } finally { await React.act(async () => root.unmount()); }
});

it("does not confirm by browsing previews and disables confirmation when rendering fails", async () => {
  mocks.inspect.mockResolvedValue([{ ...page, confirmed: false }, { ...page, pageIndex: 1, confirmed: false }]);
  vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({ royalMailQrCode: source }));
  const root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} />));
    mocks.render.mockRejectedValueOnce(new Error("Could not render this label"));
    await React.act(async () => button("Show preview").click());
    expect(document.body.textContent).toContain("Could not render this label");
    expect(button("Confirm & next").disabled).toBe(true);
    await React.act(async () => button("Next label").click());
    expect(document.body.textContent).toContain("2 awaiting confirmation");
    expect(document.querySelector('[aria-label="Current label"]')?.textContent).toContain("Page 2");
    await React.act(async () => button("Back to list").click());
    expect(document.body.textContent).toContain("2 need attention");
    expect(button("Download combined 4×6 PDF (2)").disabled).toBe(true);
  } finally { await React.act(async () => root.unmount()); }
});

it("reuses previews on Next/Previous without refetching uploads or losing confirmation state", async () => {
  mocks.inspect.mockResolvedValue([{ ...page, confirmed: false }, { ...page, pageIndex: 1, confirmed: false }]);
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ royalMailQrCode: source }));
  const root = mount();
  try {
    await React.act(async () => root.render(<RoyalMailLabelsExport {...props} />));
    await React.act(async () => button("Show preview").click());
    await React.act(async () => button("Next label").click());
    await React.act(async () => button("Previous label").click());
    await React.act(async () => button("Next label").click());
    expect(mocks.compose).toHaveBeenCalledTimes(2);
    expect(mocks.render).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(document.body.textContent).toContain("2 awaiting confirmation");
  } finally { await React.act(async () => root.unmount()); }
});

it("invalidates cached previews for crop changes and retries a failed preview without reloading labels", async () => {
  const controller = new AbortController();
  const cache = createLabelPreviewCache(controller.signal);
  const bytes = new TextEncoder().encode("%PDF-1.7\ncache fixture");
  const first = await cache.get(bytes, page);
  expect(await cache.get(bytes, { ...page, confirmed: false })).toBe(first);
  const changed = { ...page, crop: { x: .1, y: .1, width: .8, height: .8 } };
  mocks.render.mockRejectedValueOnce(new Error("Temporary render failure"));
  await expect(cache.get(bytes, changed)).rejects.toThrow("Temporary render failure");
  const retried = await cache.get(bytes, changed);
  expect(retried).not.toBe(first);
  expect(mocks.compose).toHaveBeenCalledTimes(3);
  controller.abort();
  expect(() => cache.get(bytes, page)).toThrow(/cancelled/);
});
