import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed.
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { SupplierMessageEditor } = await import("./SupplierMessageEditor");
const { SupplierMessage } = await import("../wholesale/SupplierMessage");
afterEach(() => { vi.restoreAllMocks(); document.body.innerHTML = ""; });

it("saves the selected supplier's message with Admin auth and allows blank messages to remove it", async () => {
  const onSaved = vi.fn();
  const fetcher = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true, json: async () => ({ vendorId: "jbg-id", message: "" }) } as Response);
  const el = document.createElement("div"); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<SupplierMessageEditor secret="fixture" vendorId="jbg-id" vendorName="JBG/YT" initialMessage="" onSaved={onSaved} />));
    expect(el.textContent).toContain("JBG/YT — message on wholesale page");
    await React.act(async () => el.querySelector("button")!.click());
    const [path, options] = fetcher.mock.calls[0];
    expect(path).toBe("/api/admin/wholesale-vendors/jbg-id/message");
    expect(options?.method).toBe("PATCH");
    expect(options?.credentials).toBe("include");
    expect((options?.headers as any)["x-admin-secret"]).toBe("fixture");
    expect(JSON.parse(String(options?.body))).toEqual({ message: "" });
    expect(onSaved).toHaveBeenCalledWith("");
    expect(el.textContent).toContain("Supplier message saved.");
  } finally { await React.act(async () => root.unmount()); }
});
it("shows API errors without reporting a successful save", async () => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: false, json: async () => ({ error: "Session expired" }) } as Response);
  const el = document.createElement("div"); const root = createRoot(el); const onSaved = vi.fn();
  try {
    await React.act(async () => root.render(<SupplierMessageEditor secret="fixture" vendorId="jbg-id" vendorName="JBG/YT" initialMessage="Lead time" onSaved={onSaved} />));
    await React.act(async () => el.querySelector("button")!.click());
    expect(el.querySelector('[role="alert"]')?.textContent).toBe("Session expired");
    expect(onSaved).not.toHaveBeenCalled();
  } finally { await React.act(async () => root.unmount()); }
});
it("renders only the current supplier's text, never executes HTML, and hides empty messages", async () => {
  const el = document.createElement("div"); const root = createRoot(el);
  try {
    await React.act(async () => root.render(<SupplierMessage vendor={{ id: "a", name: "JBG/YT", wholesaleMessage: "<b>Lead time</b>\n5 days" }} />));
    expect(el.textContent).toContain("<b>Lead time</b>");
    expect(el.querySelector("b")).toBeNull();
    await React.act(async () => root.render(<SupplierMessage vendor={{ id: "b", name: "Uther", wholesaleMessage: "Uther only" }} />));
    expect(el.textContent).toContain("Uther only");
    expect(el.textContent).not.toContain("Lead time");
    await React.act(async () => root.render(<SupplierMessage vendor={{ id: "b", name: "Uther", wholesaleMessage: "  " }} />));
    expect(el.textContent).toBe("");
    const page = readFileSync(new URL("../../pages/WholesaleOrder.tsx", import.meta.url), "utf8");
    expect(page).toContain("<SupplierMessage vendor={vendor} />");
  } finally { await React.act(async () => root.unmount()); }
});
