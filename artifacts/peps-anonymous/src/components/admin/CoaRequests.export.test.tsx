import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error jsdom declarations are optional.
import { JSDOM } from "jsdom";
vi.mock("@/components/ui", () => ({
  Button: ({ children, variant, size, ...props }: any) => <button {...props}>{children}</button>,
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  Input: (props: any) => <input {...props} />,
  Label: (props: any) => <label {...props} />,
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));
vi.mock("@/lib/coa-api", async original => ({
  ...await original<any>(),
  coaApi: vi.fn().mockResolvedValue({ requests: [], groups: [{ id: "g1", name: "Synthetic group" }], config: null, orders: [], committed: 0 }),
}));
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const { createRoot } = await import("react-dom/client");
function change(element: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = element.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value")!.set!.call(element, value);
  element.dispatchEvent(new dom.window.Event(element.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
}
const { CoaRequests } = await import("./CoaRequests");
const { coaApi } = await import("@/lib/coa-api");
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  if (root) await React.act(async () => root!.unmount());
  root = undefined; container?.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});
async function mount() {
  container = document.createElement("div"); document.body.appendChild(container);
  root = createRoot(container);
  await React.act(async () => root!.render(<CoaRequests secret="synthetic-admin" />));
  await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
}
it("downloads paid TXT with group/search/batch filters but no unpaid-status restriction", async () => {
  await mount();
  await React.act(async () => {
    change(container.querySelector("select")!, "g1");
    change(container.querySelector<HTMLInputElement>('input[placeholder="Batch"]')!, "HG20");
    change(container.querySelector("input")!, "OmniQure");
    change(container.querySelectorAll("select")[1], "reserved");
  });
  const fetcher = vi.fn().mockResolvedValue(new Response("COA 1\n@member\nClient: OmniQure\n"));
  vi.stubGlobal("fetch", fetcher);
  const create = vi.fn().mockReturnValue("blob:coa-test");
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(dom.window.HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  const button = [...container.querySelectorAll("button")].find(b => b.textContent === "Export paid COAs as TXT")!;
  await React.act(async () => { button.click(); });
  expect(fetcher.mock.calls[0][0]).toBe("/api/admin/coa/export.txt?groupBuyId=g1&search=OmniQure&batch=HG20");
  expect(fetcher.mock.calls[0][1]).toMatchObject({ credentials: "include", headers: { "x-admin-secret": "synthetic-admin" } });
  expect(create).toHaveBeenCalledTimes(1);
  expect(click.mock.instances[0].download).toBe("coa-paid.txt");
});
it("shows the server's no-paid-COAs error instead of downloading a file", async () => {
  await mount();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "No paid COA requests match these filters." }), { status: 404 })));
  const create = vi.fn();
  vi.stubGlobal("URL", { createObjectURL: create, revokeObjectURL: vi.fn() });
  const button = [...container.querySelectorAll("button")].find(b => b.textContent === "Export paid COAs as TXT")!;
  await React.act(async () => { button.click(); });
  expect(container.textContent).toContain("No paid COA requests match these filters.");
  expect(create).not.toHaveBeenCalled();
  expect(button.disabled).toBe(false);
});
it("lets an organiser save their own wallet without accessing any Admin endpoint or notes", async () => {
  vi.mocked(coaApi).mockResolvedValue({
    requests: [], groups: [{ id: "g1", name: "Synthetic group" }],
    config: { mode: "open", fee: 65, currency: "USD", cap: 20, rails: [], manualInstructions: "Manual payment" },
    orders: [], committed: 0,
  });
  vi.mocked(coaApi).mockClear();
  container = document.createElement("div"); document.body.appendChild(container); root = createRoot(container);
  await React.act(async () => root!.render(<CoaRequests organiser groupBuyId="g1" />));
  await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 280)); });
  const add = [...container.querySelectorAll("button")].find(b => b.textContent === "Add receiving wallet")!;
  expect(add).toBeTruthy();
  await React.act(async () => add.click());
  await React.act(async () => change(container.querySelector('input[aria-label="COA wallet 1 receiving address"]')!, `0x${"b".repeat(40)}`));
  const save = [...container.querySelectorAll("button")].find(b => b.textContent === "Save settings")!;
  await React.act(async () => save.click());
  const call = vi.mocked(coaApi).mock.calls.find(([path, options]) => path.endsWith("/coa/settings") && options?.method === "PUT")!;
  expect(call[0]).toBe("/organiser/group-buys/g1/coa/settings");
  expect(JSON.parse(String(call[1]?.body)).rails).toEqual([{ currency: "USDT", network: "Ethereum", walletAddress: `0x${"b".repeat(40)}` }]);
  expect(vi.mocked(coaApi).mock.calls.every(([path]) => path.startsWith("/organiser/group-buys/g1/coa"))).toBe(true);
  expect(container.textContent).not.toContain("Internal notes (Admin only)");
  expect(container.querySelector('input[placeholder="Public receiving wallet address"]')).toBeTruthy();
});
