import { expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";

const api = vi.hoisted(() => ({
  groupBuy: vi.fn(),
  updateGroupBuy: vi.fn(),
}));
vi.mock("./api/organiser-api", () => ({ organiserApi: api }));
vi.mock("@/components/GroupBuyCoupons", () => ({ GroupBuyCoupons: () => null }));
vi.mock("@/components/group-buy-updates/GroupBuyUpdatesManager", () => ({ GroupBuyUpdatesManager: () => null }));

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
dom.window.HTMLElement.prototype.scrollIntoView = vi.fn();
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"]) {
  vi.stubGlobal(name, name === "window" ? dom.window : dom.window[name]);
}
vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { QueryClient, QueryClientProvider } = await import("@tanstack/react-query");
const { default: GbSettingsTab } = await import("./GbSettingsTab");

it("saves the credit choice for an existing group buy and restores it after reopening", async () => {
  let group = { id: "gb1", name: "Example", currency: "USD", allowCredits: true };
  api.groupBuy.mockImplementation(async () => ({ ...group }));
  api.updateGroupBuy.mockImplementation(async (_id, body) => {
    group = { ...group, ...body };
    return { ...group };
  });
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const render = async (key: string) => act(async () => {
    root.render(createElement(QueryClientProvider, { client, children:
      createElement(GbSettingsTab, { key, selectedGbId: "gb1" }),
    }));
  });
  try {
    await render("first");
    await act(async () => el.querySelector<HTMLButtonElement>('[data-section-id="access"]')!.click());
    const toggle = el.querySelector<HTMLInputElement>('[aria-label="Allow store credits"]')!;
    expect(toggle.checked).toBe(true);
    await act(async () => toggle.click());
    await act(async () => el.querySelector<HTMLButtonElement>(".gb-settings-atlas__save-button")!.click());
    expect(api.updateGroupBuy).toHaveBeenCalledWith("gb1", expect.objectContaining({ allowCredits: false }));
    await render("reopened");
    await act(async () => el.querySelector<HTMLButtonElement>('[data-section-id="access"]')!.click());
    expect(el.querySelector<HTMLInputElement>('[aria-label="Allow store credits"]')!.checked).toBe(false);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    el.remove();
  }
});
