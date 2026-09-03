import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => {
  const state = {
    orders: [] as unknown[],
    mappings: [] as unknown[],
    products: [] as unknown[],
    mappingSelects: 0,
  };

  const makeSelect = () => {
    let table = "";
    const builder = {
      from(value: unknown) {
        table = getTableName(value as never);
        if (table === "qiyunle_mappings") state.mappingSelects++;
        return builder;
      },
      where() { return builder; },
      orderBy() { return builder; },
      then(resolve: (value: unknown[]) => unknown) {
        const rows = table === "orders"
          ? state.orders
          : table === "qiyunle_mappings"
            ? state.mappings
            : state.products;
        return Promise.resolve(rows).then(resolve);
      },
    };
    return builder;
  };

  return { state, db: { select: () => makeSelect() } };
});

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: mockState.db };
});

vi.mock("../../middleware/require-wholesale", () => ({
  requireWholesale(req: express.Request, _res: express.Response, next: express.NextFunction) {
    req.wholesale = { telegramUsername: "@RepeatBuyer" };
    next();
  },
}));

import productsRouter, { wholesaleProductsHandler } from "../products";

const product = {
  id: "p1",
  name: "BPC",
  price: "25.00",
  wholesalePrice: "20.00",
  active: true,
  category: null,
  sortOrder: 1,
  vendor: null,
  mgSize: null,
  wholesaleEnabled: true,
  isNew: false,
  stock: 10,
  lowStockThreshold: 2,
};

async function withServer<T>(fn: (base: string) => Promise<T>): Promise<T> {
  const app = express();
  app.use(productsRouter);
  const server: Server = await new Promise((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

afterEach(() => {
  mockState.state.orders = [];
  mockState.state.mappings = [];
  mockState.state.products = [];
  mockState.state.mappingSelects = 0;
});

describe("GET /wholesale/products batch access", () => {
  it("omits batchCode and does not query mappings for an ineligible wholesale account", async () => {
    mockState.state.orders = Array.from({ length: 5 }, () => ({
      orderType: "wholesale",
      status: "Submitted",
      paymentStatus: "confirmed",
      deletedAt: null,
    }));
    mockState.state.products = [product];

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(wholesaleProductsHandler).toBeTypeOf("function");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([{
      id: "p1",
      name: "BPC",
      price: 20,
      retailPrice: 25,
      active: true,
      category: null,
      sortOrder: 1,
      vendor: null,
      mgSize: null,
      wholesaleEnabled: true,
      isNew: false,
      stock: 10,
      lowStockThreshold: 2,
    }]);
    expect(mockState.state.mappingSelects).toBe(0);
  });

  it("adds one selected batchCode for an eligible wholesale account", async () => {
    mockState.state.orders = Array.from({ length: 6 }, () => ({
      orderType: "wholesale_shared",
      status: "Submitted",
      paymentStatus: "confirmed",
      deletedAt: null,
    }));
    mockState.state.products = [product];
    mockState.state.mappings = [
      { productId: "p1", code: "BP10-0712", stock: 8 },
      { productId: "p1", code: "BP10-0823", stock: 36 },
    ];

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([{ id: "p1", batchCode: "BP10-0823" }]);
    expect(mockState.state.mappingSelects).toBe(1);
  });
});