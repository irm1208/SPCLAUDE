import { describe, expect, it, vi, beforeEach } from "vitest";
import express, { type Express } from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => ({
  adminAuthorized: true,
  returnedRows: [] as Array<{ id: string }>,
  transactionCalls: 0,
  transactionCommits: 0,
  transactionRollbacks: 0,
  deleteCalls: 0,
  deleteFailure: false,
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const fakeDb = {
    transaction: async (callback: (tx: unknown) => Promise<unknown>) => {
      mockState.transactionCalls++;
      const tx = {
        delete: (table: unknown) => ({
          where: () => {
            mockState.deleteCalls++;
            if (mockState.deleteFailure) {
              const failedResult = Promise.reject(new Error("database delete failed"));
              return Object.assign(failedResult, {
                returning: () => failedResult,
                table: getTableName(table as never),
              });
            }
            const result = Promise.resolve(mockState.returnedRows);
            return Object.assign(result, {
              returning: () => result,
              table: getTableName(table as never),
            });
          },
        }),
      };
      try {
        const result = await callback(tx);
        mockState.transactionCommits++;
        return result;
      } catch (error) {
        mockState.transactionRollbacks++;
        throw error;
      }
    },
    delete: (table: unknown) => ({
      where: () => {
        mockState.deleteCalls++;
        return Promise.resolve([]);
      },
    }),
  };
  return { ...schema, db: fakeDb, pool: {} };
});

vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    if (mockState.adminAuthorized) return true;
    res.status(403).json({ error: "Admin access required" });
    return false;
  },
  getAdminUsername: () => "test-admin",
}));

vi.mock("../../lib/telegram", () => ({
  notifyUser: vi.fn(),
  sendAdminMessage: vi.fn(),
  sendTelegramMessage: vi.fn(),
  notifyUserFromTemplate: vi.fn(),
  sendAdminFromTemplate: vi.fn(),
}));
vi.mock("../../lib/email", () => ({ sendTemplatedEmail: vi.fn() }));
vi.mock("../../lib/sage-ai", () => ({ callSageAI: vi.fn().mockResolvedValue("[]") }));

import adminRouter from "../admin";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

async function request(path: string, method: string, body: unknown) {
  const server: Server = await new Promise(resolve => {
    const value = buildApp().listen(0, () => resolve(value));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

beforeEach(() => {
  mockState.adminAuthorized = true;
  mockState.returnedRows = [];
  mockState.transactionCalls = 0;
  mockState.transactionCommits = 0;
  mockState.transactionRollbacks = 0;
  mockState.deleteCalls = 0;
  mockState.deleteFailure = false;
});

describe("admin product bulk delete route", () => {
  it("deletes all requested products in one transaction", async () => {
    mockState.returnedRows = [{ id: "product-1" }, { id: "product-2" }];
    const response = await request("/admin/products", "DELETE", { ids: ["product-1", "product-2"] });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deletedIds: ["product-1", "product-2"] });
    expect(mockState.transactionCalls).toBe(1);
    expect(mockState.transactionCommits).toBe(1);
  });

  it("deduplicates and trims IDs before deleting", async () => {
    mockState.returnedRows = [{ id: "product-1" }];
    const response = await request("/admin/products", "DELETE", {
      ids: [" product-1 ", "product-1"],
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, deletedIds: ["product-1"] });
  });

  it("rejects stale selections and rolls the transaction back", async () => {
    mockState.returnedRows = [{ id: "product-1" }];
    const response = await request("/admin/products", "DELETE", { ids: ["product-1", "product-2"] });
    expect(response.status).toBe(409);
    expect(mockState.transactionRollbacks).toBe(1);
    expect(mockState.transactionCommits).toBe(0);
  });

  it("returns 500 and rolls back when the database delete fails", async () => {
    mockState.deleteFailure = true;
    const response = await request("/admin/products", "DELETE", { ids: ["product-1"] });
    expect(response.status).toBe(500);
    expect(mockState.transactionRollbacks).toBe(1);
    expect(mockState.transactionCommits).toBe(0);
  });

  it.each([
    undefined, null, {}, { ids: [] }, { ids: [" "] }, { ids: [1] }, { ids: ["ok", ""] },
  ])("rejects malformed or empty input: %j", async body => {
    const response = await request("/admin/products", "DELETE", body);
    expect(response.status).toBe(400);
    expect(mockState.transactionCalls).toBe(0);
  });

  it("rejects unauthenticated requests before opening a transaction", async () => {
    mockState.adminAuthorized = false;
    const response = await request("/admin/products", "DELETE", { ids: ["product-1"] });
    expect(response.status).toBe(403);
    expect(mockState.transactionCalls).toBe(0);
  });

  it("leaves the existing single-delete route unchanged", async () => {
    const response = await request("/admin/products/product-1", "DELETE", undefined);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mockState.transactionCalls).toBe(0);
    expect(mockState.deleteCalls).toBe(1);
  });
});