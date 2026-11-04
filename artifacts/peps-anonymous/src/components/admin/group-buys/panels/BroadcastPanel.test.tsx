import React from "react";
import { afterEach, expect, it, vi } from "vitest";
// @ts-expect-error Optional jsdom declarations.
import { JSDOM } from "jsdom";
const dom = new JSDOM("<html><body></body></html>", { url: "https://example.test" });
for (const key of ["window", "document", "navigator", "HTMLElement", "Element", "Node", "MutationObserver", "Event", "MouseEvent"]) {
  Object.defineProperty(globalThis, key, { configurable: true, value: (dom.window as any)[key] });
}
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
vi.mock("../shared/core", () => ({ apiUrl: (path: string) => `/api${path}` }));
const { createRoot } = await import("react-dom/client");
// @ts-expect-error Existing workspace browser-test dependency.
const { fireEvent } = await import("../../../../../../../node_modules/.pnpm/@testing-library+dom@10.4.1/node_modules/@testing-library/dom/dist/index.js");
const { BroadcastSubTab } = await import("./BroadcastPanel");
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.innerHTML = ""; });

it("uses one existing composer and sends its selected batch through the existing endpoint", async () => {
  const calls: { url: string; body: any }[] = [];
  vi.stubGlobal("confirm", () => true);
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
    if (url.endsWith("/supplier-batches")) return Response.json({ batches: [
      { id: "b1", reference: "GB / 001", state: "ordered" },
      { id: "old", reference: "Released batch", state: "released" },
    ] });
    if (url.endsWith("/members?batchId=b1")) return Response.json([{ telegramUsername: "batch-member", hasTelegram: true }]);
    if (url.endsWith("/members")) return Response.json([{ telegramUsername: "batch-member", hasTelegram: true }, { telegramUsername: "outside", hasTelegram: true }]);
    if (url.endsWith("/broadcast")) return Response.json({ sent: 1, failed: 0, total: 1 });
    return Response.json([]);
  });
  const el = document.createElement("div"); document.body.append(el);
  const root = createRoot(el);
  try {
    await React.act(async () => { root.render(<BroadcastSubTab secret="synthetic" gb={{ id: "gb", name: "HGH" } as any} />); });
    expect(el.querySelectorAll("textarea")).toHaveLength(1);
    expect(el.textContent).not.toContain("Supplier batch messages");
    const batch = el.querySelector('select[aria-label="Filter by supplier batch"]')!;
    expect(batch).toBeTruthy();
    expect(batch.textContent).not.toContain("Released batch");
    await React.act(async () => { fireEvent.change(batch, { target: { value: "b1" } }); });
    await React.act(async () => { fireEvent.change(el.querySelector("textarea")!, { target: { value: "Delivery update" } }); });
    const send = [...el.querySelectorAll("button")].find(button => button.textContent === "Send to batch members")!;
    await React.act(async () => { fireEvent.click(send); });
    expect(calls.find(call => call.url.endsWith("/broadcast"))?.body).toMatchObject({ message: "Delivery update", batchId: "b1" });
    await React.act(async () => { fireEvent.click([...el.querySelectorAll("button")].find(button => button.textContent === "Select Recipients")!); });
    expect(el.textContent).toContain("batch-member");
    expect(el.textContent).not.toContain("@outside");
    await React.act(async () => { fireEvent.click(el.querySelector('input[type="checkbox"]')!); });
    await React.act(async () => { fireEvent.change(el.querySelector("textarea")!, { target: { value: "Selected member update" } }); });
    await React.act(async () => { fireEvent.click([...el.querySelectorAll("button")].find(button => button.textContent === "Send to 1 member")!); });
    expect(calls.filter(call => call.url.endsWith("/broadcast")).at(-1)?.body).toMatchObject({
      message: "Selected member update", batchId: "b1", targetUsernames: ["batch-member"],
    });
    await React.act(async () => { fireEvent.change(batch, { target: { value: "" } }); });
    expect(el.textContent).toContain("All Members (2)");
    expect(calls.some(call => /supplier-batches\/messages/.test(call.url))).toBe(false);
  } finally { await React.act(async () => root.unmount()); }
});
