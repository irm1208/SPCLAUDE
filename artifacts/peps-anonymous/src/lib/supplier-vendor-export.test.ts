import { afterEach, expect, it, vi } from "vitest";
import { downloadSupplierVendorOrders } from "./supplier-vendor-export";
afterEach(() => vi.unstubAllGlobals());
it("downloads validated supplier text using an attached link", async () => {
  const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
  const append = vi.fn();
  vi.stubGlobal("document", { createElement: () => link, body: { appendChild: append } });
  const request = vi.fn(async () => ({ ok: true, json: async () => ({ text: "Order no. 12587\nNew Order:", filename: "supplier-uther.txt" }) }));
  vi.stubGlobal("fetch", request);
  await downloadSupplierVendorOrders("binding", "uther", ["12587"]);
  expect(append).toHaveBeenCalledWith(link);
  expect(link.click).toHaveBeenCalledOnce();
  expect(link.remove).toHaveBeenCalledOnce();
  expect(JSON.parse(request.mock.calls[0][1].body)).toEqual({ vendorId: "uther", orderCodes: ["12587"], format: "txt" });
});
it("rejects invalid export responses rather than downloading undefined", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({}) })));
  await expect(downloadSupplierVendorOrders("binding", "uther", ["12587"])).rejects.toThrow(/invalid|unexpected/i);
});
it("reports supplier setup errors and non-JSON server errors clearly", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400, json: async () => ({ error: "Set supplier cost for Product X" }) })));
  await expect(downloadSupplierVendorOrders("binding", "uther", ["12587"])).rejects.toThrow("Set supplier cost for Product X");
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 502, json: async () => { throw new SyntaxError(); } })));
  await expect(downloadSupplierVendorOrders("binding", "uther", ["12587"])).rejects.toThrow(/502/);
});
