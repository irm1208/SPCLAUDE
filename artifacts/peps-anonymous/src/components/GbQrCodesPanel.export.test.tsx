import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom declarations are optional.
import { JSDOM } from "jsdom";
const capture = vi.hoisted(() => ({ props: null as any }));
vi.mock("./royal-mail-labels/RoyalMailLabelsExport", () => ({
  RoyalMailLabelsExport: (props: any) => { capture.props = props; return <div data-export="open">Export review</div>; },
}));
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { GbQrCodesPanel } = await import("./GbQrCodesPanel");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; capture.props = null; });
function button(el: ParentNode, text: string) {
  const result = [...el.querySelectorAll("button")].find(item => item.textContent?.trim() === text || item.getAttribute("aria-label") === text);
  expect(result, text).toBeTruthy(); return result!;
}
it("passes only the intersection of batch, search, posting status and Royal Mail availability to bulk export and closes on scope changes", async () => {
  const make = (id: string, royal: boolean, posted = false) => ({
    id, code: id, telegramUsername: id, deliveryMethod: "Post", hasInpostQr: !royal, hasRoyalMailQr: royal, hasQrCodes: false, qrPosted: posted, status: "Submitted",
  });
  const request = vi.spyOn(globalThis, "fetch").mockImplementation(async () => Response.json({
    gbName: "HGH", orders: [make("match", true), make("posted", true, true), make("inpost", false), make("other-batch", true)],
    batches: [{ id: "first", reference: "GB-TEST / 001", orderIds: ["match", "posted", "inpost"] }],
  }));
  const el = document.createElement("div"); document.body.append(el); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<GbQrCodesPanel gbId="gb" mode="admin" adminSecret="test" />));
    const batch = el.querySelector("select")!;
    await React.act(async () => { batch.value = "first"; batch.dispatchEvent(new Event("change", { bubbles: true })); });
    await React.act(async () => button(el, "Not Posted 2").click());
    await React.act(async () => button(el, "Download all Royal Mail labels").click());
    expect(capture.props.orders.map((order: any) => order.id)).toEqual(["match"]);
    expect(capture.props.scopeDescription).toContain("GB-TEST / 001 · Not Posted");
    expect(capture.props.mode).toBe("admin");
    const input = el.querySelector("input")!;
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(input, "nothing");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(el.querySelector("[data-export]")).toBeNull();
    expect(button(el, "Download all Royal Mail labels").disabled).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  } finally { await React.act(async () => root.unmount()); }
});
