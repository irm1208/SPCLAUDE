import { afterEach, beforeEach, expect, it, vi } from "vitest";
// @ts-expect-error workspace jsdom
import { JSDOM } from "jsdom";
const dom = new JSDOM("<!doctype html><html><body></body></html>");
const setup = () => {
  for (const key of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "Node"])
    vi.stubGlobal(key, key === "window" ? dom.window : dom.window[key]);
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
};
setup();
const api = vi.hoisted(() => ({ parcels: vi.fn(), createParcel: vi.fn(), updateParcel: vi.fn() }));
vi.mock("./api/organiser-api", () => ({ organiserApi: api }));
const { act, createElement } = await import("react");
const { createRoot } = await import("react-dom/client");
const { default: ParcelsTab } = await import("./ParcelsTab");
let root: ReturnType<typeof createRoot>;
const settle = () => act(async () => { await new Promise(r => setTimeout(r, 10)); });
const click = async (text: string) => {
  const button = [...document.querySelectorAll("button")].find(b => b.textContent?.trim() === text);
  expect(button, text).toBeTruthy();
  await act(async () => button!.click());
  await settle();
};
const input = async (placeholder: string, value: string) => {
  const el = document.querySelector(`input[placeholder="${placeholder}"]`) as HTMLInputElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!.call(el, value);
    el.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
};
const destination = async (value: string) => {
  const el = document.querySelector("select[data-testid=select-parcel-destination]") as HTMLSelectElement;
  expect(el).toBeTruthy();
  await act(async () => { el.value = value; el.dispatchEvent(new dom.window.Event("change", { bubbles: true })); });
};
beforeEach(() => {
  setup(); vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [
    { reshipperUsername: "alpha" }, { reshipperUsername: "beta" },
  ] })));
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  document.body.innerHTML = ""; vi.unstubAllGlobals();
});
const mount = async () => {
  const host = document.createElement("div"); document.body.append(host);
  root = createRoot(host);
  await act(async () => root.render(createElement(ParcelsTab, { selectedGbId: "G" })));
  await settle();
};
const parcel = { id: "P", label: "Existing parcel", carrier: "Special carrier", trackingNumber: "TRACK",
  status: "in_transit", items: [{ name: "Product", qty: 2, productId: "item" }],
  notes: "Keep notes", trackingUrl: "https://example.com/track", reshipperUsername: "alpha" };

it("creates a parcel with the chosen group reshipper", async () => {
  api.parcels.mockResolvedValue([]);
  api.createParcel.mockImplementation(async (_gb, body) => ({ id: "new", status: "pending", ...body }));
  await mount(); await click("Add Parcel");
  await destination("beta");
  await input("e.g. UK Batch 5 — Reshipper London", "New parcel");
  await input("e.g. RM123456789GB", "NEWTRACK");
  // Modal submit is the last matching Add Parcel button.
  await act(async () => [...document.querySelectorAll("button")].filter(b => b.textContent?.trim() === "Add Parcel").at(-1)!.click());
  await settle();
  expect(api.createParcel).toHaveBeenCalledWith("G", expect.objectContaining({ reshipperUsername: "beta", label: "New parcel" }));
  expect(document.body.textContent).toContain("Destination: @beta");
});

it("edits the saved reshipper, preserves item quantities and tracking status, and shows failures", async () => {
  api.parcels.mockResolvedValue([parcel]);
  api.updateParcel.mockRejectedValueOnce(new Error("Destination no longer assigned"))
    .mockImplementation(async (_gb, _id, body) => ({ ...parcel, ...body }));
  await mount();
  await act(async () => document.querySelector("button.w-full")!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
  await click("Edit parcel");
  expect((document.querySelector("[data-testid=select-parcel-destination]") as HTMLSelectElement).value).toBe("alpha");
  await destination("beta"); await click("Save Changes");
  expect(document.body.textContent).toContain("Destination no longer assigned");
  await click("Save Changes");
  expect(api.updateParcel).toHaveBeenLastCalledWith("G", "P", expect.objectContaining({
    reshipperUsername: "beta", items: parcel.items, carrier: parcel.carrier,
  }));
  expect(api.updateParcel.mock.calls.at(-1)![2]).not.toHaveProperty("status");
  expect(document.body.textContent).toContain("Destination: @beta");
  await click("Edit parcel");
  expect((document.querySelector("[data-testid=select-parcel-destination]") as HTMLSelectElement).value).toBe("beta");
});

it("preserves an untouched assignment and can explicitly clear it", async () => {
  api.parcels.mockResolvedValue([{ ...parcel, items: ["Plain item"] }]);
  api.updateParcel.mockImplementation(async (_gb, _id, body) => ({ ...parcel, items: ["Plain item"], ...body }));
  await mount();
  await act(async () => document.querySelector("button.w-full")!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })));
  await click("Edit parcel"); await click("Save Changes");
  expect(api.updateParcel.mock.calls.at(-1)![2]).not.toHaveProperty("reshipperUsername");
  await click("Edit parcel"); await destination(""); await click("Save Changes");
  expect(api.updateParcel).toHaveBeenLastCalledWith("G", "P", expect.objectContaining({ reshipperUsername: null }));
  expect(document.body.textContent).toContain("Destination not confirmed");
});
