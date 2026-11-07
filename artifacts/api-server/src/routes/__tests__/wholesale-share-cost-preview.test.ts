import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({ share: null as any, reads: [] as string[], members: [] as any[], orders: [] as any[] }));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, pool: {}, db: {
    select: () => ({ from: (table: any) => ({ where: () => {
      let data: any[];
      if (table === schema.wholesaleSharesTable) { state.reads.push("share"); data = state.share ? [state.share] : []; }
      else if (table === schema.wholesaleShareMembersTable) { state.reads.push("membership"); data = state.members; }
      else if (table === schema.ordersTable) { state.reads.push("orders"); data = state.orders; }
      else if (table === schema.accountsTable) { state.reads.push("addresses"); data = []; }
      else throw new Error("Unexpected private data query in invitation projection");
      const result: any = Promise.resolve(data); result.orderBy = async () => data;
      return result;
    } }) }),
    execute: async () => ({ rows: [] }),
  } };
});
vi.mock("../config", () => ({
  getVendors: async () => [],
  getEnabledWholesaleVendors: async () => [],
  getActiveWholesaleVendor: async () => null,
}));
vi.mock("../../middleware/require-wholesale", () => {
  const auth = (req: any, res: any, next: any) => {
    if (!req.headers["x-wholesale"]) return res.status(401).json({ error: "Authentication required" });
    req.wholesale = { telegramUsername: req.headers["x-wholesale"] }; next();
  };
  return { requireWholesale: auth, requireWholesaleOrAdmin: auth };
});
let server: Server, base: string;
beforeAll(async () => {
  const app = express(); app.use((await import("../wholesale-shares")).default);
  server = await new Promise<Server>(resolve => { const s = app.listen(0, "127.0.0.1", () => resolve(s)); });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => { if (server) await new Promise<void>(resolve => server.close(() => resolve())); });
beforeEach(() => {
  state.reads = [];
  state.members = []; state.orders = [];
  state.share = { id: "INVITE", status: "open", creatorUsername: "lead", deliveryUsername: "receiver",
    isPublic: true, organiserFlatFee: "10", feePerKit: "3",
    shippingAddress: "PRIVATE ADDRESS", leadPaypalEmail: "PRIVATE PAYMENT", organiserPaymentTxHash: "PRIVATE TX",
    createdAt: new Date("2026-11-01T00:00:00Z") };
});
describe("authorised nonmember shared-order cost preview", () => {
  it("adds only the fee allowlist to the existing invitation response and remains a nonmember", async () => {
    const response = await fetch(`${base}/wholesale-shares/INVITE`, { headers: { "x-wholesale": "new" } });
    expect(response.status).toBe(403);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    const body: any = await response.json();
    expect(Object.keys(body).sort()).toEqual(["costs", "creatorUsername", "error"]);
    expect(body.costs.organiser.amount).toBe(10);
    expect(body.costs.perKit.rate).toBe(3);
    expect(body.costs.onwardShipping.status).toBe("not_set");
    expect(JSON.stringify(body)).not.toContain("PRIVATE");
    expect(state.reads).toEqual(["share", "membership"]);
  });
  it("returns current settings on a later read rather than a cached zero fee", async () => {
    state.share.organiserFlatFee = "0";
    const first: any = await (await fetch(`${base}/wholesale-shares/INVITE`, { headers: { "x-wholesale": "new" } })).json();
    state.share.organiserFlatFee = "19";
    const next: any = await (await fetch(`${base}/wholesale-shares/INVITE`, { headers: { "x-wholesale": "new" } })).json();
    expect(first.costs.organiser.amount).toBe(0);
    expect(next.costs.organiser.amount).toBe(19);
  });
  it("does not expose a preview without wholesale authorisation or for a missing invitation", async () => {
    const denied = await fetch(`${base}/wholesale-shares/INVITE`);
    expect(denied.status).toBe(401);
    expect(state.reads).toEqual([]);
    state.share = null;
    const missing = await fetch(`${base}/wholesale-shares/MISSING`, { headers: { "x-wholesale": "new" } });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "Shared order not found" });
  });
  it("keeps a member's personal fee visible while their basket is open", async () => {
    state.members = [{ username: "member", items: [{ productId: "p", productName: "Sample", unitPrice: 20, quantity: 2 }],
      organiserFee: "8", tip: "0", joinedAt: new Date() }];
    const response = await fetch(`${base}/wholesale-shares/INVITE`, { headers: { "x-wholesale": "member" } });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.costs.stage).toBe("estimate");
    expect(body.costs.organiser.amount).toBe(8);
    expect(body.costs.perKit.amount).toBe(6);
    expect(body.costs.orderTotal).toBeNull();
    expect(body.costs.onwardShipping.status).toBe("not_set");
  });
  it("returns final order fees and total from the locked member order, not current rules", async () => {
    state.share.status = "locked";
    state.members = [{ username: "member", items: [], organiserFee: "99", orderId: "order", tip: "0", joinedAt: new Date() }];
    state.orders = [{ id: "order", organiserFee: "5", kitFees: "4", vendorShipping: "12", grandTotal: "101", paymentStatus: "confirmed", currency: "USD" }];
    const response = await fetch(`${base}/wholesale-shares/INVITE`, { headers: { "x-wholesale": "member" } });
    expect(response.status).toBe(200);
    const body: any = await response.json();
    expect(body.costs.stage).toBe("locked");
    expect(body.costs.organiser.amount).toBe(5);
    expect(body.costs.perKit.amount).toBe(4);
    expect(body.costs.vendorShipping.amount).toBe(12);
    expect(body.costs.orderTotal).toBe(101);
  });
});
