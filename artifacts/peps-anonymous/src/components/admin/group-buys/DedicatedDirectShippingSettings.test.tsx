import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";
import type { Root } from "react-dom/client";
vi.mock("./shared/core", () => ({ apiUrl: (path: string) => `/api${path}` }));
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { DedicatedDirectShippingSettings } = await import("./DedicatedDirectShippingSettings");
let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); root = undefined; document.body.innerHTML = ""; vi.unstubAllGlobals(); });
it("saves a dedicated direct route with its 30-kit floor, without altering postage options", async () => {
  const gb = { id: "group", directShippingEnabled: false, name: "Test" };
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ...gb, directShippingEnabled: true, directShippingMinKits: "30.0" }) });
  vi.stubGlobal("fetch", fetcher);
  const el = document.createElement("div"); document.body.append(el);
  root = createRoot(el);
  const onUpdate = vi.fn();
  await act(async () => root!.render(createElement(DedicatedDirectShippingSettings, { gb: gb as never, secret: "test-admin", onUpdate })));
  expect(el.querySelector<HTMLInputElement>('input[type="number"]')!.value).toBe("30");
  await act(async () => el.querySelector<HTMLInputElement>('input[type="checkbox"]')!.click());
  await act(async () => el.querySelector<HTMLButtonElement>("button")!.click());
  const payload = JSON.parse(fetcher.mock.calls[0][1].body);
  expect(payload).toEqual({ directShippingEnabled: true, directShippingMinKits: 30, directShippingVendorId: null });
  expect(onUpdate).toHaveBeenCalledWith(expect.objectContaining({ directShippingEnabled: true }));
  expect(el.textContent).toContain("settings saved");
});
