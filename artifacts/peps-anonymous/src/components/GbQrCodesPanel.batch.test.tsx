import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { GbQrCodesPanel } = await import("./GbQrCodesPanel");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });
const order = (id: string, qr: boolean, posted = false) => ({
  id, code: id, telegramUsername: `user-${id}`, deliveryMethod: "Post", status: "Submitted",
  hasInpostQr: qr, hasRoyalMailQr: false, hasQrCodes: false, qrPosted: posted,
});
const payload = {
  gbName: "HGH", orders: [order("split", true), order("posted", true, true), order("waiting", false), order("unallocated", false)],
  batches: [
    { id: "first", reference: "GB-TEST / 001", orderIds: ["split", "waiting"] },
    { id: "second", reference: "GB-TEST / 002", orderIds: ["split", "posted"] },
  ],
};
function button(el: ParentNode, text: string) {
  const found = [...el.querySelectorAll("button")].find(b => b.getAttribute("aria-label") === text || b.textContent?.replace(/\s+/g, " ").trim() === text || b.getAttribute("title") === text);
  expect(found, text).toBeTruthy();
  return found!;
}
async function choose(el: HTMLElement, id: string) {
  const select = el.querySelector('select[aria-label="Batch"]') as HTMLSelectElement;
  expect(select).toBeTruthy();
  await React.act(async () => { select.value = id; select.dispatchEvent(new Event("change", { bubbles: true })); });
}
it("combines batch, search and status filters, includes split orders in each batch, and never fetches QR images or posts while filtering", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json(payload));
  const el = document.createElement("div"); document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => root.render(<GbQrCodesPanel gbId="gb" mode="admin" adminSecret="test" />));
    expect(el.textContent).toContain("user-unallocated");
    await choose(el, "first");
    expect(el.textContent).toContain("user-split");
    expect(el.textContent).toContain("user-waiting");
    expect(el.textContent).not.toContain("user-posted");
    expect(el.textContent).not.toContain("user-unallocated");
    expect(button(el, "All 2")).toBeTruthy();
    await React.act(async () => button(el, "Waiting 1").click());
    expect(el.textContent).not.toContain("user-split");
    expect(el.textContent).toContain("user-waiting");
    await choose(el, "second");
    await React.act(async () => button(el, "All 2").click());
    expect(el.textContent).toContain("user-split");
    expect(el.textContent).toContain("user-posted");
    // Use the native setter so React observes the input change.
    const input = el.querySelector("input")!;
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "posted");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(el.textContent).not.toContain("user-split");
    expect(el.textContent).toContain("user-posted");
    expect(button(el, "All 1")).toBeTruthy();
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0][0])).toBe("/api/admin/group-buys/gb/all-orders-qr");
    expect(request.mock.calls[0][1]?.headers).toEqual({ "x-admin-secret": "test" });
  } finally { await React.act(async () => root.unmount()); }
});

it("does not broaden a removed selected batch on refresh and clears batch scope when changing group", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async input =>
    Response.json(String(input).includes("/other/") ? { gbName: "Other", orders: [order("other", false)], batches: [] } : payload));
  const el = document.createElement("div"); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<GbQrCodesPanel gbId="gb" mode="organiser" />));
    await choose(el, "first");
    request.mockResolvedValueOnce(Response.json({ ...payload, batches: [] }));
    await React.act(async () => button(el, "Refresh").click());
    expect(el.textContent).toContain("no longer available");
    expect(el.textContent).not.toContain("user-unallocated");
    expect(el.textContent).not.toContain("user-split");
    await React.act(async () => root.render(<GbQrCodesPanel gbId="other" mode="organiser" />));
    expect(el.textContent).toContain("user-other");
    expect(el.textContent).not.toContain("user-split");
    expect((el.querySelector('select[aria-label="Batch"]') as HTMLSelectElement).value).toBe("");
    expect(request.mock.calls.every(([, options]) => options?.credentials === "include")).toBe(true);
  } finally { await React.act(async () => root.unmount()); }
});

it("shows an empty batch without fallback and fails closed if a refresh cannot load batches", async () => {
  const request = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(Response.json({
    ...payload, batches: [...payload.batches, { id: "empty", reference: "GB-TEST / 003", orderIds: [] }],
  }));
  const el = document.createElement("div"); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<GbQrCodesPanel gbId="gb" mode="admin" adminSecret="test" />));
    await choose(el, "empty");
    expect(button(el, "All 0")).toBeTruthy();
    expect(el.textContent).not.toContain("user-unallocated");
    request.mockResolvedValueOnce(Response.json({ error: "Session expired" }, { status: 401 }));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await React.act(async () => button(el, "Refresh").click());
    expect(el.textContent).toContain("Session expired");
    expect(el.textContent).not.toContain("user-split");
    expect((el.querySelector('select[aria-label="Batch"]') as HTMLSelectElement).disabled).toBe(true);
    expect(request).toHaveBeenCalledTimes(2);
    log.mockRestore();
  } finally { await React.act(async () => root.unmount()); }
});

it("ignores a late response after switching groups, even if the fetch mock ignores abort", async () => {
  let finishOld!: (response: Response) => void;
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(input =>
    String(input).includes("/old/")
      ? new Promise<Response>(resolve => { finishOld = resolve; })
      : Promise.resolve(Response.json({ gbName: "New", orders: [order("new", false)], batches: [] })));
  const el = document.createElement("div"); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<GbQrCodesPanel gbId="old" mode="admin" adminSecret="test" />));
    await React.act(async () => root.render(<GbQrCodesPanel gbId="new" mode="admin" adminSecret="test" />));
    await React.act(async () => finishOld(Response.json(payload)));
    expect(el.textContent).toContain("user-new");
    expect(el.textContent).not.toContain("user-split");
    expect(request.mock.calls[0][1]?.signal?.aborted).toBe(true);
  } finally { await React.act(async () => root.unmount()); }
});
