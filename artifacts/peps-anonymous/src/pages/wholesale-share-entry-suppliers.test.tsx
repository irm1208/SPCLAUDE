import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations are not installed in this workspace.
import { JSDOM } from "jsdom";

const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "SVGElement"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
const { act } = await import("react");
let root: ReturnType<typeof createRoot>;
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

const state = vi.hoisted(() => ({ groups: [] as any[] }));
vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({}) }));
vi.mock("wouter", () => ({ useLocation: () => ["/wholesale/shared", vi.fn()] }));
vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ account: { isWholesale: true }, isLoading: false }) }));
vi.mock("@/components/PageLayout", () => ({ PageLayout: ({ children }: any) => children }));
vi.mock("@/components/WholesaleShell", () => ({ WholesaleShell: ({ children }: any) => children }));
vi.mock("@/hooks/use-wholesale-shares", () => ({
  useWholesaleShares: () => ({ data: [] }),
  useWholesalePublicGroups: () => ({ data: state.groups }),
  createWholesaleShare: vi.fn(), joinWholesaleShare: vi.fn(), setWholesaleShareHidden: vi.fn(),
}));
import WholesaleShareEntry from "./WholesaleShareEntry";

it.each([
  [[{ id: "uther", name: "Uther" }], "Uther", "JBG/YT"],
  [[{ id: "jbg", name: "JBG/YT" }], "JBG/YT", "Uther"],
  [[{ id: "uther", name: "Uther" }, { id: "jbg", name: "JBG/YT" }], "Uther, JBG/YT", null],
])("shows allowed suppliers on a joinable card: %j", async (allowedVendors, names, excluded) => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ vendors: [] }) })));
  state.groups = [{
    id: "public-share", organiserUsername: "owner", country: "UK",
    memberCount: 1, totalKits: 0, isMember: false, isFull: false, allowedVendors,
  }];
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<WholesaleShareEntry />));
  const text = container.textContent!;
  expect(text).toContain(`Allowed suppliers: ${names}`);
  if (excluded) expect(text).not.toContain(excluded);
  expect([...container.querySelectorAll("button")].some(b => b.textContent === "Join" && !b.disabled)).toBe(true);
  expect(text).not.toContain("Ordered from");
});
