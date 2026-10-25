import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
// @ts-expect-error Optional jsdom declarations are not installed in this workspace.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "localStorage", "HTMLElement", "HTMLTextAreaElement", "Element", "DocumentFragment", "Node", "MutationObserver", "Event", "CustomEvent", "MouseEvent", "KeyboardEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
const post = vi.hoisted(() => vi.fn(async () => {}));
const invalidate = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/use-wholesale-shares", () => ({
  useWholesaleShareMessages: () => ({ data: [{ id: "msg", body: "Hello group", senderUsername: "lead", createdAt: "2026-10-22T09:00:00Z" }], isLoading: false }),
  useInvalidateWholesaleShareMessages: () => invalidate,
  postWholesaleShareMessage: post,
}));
vi.mock("framer-motion", async () => {
  const { createElement } = await import("react");
  return { AnimatePresence: ({ children }: any) => children,
    motion: { div: ({ initial, animate, exit, transition, ...props }: any) => createElement("div", props) } };
});
const { act, createElement: h } = await import("react");
const { createRoot } = await import("react-dom/client");
const { ShareChat } = await import("./WholesaleShared");
let root: ReturnType<typeof createRoot>, host: HTMLDivElement, viewport: EventTarget & { height: number; offsetTop: number };
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  host = document.createElement("div"); host.style.transform = "translateY(0px)"; document.body.append(host);
  root = createRoot(host);
  viewport = Object.assign(new dom.window.EventTarget(), { height: 800, offsetTop: 0 });
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
});
afterEach(async () => { await act(async () => root.unmount()); host.remove(); });
const open = async (readOnly = false) => {
  await act(async () => root.render(h(ShareChat, { shareId: "share", readOnly })));
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Open group chat"]')!.click());
};
it("places the chat and backdrop above mobile navigation outside transformed page containers", async () => {
  await open();
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog).not.toBeNull();
  expect(host.contains(dialog)).toBe(false);
  expect(dialog.className).toContain("z-[81]");
  expect(document.querySelector('[data-chat-backdrop]')?.className).toContain("z-[80]");
  expect(dialog.querySelector("textarea")).not.toBeNull();
  await act(async () => dialog.querySelector<HTMLButtonElement>('[aria-label="Close chat"]')!.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("keeps the composer within the visible iPhone viewport when the keyboard opens", async () => {
  await open();
  await act(async () => { viewport.height = 350; viewport.offsetTop = 50; viewport.dispatchEvent(new Event("resize")); });
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog.style.getPropertyValue("--chat-viewport-height")).toBe("350px");
  expect(dialog.style.getPropertyValue("--chat-viewport-bottom")).toBe("400px");
  expect(dialog.querySelector("textarea")!.closest("[data-chat-composer]")?.className).toContain("shrink-0");
  const messages = dialog.querySelector<HTMLElement>("[data-chat-messages]")!;
  expect(messages.className).toContain("min-h-0");
  expect(messages.className).toContain("overflow-y-auto");
});
it("still sends a message and refreshes the thread", async () => {
  await open();
  const textarea = document.querySelector("textarea")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, "Test message");
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Send message"]')!.click());
  expect(post).toHaveBeenCalledWith("share", "Test message");
  expect(invalidate).toHaveBeenCalledWith("share");
  expect(textarea.value).toBe("");
});
it("preserves read-only cancelled chats and closes when the backdrop is tapped", async () => {
  await open(true);
  expect(document.querySelector("textarea")).toBeNull();
  expect(document.body.textContent).toContain("chat is read-only");
  await act(async () => document.querySelector<HTMLElement>("[data-chat-backdrop]")!.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("suppresses every floating navigation layer only while the chat panel exists", async () => {
  await open();
  expect(document.querySelector('[data-mobile-chat-panel]')).not.toBeNull();
  const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
  expect(css).toMatch(/body:has\(\[data-mobile-chat-panel\]\)\s+\[data-hub-navigation\]\s*\{[^}]*visibility:\s*hidden/s);
  expect(css).toMatch(/body:has\(\[data-mobile-chat-panel\]\)\s+\[data-hub-navigation\]\s*\{[^}]*pointer-events:\s*none/s);
  const navigation = readFileSync(new URL("../components/HubBottomNav.tsx", import.meta.url), "utf8");
  expect(navigation.match(/data-hub-navigation/g)).toHaveLength(3);
  const rule = document.createElement("style");
  rule.textContent = css.match(/body:has\(\[data-mobile-chat-panel\]\)\s+\[data-hub-navigation\]\s*\{[^}]*\}/s)![0];
  const menu = document.createElement("nav");
  menu.setAttribute("data-hub-navigation", "");
  document.head.append(rule);
  document.body.append(menu);
  try {
    expect(window.getComputedStyle(menu).visibility).toBe("hidden");
    expect(window.getComputedStyle(menu).pointerEvents).toBe("none");
    await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Close chat"]')!.click());
    expect(document.querySelector('[data-mobile-chat-panel]')).toBeNull();
    expect(window.getComputedStyle(menu).visibility).toBe("visible");
    expect(window.getComputedStyle(menu).pointerEvents).toBe("auto");
  } finally {
    rule.remove();
    menu.remove();
  }
});
it("repositions on Safari viewport scroll and restores the composer after the keyboard closes", async () => {
  await open();
  await act(async () => {
    viewport.height = 340; viewport.offsetTop = 60;
    viewport.dispatchEvent(new Event("scroll"));
  });
  const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
  expect(dialog.style.getPropertyValue("--chat-viewport-bottom")).toBe("400px");
  await act(async () => {
    viewport.height = 740; viewport.offsetTop = 0;
    viewport.dispatchEvent(new Event("resize"));
  });
  expect(dialog.style.getPropertyValue("--chat-viewport-height")).toBe("740px");
  expect(dialog.style.getPropertyValue("--chat-viewport-bottom")).toBe("60px");
  expect(document.querySelector('[aria-label="Send message"]')).not.toBeNull();
});
