// @ts-expect-error jsdom declarations are not installed in this workspace.
import { JSDOM } from "jsdom";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { AccountHandle, AdminAccountNames } = await import("./AccountHandle");

it("uses readable account handles in the actual Admin customer-card heading", () => {
  const page = readFileSync(new URL("../../pages/Admin.tsx", import.meta.url), "utf8");
  expect(/<p className="text-sm font-semibold text-foreground truncate"><AccountHandle username=\{row\.telegramUsername\} \/><\/p>/.test(page)).toBe(true);
});

it("loads names once for admin labels while actions retain the original account ID", async () => {
  const identity = "discord:1528489165962871026";
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ handles: { [identity]: "thelucky0407" } }) });
  vi.stubGlobal("fetch", fetcher);
  const action = vi.fn();
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(
      <AdminAccountNames secret="test-session">
        <button onClick={() => action(identity)}><AccountHandle username={identity} /></button>
        <AccountHandle username="telegram_name" />
        <AccountHandle username={identity} />
      </AdminAccountNames>,
    ));
    expect(container.textContent).toContain("thelucky0407");
    expect(container.textContent).toContain("telegram_name");
    expect(container.textContent).not.toContain("discord:");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0][0]).toBe("/api/admin/discord-handles");
    await React.act(async () => container.querySelector("button")!.click());
    expect(action).toHaveBeenCalledWith(identity);
    await React.act(async () => root.render(<AccountHandle username="telegram_name" />));
    expect(container.textContent).toBe("telegram_name");
  } finally {
    await React.act(async () => root.unmount());
    vi.unstubAllGlobals();
  }
});
