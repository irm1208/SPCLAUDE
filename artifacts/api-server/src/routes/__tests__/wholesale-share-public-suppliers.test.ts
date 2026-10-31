import { afterAll, beforeAll, expect, it, vi } from "vitest";
import express from "express";
import type { Server } from "node:http";

const state = vi.hoisted(() => ({
  shares: [] as any[],
  vendors: [{ id: "uther", name: "Uther" }, { id: "jbg", name: "JBG/YT" }],
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, pool: {}, db: {
    select: () => ({ from: () => ({ where: () => {
      const rows: any = Promise.resolve([]);
      rows.orderBy = async () => state.shares;
      return rows;
    } }) }),
  } };
});
vi.mock("../config", () => ({
  getVendors: async () => state.vendors,
  getEnabledWholesaleVendors: async () => state.vendors,
  getActiveWholesaleVendor: async () => state.vendors[0],
}));
vi.mock("../../middleware/require-wholesale", () => {
  const auth = (req: any, _res: any, next: any) => {
    req.wholesale = { telegramUsername: "browser" }; next();
  };
  return { requireWholesale: auth, requireWholesaleOrAdmin: auth };
});

let server: Server;
let base: string;
beforeAll(async () => {
  const app = express();
  app.use((await import("../wholesale-shares")).default);
  server = await new Promise<Server>(resolve => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  if (server) await new Promise<void>(resolve => server.close(() => resolve()));
});

it.each([
  [["uther"], [state.vendors[0]]],
  [["jbg"], [state.vendors[1]]],
  [["uther", "jbg"], state.vendors],
  [null, state.vendors],
])("lists allowed suppliers for policy %j without requiring any ordered items", async (allowedVendorIds, expected) => {
  state.shares = [{
    id: "public-share", creatorUsername: "owner", allowedVendorIds,
    createdAt: new Date("2026-10-31T00:00:00Z"),
  }];
  const response = await fetch(`${base}/wholesale-shares/public`);
  expect(response.status).toBe(200);
  const [card] = await response.json();
  expect(card.allowedVendorIds).toEqual(allowedVendorIds);
  expect(card.allowedVendors).toEqual(expected);
  expect(card.totalKits).toBe(0);
});
