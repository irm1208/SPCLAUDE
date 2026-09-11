import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { getTableName } from "drizzle-orm";

const state = vi.hoisted(() => ({
  seller: {
    id: "seller-1",
    name: "Verified Vials",
    sellerPasswordHash: "old-hash",
    resetCode: "reset-hash",
    resetCodeExpiresAt: new Date(),
  } as Record<string, unknown> | null,
  update: null as Record<string, unknown> | null,
  logs: [] as unknown[][],
  adminAllowed: true,
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: async () => getTableName(table as never) === "vial_vendors"
            ? (state.seller ? [state.seller] : [])
            : [],
        }),
      }),
      update: () => ({
        set: (patch: Record<string, unknown>) => ({
          where: async () => {
            state.update = patch;
            if (state.seller) Object.assign(state.seller, patch);
          },
        }),
      }),
    },
  };
});

vi.mock("../middleware/require-admin", () => ({
  requireAdmin: (_req: unknown, res: { status: (code: number) => { json: (body: unknown) => void } }) => {
    if (!state.adminAllowed) {
      res.status(401).json({ error: "Admin authentication required" });
      return false;
    }
    return true;
  },
}));
vi.mock("../lib/audit-log", () => ({
  writeLog: (...args: unknown[]) => { state.logs.push(args); return Promise.resolve(); },
}));
vi.mock("../lib/create-alert", () => ({ createAlert: async () => undefined }));
vi.mock("../lib/telegram", () => ({ sendTelegramMessage: async () => undefined }));

import vialShopRouter from "./vial-shop";

async function put(path: string, body: unknown) {
  const app = express();
  app.use(express.json());
  app.use(vialShopRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return {
      status: response.status,
      body: response.headers.get("content-type")?.includes("application/json")
        ? JSON.parse(text)
        : text,
    };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("admin Vial seller password reset", () => {
  beforeEach(() => {
    state.seller = {
      id: "seller-1",
      name: "Verified Vials",
      sellerPasswordHash: "old-hash",
      resetCode: "reset-hash",
      resetCodeExpiresAt: new Date(),
    };
    state.update = null;
    state.logs.length = 0;
    state.adminAllowed = true;
    process.env.ADMIN_SECRET = "test-secret";
  });

  it("replaces the hash, clears reset state, and audits without the password", async () => {
    const result = await put("/admin/vial/sellers/seller-1/password", { newPassword: "new-password" });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true, message: "Seller password updated successfully." });
    expect(state.update).toEqual({
      sellerPasswordHash: expect.any(String),
      resetCode: null,
      resetCodeExpiresAt: null,
    });
    expect(state.update?.sellerPasswordHash).not.toBe("new-password");
    expect(state.logs[0]).toContain("seller_password_reset_by_admin");
    expect(JSON.stringify(state.logs[0])).not.toContain("new-password");

    const oldToken = "old-hash";
    const newToken = state.update?.sellerPasswordHash;
    expect((await requestSellerProducts(oldToken)).status).toBe(401);
    expect((await requestSellerProducts(String(newToken))).status).toBe(200);
  });

  it("rejects unauthenticated admins before reading or mutating the seller", async () => {
    state.adminAllowed = false;

    const result = await put("/admin/vial/sellers/seller-1/password", { newPassword: "new-password" });

    expect(result.status).toBe(401);
    expect(state.update).toBeNull();
    expect(state.seller?.sellerPasswordHash).toBe("old-hash");
  });

  it("rejects short passwords and missing or non-dashboard sellers", async () => {
    expect((await put("/admin/vial/sellers/seller-1/password", { newPassword: "short" })).status).toBe(400);
    expect(state.update).toBeNull();

    state.seller = null;
    expect((await put("/admin/vial/sellers/missing/password", { newPassword: "long-password" })).status).toBe(404);

    state.seller = { id: "seller-2", name: "Pending", sellerPasswordHash: null };
    expect((await put("/admin/vial/sellers/seller-2/password", { newPassword: "long-password" })).status).toBe(404);
  });
});

async function requestSellerProducts(token: string) {
  const app = express();
  app.use(vialShopRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/vial/seller/profile`, {
      headers: { "x-seller-id": "seller-1", "x-seller-token": token },
    });
    return { status: response.status };
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}