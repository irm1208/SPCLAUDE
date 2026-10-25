import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { getTableName } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { AddressInfo } from "node:net";

const state = vi.hoisted(() => ({
  tables: {} as Record<string, any[]>,
  rate: vi.fn(), send: vi.fn(), log: vi.fn().mockResolvedValue(undefined),
  verify: vi.fn(),
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const values = (query: any): string[] => {
    if (!query || typeof query !== "object") return [];
    if ("value" in query && typeof query.value === "string") return [query.value];
    return (query.queryChunks ?? (Array.isArray(query) ? query : [])).flatMap(values);
  };
  return { ...schema, db: {
    select: () => ({
      from: (table: any) => ({
        where: async (condition: any) => {
          const name = getTableName(table);
          const ids = values(condition);
          return (state.tables[name] ?? []).filter(row =>
            ids.includes(row.id) || ids.includes(row.code) || ids.includes(row.key) || ids.includes(row.orderId));
        },
      }),
    }),
    insert: (table: any) => ({
      values: (row: any) => {
        (state.tables[getTableName(table)] ??= []).push({ createdAt: new Date(), ...row });
        return Promise.resolve();
      },
    }),
    update: (table: any) => ({
      set: (patch: any) => ({
        where: (condition: any) => {
          const ids = values(condition);
          const rows = (state.tables[getTableName(table)] ?? []).filter(row => ids.includes(row.id));
          rows.forEach(row => Object.assign(row, patch));
          const result = Promise.resolve(rows);
          return Object.assign(result, { returning: () => result });
        },
      }),
    }),
  }};
});
vi.mock("../lib/crypto-pricing", async importOriginal => ({
  ...await importOriginal<typeof import("../lib/crypto-pricing")>(),
  fetchFiatToUsd: state.rate,
}));
vi.mock("../lib/payment-verify", () => ({
  verifyTransaction: state.verify,
  effectiveStableCurrency: (_base: string, _network: string, _wallet: string, chosen: string) => chosen || "USDT",
}));
vi.mock("../lib/telegram", () => ({ sendTelegramMessage: state.send }));
vi.mock("../lib/audit-log", () => ({ writeLog: state.log }));
vi.mock("../lib/create-alert", () => ({ createAlert: async () => undefined }));

import router from "./vial-shop";

async function request(path: string, body?: unknown, headers: Record<string, string> = {}, method?: string) {
  const app = express();
  app.use(express.json()); app.use(router);
  const server = app.listen(0);
  await new Promise<void>(resolve => server.once("listening", resolve));
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: method ?? (body ? "POST" : "GET"),
      headers: { "Content-Type": "application/json", ...headers },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, body: await response.json() as Record<string, any> };
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

const checkout = { items: [{ productId: "p-gbp", quantity: 1 }], telegramUsername: "buyer" };
const token = createHash("sha256").update("password:test-secret").digest("hex");
const sellerHeaders = { "x-seller-id": "v", "x-seller-token": token };

describe("vial checkout denomination and seller settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.rate.mockResolvedValue(1.3);
    state.send.mockResolvedValue(true);
    state.verify.mockResolvedValue({ verified: true });
    process.env.ADMIN_SECRET = "test-secret";
    state.tables = {
      vial_products: [
        { id: "p-gbp", name: "KLOW", price: "16.00", currency: "GBP", stock: 5, active: true, vendorId: "v" },
        { id: "p-eur", name: "Other", price: "20.00", currency: "EUR", stock: 5, active: true, vendorId: "v" },
      ],
      vial_vendors: [{ id: "v", name: "Store", walletAddress: `0x${"1".repeat(40)}`, telegramChatId: "123", notifyVendor: true, sellerPasswordHash: token }],
      vial_orders: [], vial_order_items: [], site_config: [],
    };
  });
  it("snapshots GBP and a converted payment, returning both to checkout and later reload", async () => {
    const result = await request("/vial/checkout", checkout);
    expect(result.status).toBe(201);
    expect(result.body).toMatchObject({ currency: "GBP", total: 16, subtotal: 16, paymentUsdAmount: 20.8 });
    expect(state.tables.vial_orders[0]).toMatchObject({ currency: "GBP", paymentUsdAmount: "20.80" });
    state.tables.vial_products[0].currency = "EUR";
    const loaded = await request(`/vial/orders/${result.body.id}`);
    expect(loaded.body).toMatchObject({ currency: "GBP", total: 16, paymentUsdAmount: 20.8 });
    expect(state.send).toHaveBeenCalledWith("123", expect.stringContaining("£16.00"), "HTML");
  });
  it("rejects mixed currencies before creating an order or looking up rates", async () => {
    const result = await request("/vial/checkout", { ...checkout, items: [...checkout.items, { productId: "p-eur", quantity: 1 }] });
    expect(result.status).toBe(400);
    expect(result.body.error).toContain("same currency");
    expect(state.tables.vial_orders).toHaveLength(0);
    expect(state.rate).not.toHaveBeenCalled();
  });
  it("does not create an order or notify the seller when FX fails", async () => {
    state.rate.mockRejectedValue(new Error("unavailable"));
    const result = await request("/vial/checkout", checkout);
    expect(result.status).toBe(503);
    expect(state.tables.vial_orders).toHaveLength(0);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("does not lose a placed order when Telegram rejects the message", async () => {
    state.send.mockResolvedValue(false);
    const result = await request("/vial/checkout", checkout);
    expect(result.status).toBe(201);
    expect(state.log).toHaveBeenCalledWith("seller", "warn", "vial_seller_notification_failed",
      expect.any(String), expect.objectContaining({ vendorId: "v" }));
  });
  it("rejects fractional quantities rather than silently truncating them", async () => {
    expect((await request("/vial/checkout", { ...checkout, items: [{ productId: "p-gbp", quantity: 1.5 }] })).status).toBe(400);
  });
  it("allows an authenticated seller to save and reload their Telegram settings", async () => {
    const saved = await request("/vial/seller/profile", { telegramChatId: " 456 ", notifyVendor: false }, sellerHeaders, "PUT");
    expect(saved.status).toBe(200);
    expect(saved.body).toMatchObject({ telegramChatId: "456", notifyVendor: false });
    expect((await request("/vial/seller/profile", undefined, sellerHeaders)).body)
      .toMatchObject({ telegramChatId: "456", notifyVendor: false });
  });
  it("does not allow anonymous notification changes or test messages", async () => {
    expect((await request("/vial/seller/profile", { notifyVendor: true }, {}, "PUT")).status).toBe(401);
    expect((await request("/vial/seller/telegram/test", {})).status).toBe(401);
    expect(state.send).not.toHaveBeenCalled();
  });
  it("rejects non-numeric destinations and invalid preference values", async () => {
    expect((await request("/vial/seller/profile", { telegramChatId: "@someone" }, sellerHeaders, "PUT")).status).toBe(400);
    expect((await request("/vial/seller/profile", { notifyVendor: "false" }, sellerHeaders, "PUT")).status).toBe(400);
  });
  it("reports failed test messages instead of claiming they were delivered", async () => {
    state.send.mockResolvedValue(false);
    expect((await request("/vial/seller/telegram/test", {}, sellerHeaders)).status).toBe(422);
    state.send.mockResolvedValue(true);
    expect((await request("/vial/seller/telegram/test", {}, sellerHeaders)).body.ok).toBe(true);
  });
  it("verifies both stablecoins against the locked converted amount, not the GBP face value", async () => {
    const created = await request("/vial/checkout", checkout);
    state.tables.vial_orders[0].orderStatus = "accepted";
    for (const cryptoCurrency of ["USDT", "USDC"]) {
      state.tables.vial_orders[0].paymentStatus = "unpaid";
      const paid = await request(`/vial/orders/${created.body.id}/pay`, {
        txHash: `0x${"2".repeat(64)}`, cryptoCurrency, shippingName: "Buyer", shippingAddress: "Test address",
      });
      expect(paid.status).toBe(200);
      expect(state.verify).toHaveBeenLastCalledWith(
        `0x${"2".repeat(64)}`, `0x${"1".repeat(40)}`, 20.8, cryptoCurrency, "ERC-20",
      );
    }
  });
});
