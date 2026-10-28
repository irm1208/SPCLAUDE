import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom is supplied by the workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/vendor/login" });
function setupDom() {
  for (const key of ["window", "document", "navigator", "location", "history", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  }
  vi.stubGlobal("addEventListener", dom.window.addEventListener.bind(dom.window));
  vi.stubGlobal("removeEventListener", dom.window.removeEventListener.bind(dom.window));
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
}
setupDom();
beforeEach(setupDom);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { Router } = await import("wouter");
const { memoryLocation } = await import("wouter/memory-location");
const { default: VendorLogin } = await import("./VendorLogin");
let root: ReturnType<typeof createRoot>;
let element: HTMLElement;
let path: ReturnType<typeof memoryLocation>;
async function render() {
  element = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(element);
  root = createRoot(element);
  path = memoryLocation({ path: "/vendor/login", static: false, record: true });
  await act(async () => root.render(createElement(QueryClientProvider, { client: new QueryClient({ defaultOptions: { queries: { retry: false } } }) },
    createElement(Router, { hook: path.hook }, createElement(VendorLogin)))));
  await settle();
}
async function settle() { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); }
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  dom.window.document.body.innerHTML = "";
  vi.unstubAllGlobals();
});
function fields() { return [...element.querySelectorAll("input")]; }
async function enterAndSubmit() {
  const inputs = fields();
  await act(async () => {
    const username = inputs.find(i => i.name === "telegramUsername")!;
    const password = inputs.find(i => i.name === "password")!;
    const nativeValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    nativeValue.call(username, "vendor-test");
    username.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
    nativeValue.call(password, "example-password");
    password.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
  await act(async () => element.querySelector("form")!.dispatchEvent(new dom.window.Event("submit", { bubbles: true, cancelable: true })));
  await settle();
}

it("is a separate vendor sign-in with no customer login or signup link", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ status: 401 }));
  await render();
  expect(element.textContent).toContain("Vendor sign in");
  expect(element.querySelector('a[href="/login"]')).toBeNull();
  expect(element.textContent?.toLowerCase()).not.toContain("sign up");
  expect(fields().some(i => i.name === "telegramUsername")).toBe(true);
});
it("signs in with existing credentials then checks vendor access before opening portal", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, opts?: RequestInit) => {
    calls.push(`${opts?.method ?? "GET"} ${url}`);
    if (url === "/api/account/login") return { ok: true, json: async () => ({ ok: true }) };
    if (url === "/api/vendor/me") return calls.includes("POST /api/account/login")
      ? { ok: true, status: 200, json: async () => ({ vendorId: "a" }) }
      : { status: 401 };
    throw new Error("Unexpected URL");
  }));
  await render();
  await enterAndSubmit();
  expect(calls).toEqual(["GET /api/vendor/me", "POST /api/account/login", "GET /api/vendor/me"]);
  expect(path.history?.at(-1)).toBe("/vendor");
});
it("rejects a valid member login without vendor access and offers account switching", async () => {
  const calls: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, opts?: RequestInit) => {
    calls.push(`${opts?.method ?? "GET"} ${url}`);
    if (url === "/api/account/login") return { ok: true, json: async () => ({ ok: true }) };
    if (url === "/api/vendor/me") return { status: calls.includes("POST /api/account/login") ? 403 : 401 };
    if (url === "/api/account/logout") return { ok: true };
    throw new Error("Unexpected URL");
  }));
  await render();
  await enterAndSubmit();
  expect(path.history?.at(-1)).toBe("/vendor/login");
  expect(element.textContent?.toLowerCase()).toContain("vendor access");
  const switchButton = [...element.querySelectorAll("button")].find(b => b.textContent?.includes("Switch account"))!;
  expect(switchButton).toBeDefined();
  await act(async () => switchButton.click());
  expect(calls).toContain("POST /api/account/logout");
});

it("does not pretend a failed account switch signed the current user out", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: string) =>
    url === "/api/vendor/me" ? { status: 403 } : { ok: false, status: 503 }));
  await render();
  const button = [...element.querySelectorAll("button")].find(b => b.textContent?.includes("Switch account"))!;
  await act(async () => button.click());
  await settle();
  expect(element.querySelector('[data-testid="state-forbidden"]')).not.toBeNull();
  expect(element.textContent).toContain("Could not sign out");
});
