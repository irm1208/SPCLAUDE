import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://vendor.example/" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Event", "Node"]) {
  vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const fetcher = vi.hoisted(() => vi.fn());
vi.mock("@/lib/vendor-auth-client", () => ({ vendorFetch: fetcher }));
vi.mock("@/components/VendorSecurity", () => ({ SecurityCard: () => null }));
const { createRoot } = await import("react-dom/client");
const { TelegramCard } = await import("./VendorExtras");

let root: ReturnType<typeof createRoot>;
let host: HTMLDivElement;
const token = "a".repeat(24);
let chats: any[] = [];
let completed = false;
let expired = false;
let popup: any;
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status });
const flush = () => new Promise(resolve => setTimeout(resolve, 0));
const find = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement;
async function click(id: string) { await act(async () => { find(id).click(); await flush(); }); }
async function mount() {
  await act(async () => { root.render(<TelegramCard />); await flush(); });
}
beforeEach(() => {
  host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  chats = []; completed = false; expired = false;
  popup = { opener: {}, closed: false, location: { replace: vi.fn() }, close: vi.fn(), document: { title: "", body: { textContent: "" } } };
  vi.spyOn(window, "open").mockReturnValue(popup);
  fetcher.mockReset().mockImplementation(async (path: string) => {
    if (path.endsWith("/link-status")) return json({ connected: completed, expired });
    if (path.endsWith("/link")) return json({ token, botUsername: "pepanonbot", expiresAt: new Date(Date.now() + 900_000).toISOString() });
    return json({ configured: true, botUsername: "pepanonbot", chats });
  });
});
afterEach(async () => {
  await act(async () => root.unmount()); host.remove(); vi.restoreAllMocks(); vi.useRealTimers();
  delete (window as any).Telegram;
});

describe("automatic vendor Telegram connection", () => {
  it("opens a window within the click, then navigates with the personal payload without copying", async () => {
    await mount();
    let resolve!: (r: Response) => void;
    fetcher.mockImplementationOnce(() => new Promise<Response>(r => { resolve = r; }));
    await click("button-connect-telegram");
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(popup.opener).toBeNull();
    await act(async () => { resolve(json({ token, botUsername: "pepanonbot", expiresAt: new Date(Date.now() + 900_000).toISOString() })); await flush(); });
    expect(popup.location.replace).toHaveBeenCalledWith(`https://t.me/pepanonbot?start=${token}`);
    expect(find("text-telegram-command")).toBeNull();
    expect(host.textContent).toContain("press Start");
  });
  it("opens a team-chat picker with the startgroup payload and keeps an actionable popup-blocked fallback", async () => {
    await mount();
    vi.mocked(window.open).mockReturnValue(null);
    await click("button-connect-telegram-group");
    expect((find("link-telegram-open") as HTMLAnchorElement).href).toBe(`https://t.me/pepanonbot?startgroup=${token}`);
    expect(host.textContent).toContain("Choose your Telegram group");
  });
  it("checks the exact token and automatically shows the connected chat without another click", async () => {
    await mount(); await click("button-connect-telegram");
    chats = [{ id: "chat1", chatId: "123", title: "Packing team", prefs: {}, createdAt: "2020-01-01", linkedBy: "vendor" }];
    completed = true;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 2200)); });
    const request = fetcher.mock.calls.find(([path]) => path.endsWith("/link-status"));
    expect(JSON.parse(request![1].body)).toEqual({ token });
    expect(find("panel-telegram-link")).toBeNull();
    expect(find("row-telegram-chat-chat1")).not.toBeNull();
    expect(host.textContent).toContain("Telegram connected");
  });
  it("closes the unused window on a link-creation error and never navigates it", async () => {
    await mount(); fetcher.mockImplementationOnce(async () => json({ error: "Unavailable" }, 503));
    await click("button-connect-telegram");
    expect(popup.close).toHaveBeenCalled();
    expect(popup.location.replace).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Unavailable");
  });
  it("uses the native opener only inside a real Telegram Mini App", async () => {
    const openTelegramLink = vi.fn();
    (window as any).Telegram = { WebApp: { initData: "synthetic-mini-app", openTelegramLink } };
    await mount(); await click("button-connect-telegram");
    expect(window.open).not.toHaveBeenCalled();
    expect(openTelegramLink).toHaveBeenCalledWith(`https://t.me/pepanonbot?start=${token}`);
  });
  it("keeps ordinary-browser popup protection when the Telegram SDK is loaded", async () => {
    const openTelegramLink = vi.fn();
    (window as any).Telegram = { WebApp: { initData: "", openTelegramLink } };
    await mount(); await click("button-connect-telegram");
    expect(window.open).toHaveBeenCalledTimes(1);
    expect(openTelegramLink).not.toHaveBeenCalled();
  });
  it("expires a pending connection with a retry instead of polling forever", async () => {
    await mount(); await click("button-connect-telegram");
    expired = true;
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 2200)); });
    expect(find("panel-telegram-link")).toBeNull();
    expect(find("button-connect-telegram")).not.toBeNull();
    expect(host.textContent).toContain("connection expired");
  });
  it("cancels polling when the vendor cancels connection", async () => {
    await mount(); await click("button-connect-telegram");
    await click("button-cancel-telegram");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 2200)); });
    expect(fetcher.mock.calls.some(([path]) => path.endsWith("/link-status"))).toBe(false);
    expect(find("panel-telegram-link")).toBeNull();
  });
});
