// @ts-expect-error jsdom declarations are not installed in this workspace.
import { JSDOM } from "jsdom";
import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { LinkedTelegramUsername } = await import("./LinkedTelegramUsername");
afterEach(() => vi.unstubAllGlobals());

async function renderLookup(linked = true) {
  const container = document.createElement("div");
  const root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await React.act(async () => root.render(
    <QueryClientProvider client={client}>
      <LinkedTelegramUsername username="website_name" secret="test-session" linked={linked} />
    </QueryClientProvider>,
  ));
  const flush = async () => {
    await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 20)); });
  };
  const close = async () => { await React.act(async () => root.unmount()); client.clear(); };
  return { container, flush, close };
}

it("automatically shows the actual bot username without a show-username click", async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ linked: true, username: "different_telegram_name" }) });
  vi.stubGlobal("fetch", fetcher);
  const ui = await renderLookup();
  try {
    await ui.flush();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(ui.container.textContent).not.toContain("Show username");
    expect(fetcher.mock.calls[0][0]).toBe("/api/admin/accounts/website_name/telegram-profile");
    expect(ui.container.textContent).toContain("@different_telegram_name");
    expect(ui.container.textContent).not.toContain("website_name");
    expect(ui.container.querySelector("a")?.href).toBe("https://t.me/different_telegram_name");
  } finally { await ui.close(); }
});

it("does not call Telegram for an unlinked account", async () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  const ui = await renderLookup(false);
  try {
    expect(ui.container.textContent).toContain("Not linked");
    expect(fetcher).not.toHaveBeenCalled();
  } finally { await ui.close(); }
});

it("clearly labels linked Telegram accounts without a public username", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ linked: true, username: null }) }));
  const ui = await renderLookup();
  try {
    await ui.flush();
    expect(ui.container.textContent).toContain("No public username set");
    expect(ui.container.querySelector("a")).toBeNull();
  } finally { await ui.close(); }
});

it("shows a retry option when Telegram cannot be reached", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: async () => ({ error: "Unavailable" }) }));
  const ui = await renderLookup();
  try {
    await ui.flush();
    expect(ui.container.textContent).toContain("Lookup unavailable");
    expect(ui.container.textContent).toContain("Retry");
    expect(ui.container.querySelector("a")).toBeNull();
  } finally { await ui.close(); }
});
