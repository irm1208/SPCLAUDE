import React, { act } from "react";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let Receipt: typeof import("./OrderReceivedButton").OrderReceivedButton;
beforeAll(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import("react-dom/client"));
  ({ OrderReceivedButton: Receipt } = await import("./OrderReceivedButton"));
});
afterAll(() => dom.window.close());

it("requires confirmation, handles errors, then reports the persisted receipt", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Only shipped orders can be marked as received." }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ status: "Completed", memberReceivedAt: "2026-10-18T10:00:00.000Z" }) });
  vi.stubGlobal("fetch", fetchMock);
  const div = document.createElement("div");
  document.body.append(div);
  const root = createRoot(div);
  const received = vi.fn();
  const click = async (text: string) => {
    const button = [...div.querySelectorAll("button")].find(b => b.textContent?.includes(text))!;
    expect(button).toBeTruthy();
    await act(async () => button.click());
  };
  try {
    await act(async () => root.render(<Receipt orderId="order/1" status="Shipped" onReceived={received} />));
    await click("Mark as received");
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Cancel");
    expect(fetchMock).not.toHaveBeenCalled();
    await click("Mark as received");
    await click("Yes, I've received it");
    expect(div.querySelector('[role="alert"]')?.textContent).toContain("Only shipped");
    expect(received).not.toHaveBeenCalled();
    await click("Yes, I've received it");
    expect(fetchMock).toHaveBeenLastCalledWith("/api/account/orders/order%2F1/received", expect.objectContaining({ method: "POST", credentials: "include" }));
    expect(received).toHaveBeenCalledWith({ status: "Completed", memberReceivedAt: "2026-10-18T10:00:00.000Z" });
    await act(async () => root.render(<Receipt orderId="order/1" status="Completed" memberReceivedAt="2026-10-18T10:00:00.000Z" onReceived={received} />));
    expect(div.textContent).toContain("You confirmed receipt");
    expect(div.querySelector("button")).toBeNull();
    for (const status of ["Submitted", "Processing", "Cancelled", "Completed"]) {
      await act(async () => root.render(<Receipt orderId="order/1" status={status} onReceived={received} />));
      expect(div.querySelector("button")).toBeNull();
    }
  } finally {
    await act(async () => root.unmount());
    div.remove();
    vi.unstubAllGlobals();
  }
});
