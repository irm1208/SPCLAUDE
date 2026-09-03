import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import { getTableName, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => {
  const state = {
    ordersByUsername: {} as Record<string, unknown[]>,
    mappings: [] as unknown[],
    products: [] as unknown[],
    mappingSelects: 0,
    authenticated: true,
    telegramUsername: "@RepeatBuyer",
    predicates: {} as Record<string, { sql: string; params: unknown[] }>,
    compilePredicate: null as null | ((predicate: SQL) => { sql: string; params: unknown[] }),
  };

  const makeSelect = () => {
    let table = "";
    let whereCalled = false;
    let limitValue: number | undefined;
    const builder = {
      from(value: unknown) {
        table = getTableName(value as never);
        if (table === "qiyunle_mappings") state.mappingSelects++;
        return builder;
      },
      where(predicate: SQL) {
        whereCalled = true;
        const compiled = state.compilePredicate?.(predicate);
        if (compiled) state.predicates[table] = compiled;
        return builder;
      },
      orderBy() { return builder; },
      limit(value: number) { limitValue = value; return builder; },
      then(resolve: (value: unknown[]) => unknown) {
        if (table === "orders" && (!whereCalled || limitValue !== 6)) {
          return Promise.reject(new Error("order access query must filter and limit to six rows"));
        }
        const rows = table === "orders"
          ? state.ordersByUsername[state.telegramUsername.replace(/^@/, "").toLowerCase()] ?? []
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

const dialect = new PgDialect();
mockState.state.compilePredicate = (predicate) => dialect.sqlToQuery(predicate);

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  return { ...schema, db: mockState.db };
});

vi.mock("../../middleware/require-wholesale", () => ({
  requireWholesale(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (!mockState.state.authenticated) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.wholesale = { telegramUsername: mockState.state.telegramUsername };
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
  mockState.state.ordersByUsername = {};
  mockState.state.mappings = [];
  mockState.state.products = [];
  mockState.state.mappingSelects = 0;
  mockState.state.authenticated = true;
  mockState.state.telegramUsername = "@RepeatBuyer";
  mockState.state.predicates = {};
});

describe("GET /wholesale/products batch access", () => {
  it("omits batchCode and does not query mappings for an ineligible wholesale account", async () => {
    mockState.state.ordersByUsername.repeatbuyer = Array.from({ length: 5 }, () => ({
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
    expect(mockState.state.predicates.orders).toMatchObject({
      sql: expect.stringContaining('lower("orders"."telegram_username")'),
      params: expect.arrayContaining([
        "repeatbuyer",
        "@repeatbuyer",
        "wholesale",
        "wholesale_shared",
        "Cancelled",
        "confirmed",
        "test_confirmed",
        "Completed",
      ]),
    });
  });

  it("adds one selected batchCode for an eligible wholesale account", async () => {
    mockState.state.ordersByUsername.repeatbuyer = Array.from({ length: 6 }, () => ({
      orderType: "wholesale_shared",
      status: "Submitted",
      paymentStatus: "confirmed",
      deletedAt: null,
    }));
    mockState.state.products = [product];
    mockState.state.mappings = [
      { productId: "p1", code: "BP10-9999", stock: null },
      { productId: "p1", code: "BP10-9998", stock: 0 },
      { productId: "p1", code: "BP10-9997", stock: -1 },
      { productId: "p1", code: "BP10-0712", stock: 8 },
      { productId: "p1", code: "BP10-0823", stock: 36 },
    ];

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject([{ id: "p1", batchCode: "BP10-0823" }]);
    expect(mockState.state.mappingSelects).toBe(1);
    expect(mockState.state.predicates.qiyunle_mappings).toMatchObject({
      sql: expect.stringContaining('"qiyunle_mappings"."batch_stock" > $1'),
      params: expect.arrayContaining([0, "p1"]),
    });
  });

  it("does not let another account's qualifying orders grant access", async () => {
    mockState.state.ordersByUsername.otherbuyer = Array.from({ length: 6 }, () => ({
      orderType: "wholesale",
      status: "Submitted",
      paymentStatus: "confirmed",
      deletedAt: null,
    }));
    mockState.state.products = [product];

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([expect.not.objectContaining({ batchCode: expect.anything() })]);
    expect(mockState.state.mappingSelects).toBe(0);
  });

  it("accepts bare and @-prefixed usernames without case sensitivity", async () => {
    mockState.state.telegramUsername = "RePeAtBuYeR";
    mockState.state.ordersByUsername.repeatbuyer = Array.from({ length: 6 }, () => ({
      orderType: "wholesale",
      status: "Submitted",
      paymentStatus: "confirmed",
      deletedAt: null,
    }));
    mockState.state.products = [product];

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(response.status).toBe(200);
    expect(mockState.state.mappingSelects).toBe(1);
  });

  it("skips mappings when no wholesale products are returned", async () => {
    mockState.state.ordersByUsername.repeatbuyer = Array.from({ length: 6 }, () => ({
      orderType: "wholesale",
      status: "Submitted",
      paymentStatus: "confirmed",
      deletedAt: null,
    }));

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(mockState.state.mappingSelects).toBe(0);
  });

  it("rejects unauthenticated requests before the handler", async () => {
    mockState.state.authenticated = false;

    const response = await withServer((base) => fetch(`${base}/wholesale/products`));

    expect(response.status).toBe(401);
    expect(mockState.state.mappingSelects).toBe(0);
  });
});