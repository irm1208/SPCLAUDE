import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";
vi.mock("./shared/core", () => ({ apiUrl: (path: string) => `/api${path}` }));
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { DedicatedDirectShippingSettings } = await import("./DedicatedDirectShippingSettings");
const client = new QueryClient();
let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; document.body.innerHTML = ""; client.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it("saves a dedicated direct route with its 30-kit floor, without altering postage options", async () => {
  const gb = { id: "group", directShippingEnabled: false, name: "Test" };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...gb, directShippingEnabled: true, directShippingMinKits: "30.0" }) });
  vi.stubGlobal("fetch", fetcher);
  const el = document.createElement("div"); document.body.append(el);
  root = createRoot(el);
  const onUpdate = vi.fn();
  await act(async () => root!.render(createElement(QueryClientProvider, { client }, createElement(DedicatedDirectShippingSettings, { gb: gb as never, secret: "test-admin", onUpdate }))));
  expect(el.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe("30");
  await act(async () => el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await act(async () => el.querySelector<HTMLButtonElement>("button")!.click());
  const payload = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload).toEqual({ directShippingEnabled: true, directShippingMinKits: 30, directShippingVendorId: null, directShippingMessage: null });
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ directShippingEnabled: true }));
  expect(el.textContent).toContain("settings saved");
});
it.each([["Custom supplier delivery instructions.", "Custom supplier delivery instructions."], ["", null]])(
  "saves editable copy %s on this GB, refreshes member data, and loads saved copy",
  async (text, expected) => {
    const gb = { id: "gb-a", directShippingEnabled: true, directShippingMinKits: 30, directShippingVendorId: null, directShippingMessage: "Old instructions" };
    const saved = { ...gb, directShippingMessage: expected };
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => saved });
    vi.stubGlobal("fetch", fetchMock);
    const onUpdate = vi.fn(), invalidate = vi.spyOn(client, "invalidateQueries");
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    const draw = (data: typeof saved) => createElement(QueryClientProvider, { client },
      createElement(DedicatedDirectShippingSettings, { gb: data as never, secret: "test-only", onUpdate }));
    await act(async () => root!.render(draw(gb)));
    const input = host.querySelector("textarea")!;
    expect(input.value).toBe("Old instructions");
    expect(input.maxLength).toBe(500);
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!.call(input, text);
      input.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    });
    await act(async () => host.querySelector("button")!.click());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/admin/group-buys/gb-a");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({
      directShippingMessage: expected, directShippingMinKits: 30, directShippingEnabled: true,
    });
    expect(onUpdate).toHaveBeenCalledWith(saved);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["gb-direct-shipping-info", "gb-a"] });
    await act(async () => root!.render(draw(saved)));
    expect(input.value).toBe(expected ?? "");
    await act(async () => root!.render(draw({ ...saved, id: "gb-b", directShippingMessage: "Different group" })));
    expect(input.value).toBe("Different group");
  },
);
