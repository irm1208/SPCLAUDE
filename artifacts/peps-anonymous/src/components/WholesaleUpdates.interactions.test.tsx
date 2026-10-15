import { act } from "react";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
// @ts-expect-error Existing workspace browser-test dependency.
import { JSDOM } from "../../../../node_modules/.pnpm/jsdom@26.1.0_bufferutil@4.1.0_utf-8-validate@6.0.6/node_modules/jsdom/lib/api.js";

vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ account: { telegramUsername: "reader" } }) }));
vi.mock("@/components/ImageLightbox", () => ({ ImageLightbox: () => null }));
let dom: JSDOM;
let createRoot: typeof import("react-dom/client").createRoot;
let WholesaleUpdates: typeof import("./WholesaleUpdates").WholesaleUpdates;
beforeAll(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) {
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
  }
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  ({ createRoot } = await import("react-dom/client"));
  ({ WholesaleUpdates } = await import("./WholesaleUpdates"));
});
afterAll(() => { dom?.window.close(); vi.unstubAllGlobals(); });

it("only hides an update after a successful save, and keeps failures visible for retry", async () => {
  const update = { id: "u1", title: "News", note: "Price changes", published: true,
    createdAt: "2026-10-15T12:00:00Z", updatedAt: "2026-10-15T12:00:00Z", imageUrl: null };
  let fail = true;
  const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === "POST") return new Response(JSON.stringify(fail ? { error: "Please retry" } : { ok: true }), { status: fail ? 500 : 200 });
    return new Response(JSON.stringify({ updates: [update] }));
  });
  vi.stubGlobal("fetch", fetchMock);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => { root.render(<WholesaleUpdates />); });
    expect(host.textContent).toContain("Price changes");
    await act(async () => { host.querySelector("article button")!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    expect(host.textContent).toContain("Price changes");
    expect(host.textContent).toContain("Please retry");
    fail = false;
    await act(async () => { host.querySelector("article button")!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
    expect(host.querySelector("article")).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith("/api/wholesale/updates/u1/read", expect.objectContaining({
      method: "POST", body: JSON.stringify({ updatedAt: update.updatedAt }),
    }));
    // A stale in-flight/poll response must not resurrect a just-read version.
    await act(async () => { window.dispatchEvent(new dom.window.Event("focus")); });
    expect(host.querySelector("article")).toBeNull();
  } finally {
    await act(async () => root.unmount());
    host.remove();
  }
});
