import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ rows: [] as { id: string }[], submit: vi.fn(), register: vi.fn() }));
vi.mock("@workspace/db", async () => {
  const real = await vi.importActual<any>("@workspace/db");
  const query: any = {};
  for (const method of ["from", "where", "orderBy"]) query[method] = () => query;
  query.limit = async () => state.rows;
  return { ...real, db: { select: () => query } };
});
vi.mock("./vendor-portal-service", () => ({ autoSubmitPaidVendorOrder: state.submit }));
vi.mock("./scheduler-registry", () => ({ registerScheduler: state.register }));
import { reconcilePaidVendorOrders, registerVendorPortalScheduler } from "./vendor-portal-worker";

describe("paid vendor routing worker", () => {
  beforeEach(() => { state.rows = []; state.submit.mockReset(); state.register.mockReset(); });
  it("processes later orders when one order is blocked and exposes the failure", async () => {
    state.rows = [{ id: "a" }, { id: "b" }];
    state.submit.mockImplementation(async id => { if (id === "a") throw new Error("Delivery details missing: phone"); });
    await expect(reconcilePaidVendorOrders()).rejects.toThrow(/a: Delivery details missing/);
    expect(state.submit.mock.calls.map(c => c[0])).toEqual(["a", "b"]);
    state.rows = [{ id: "a" }]; state.submit.mockResolvedValue(undefined);
    await expect(reconcilePaidVendorOrders()).resolves.toBeUndefined();
  });
  it("registers a periodic retry independent of opening admin", () => {
    registerVendorPortalScheduler();
    expect(state.register).toHaveBeenCalledWith(expect.objectContaining({ name: "vendor-portal-paid-orders", run: reconcilePaidVendorOrders }));
  });
});
