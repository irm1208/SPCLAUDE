// @ts-expect-error jsdom declarations are not installed in this workspace.
import { JSDOM } from "jsdom";
import { expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const dom = new JSDOM("<!doctype html><html><body></body></html>");
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
const React = await import("react");
const { createRoot } = await import("react-dom/client");
const { AccountHandle, AdminAccountNames, DiscordAccountId } = await import("./AccountHandle");
const { AccountTypeFilter } = await import("./AccountTypeFilter");

it("uses readable account handles in the actual Admin customer-card heading", () => {
  const page = readFileSync(new URL("../../pages/Admin.tsx", import.meta.url), "utf8");
  expect(page.includes("<AccountHandle username={row.telegramUsername} discordUsername={row.discordUsername} />")).toBe(true);
  expect(page.includes("<DiscordAccountId username={row.telegramUsername} discordId={row.discordId} />")).toBe(true);
  expect(page.includes('params.set("accountType", accountType)')).toBe(true);
});

it("hides Discord IDs until requested, preserves every digit and does not open the account", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    const openAccount = vi.fn();
    await React.act(async () => root.render(<div onClick={openAccount}><DiscordAccountId username="@discord:1528489165962871026" /></div>));
    expect(container.textContent).toBe("Show Discord ID");
    expect(container.textContent).not.toContain("1528489165962871026");
    await React.act(async () => container.querySelector("button")!.click());
    expect(container.textContent).toContain("Discord ID: 1528489165962871026");
    expect(container.querySelector("button")!.getAttribute("aria-expanded")).toBe("true");
    expect(openAccount).not.toHaveBeenCalled();
    await React.act(async () => container.querySelector("button")!.click());
    expect(container.textContent).toBe("Show Discord ID");
    await React.act(async () => root.render(<DiscordAccountId username="telegram_member" />));
    expect(container.textContent).toBe("");
  } finally {
    await React.act(async () => root.unmount());
  }
});

it("uses the row's saved Discord username without waiting for a separate directory request", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  try {
    await React.act(async () => root.render(<AccountHandle username="discord:1523097459885346830" discordUsername="serger1978" />));
    expect(container.textContent).toBe("serger1978");
    await React.act(async () => root.render(<AccountHandle username="website_name" discordUsername="discord_name" />));
    expect(container.textContent).toBe("website_name");
  } finally { await React.act(async () => root.unmount()); }
});

it("offers Discord, Telegram-linked and no-Telegram filters", async () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const change = vi.fn();
  try {
    await React.act(async () => root.render(<AccountTypeFilter value="all" onChange={change} />));
    expect([...container.querySelectorAll("option")].map(option => option.value)).toEqual(["all", "discord", "telegram", "non_telegram"]);
    const select = container.querySelector("select")!;
    for (const value of ["discord", "telegram", "non_telegram"]) {
      await React.act(async () => {
        select.value = value;
        select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      });
      expect(change).toHaveBeenLastCalledWith(value);
    }
  } finally { await React.act(async () => root.unmount()); }
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
