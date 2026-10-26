import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import { getTableName } from "drizzle-orm";

const state = vi.hoisted(() => ({ tables: {} as Record<string, any[]>, adminAllowed: true }));
vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: {
    select: () => ({
      from: (table: any) => {
        const rows = state.tables[getTableName(table)] ?? [];
        return Object.assign(Promise.resolve(rows), {
          orderBy: async () => rows,
          where: () => ({ orderBy: async () => rows }),
        });
      },
    }),
  } };
});
vi.mock("../middleware/require-admin", () => ({
  requireAdmin: (_req: unknown, res: any) => {
    if (!state.adminAllowed) res.status(401).json({ error: "Admin authentication required" });
    return state.adminAllowed;
  },
}));
vi.mock("../lib/audit-log", () => ({ writeLog: vi.fn() }));
vi.mock("../lib/telegram", () => ({ sendTelegramMessage: vi.fn() }));
vi.mock("../lib/create-alert", () => ({ createAlert: vi.fn() }));
import router from "./vial-shop";

async function summary() {
  const app = express();
  app.use(router);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/admin/vial/sellers`);
    return { status: response.status, body: await response.json() as Record<string, any>[] };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

function addOrder(id: string, currency: string | null, amount: string, paymentStatus = "confirmed", productId = "p") {
  state.tables.vial_orders.push({ id, currency, paymentStatus, total: "999.00", paymentUsdAmount: "1234.56" });
  state.tables.vial_order_items.push({ id: `item-${id}`, orderId: id, productId, lineTotal: amount });
}

describe("seller revenue by recorded pricing currency", () => {
  beforeEach(() => {
    state.adminAllowed = true;
    state.tables = {
      vial_vendors: [{ id: "v", name: "Seller" }, { id: "empty", name: "No sales" }],
      vial_products: [{ id: "p", vendorId: "v", currency: "EUR", active: true }, { id: "other", vendorId: "another" }],
      vial_orders: [], vial_order_items: [], audit_logs: [],
    };
  });

  it("separates GBP/EUR/USD, stablecoins and legacy unknowns without using current product currency or settlement locks", async () => {
    addOrder("gbp", "GBP", "12.30");
    addOrder("eur", "EUR", "20.00");
    addOrder("usd", "USD", "3.00");
    addOrder("gbp2", "GBP", "0.20");
    addOrder("usdt", "USDT", "4.00");
    addOrder("legacy", null, "7.00");
    addOrder("legacy-no-lock", null, "2.00");
    state.tables.vial_orders.at(-1).paymentUsdAmount = null;
    const before = structuredClone(state.tables);
    const { status, body } = await summary();
    expect(status).toBe(200);
    expect(body[0].revenueByCurrency).toEqual([
      { currency: "EUR", total: 20 },
      { currency: "GBP", total: 12.5 },
      { currency: "USD", total: 3 },
      { currency: "USDT", total: 4 },
      { currency: null, total: 9 },
    ]);
    expect(body[0]).not.toHaveProperty("totalRevenue");
    expect(state.tables).toEqual(before);
  });

  it("preserves confirmed-only gross item revenue, all-payment order counts and seller scope", async () => {
    addOrder("paid", "GBP", "10.00");
    // Multiple seller lines count once as an order, but all contribute to revenue.
    state.tables.vial_order_items.push({ id: "extra", orderId: "paid", productId: "p", lineTotal: "1.00" });
    for (const status of ["unpaid", "pending", "test_confirmed", "failed"]) {
      addOrder(status, "GBP", "50.00", status);
    }
    addOrder("foreign", "GBP", "100.00", "confirmed", "other");
    state.tables.vial_order_items.push({ id: "orphan", orderId: "missing", productId: "p", lineTotal: "9.00" });
    const { body } = await summary();
    expect(body[0]).toMatchObject({ revenueByCurrency: [{ currency: "GBP", total: 11 }], totalOrders: 6 });
    expect(body[1]).toMatchObject({ revenueByCurrency: [], totalOrders: 0 });
  });

  it("keeps recorded zero totals and legacy zero totals visible, without inventing a default currency", async () => {
    addOrder("zero", "USD", "0.00");
    addOrder("unknown-zero", null, "0.00");
    const { body } = await summary();
    expect(body[0].revenueByCurrency).toEqual([{ currency: "USD", total: 0 }, { currency: null, total: 0 }]);
  });

  it("does not expose summary data without admin access", async () => {
    state.adminAllowed = false;
    expect((await summary()).status).toBe(401);
  });
});
