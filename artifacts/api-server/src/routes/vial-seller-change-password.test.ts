import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { createHash } from "node:crypto";
import { getTableName } from "drizzle-orm";

const state = vi.hoisted(() => ({
  sellers: new Map<string, Record<string, unknown>>(),
  requestSellerId: null as string | null,
  update: null as Record<string, unknown> | null,
  logs: [] as unknown[][],
}));

vi.mock("@workspace/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/db")>();
  return {
    ...actual,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: async (condition: unknown) => {
            if (getTableName(table as never) !== "vial_vendors") return [];
            void condition;
            const seller = state.requestSellerId ? state.sellers.get(state.requestSellerId) : undefined;
            return seller ? [seller] : [];
          },
        }),
      }),
      update: () => ({
        set: (patch: Record<string, unknown>) => ({
          where: async () => {
            state.update = patch;
            const seller = state.requestSellerId ? state.sellers.get(state.requestSellerId) : undefined;
            if (seller) Object.assign(seller, patch);
          },
        }),
      }),
    },
  };
});

vi.mock("../lib/audit-log", () => ({
  writeLog: (...args: unknown[]) => { state.logs.push(args); return Promise.resolve(); },
}));
vi.mock("../lib/create-alert", () => ({ createAlert: async () => undefined }));
vi.mock("../lib/telegram", () => ({ sendTelegramMessage: async () => undefined }));

import vialShopRouter from "./vial-shop";

const secret = "test-secret";
const sellerId = "seller-1";
const currentPassword = "current-password";
const newPassword = "new-password";

function hashPassword(password: string): string {
  return createHash("sha256").update(password + ":" + secret).digest("hex");
}

async function put(body: unknown, headers: Record<string, string> = {}) {
  state.requestSellerId = headers["x-seller-id"] ?? null;
  const app = express();
  app.use(express.json());
  app.use(vialShopRouter);
  const server: Server = await new Promise(resolve => {
    const listening = app.listen(0, () => resolve(listening));
  });
  try {
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/vial/seller/password`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
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

async function putAsSeller(body: unknown, token = hashPassword(currentPassword)) {
  return put(body, { "x-seller-id": sellerId, "x-seller-token": token });
}

describe("Vial seller self-service password change", () => {
  beforeEach(() => {
    state.sellers.clear();
    state.requestSellerId = null;
    state.sellers.set(sellerId, {
      id: sellerId,
      name: "Verified Vials",
      sellerPasswordHash: hashPassword(currentPassword),
      resetCode: "reset-hash",
      resetCodeExpiresAt: new Date(),
    });
    state.sellers.set("seller-2", {
      id: "seller-2",
      name: "Other Vials",
      sellerPasswordHash: hashPassword("other-password"),
      resetCode: "other-reset",
      resetCodeExpiresAt: new Date(),
    });
    state.update = null;
    state.logs.length = 0;
    process.env.ADMIN_SECRET = secret;
  });

  it("requires seller authentication", async () => {
    const result = await put({ currentPassword, newPassword });

    expect(result.status).toBe(401);
    expect(state.update).toBeNull();
  });

  it("requires string passwords and validates the new password", async () => {
    expect((await putAsSeller({ currentPassword: 123, newPassword })).status).toBe(400);
    expect((await putAsSeller({ currentPassword, newPassword: "short" })).status).toBe(400);
    expect((await putAsSeller({ currentPassword, newPassword: currentPassword })).status).toBe(400);
    expect(state.update).toBeNull();
  });

  it("rejects an incorrect current password without changing the seller", async () => {
    const result = await putAsSeller({ currentPassword: "wrong-password", newPassword });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ error: "Invalid credentials" });
    expect(state.update).toBeNull();
    expect(state.sellers.get(sellerId)?.sellerPasswordHash).toBe(hashPassword(currentPassword));
  });

  it("replaces only the authenticated seller hash, clears reset state, audits safely, and invalidates the old token", async () => {
    const result = await putAsSeller({ currentPassword, newPassword });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: true });
    expect(state.update).toEqual({
      sellerPasswordHash: hashPassword(newPassword),
      resetCode: null,
      resetCodeExpiresAt: null,
    });
    expect(state.sellers.get("seller-2")?.sellerPasswordHash).toBe(hashPassword("other-password"));
    expect(state.logs).toHaveLength(1);
    expect(state.logs[0]).toContain("seller_password_changed");
    expect(JSON.stringify(state.logs[0])).not.toContain(currentPassword);
    expect(JSON.stringify(state.logs[0])).not.toContain(newPassword);

    expect((await putAsSeller({ currentPassword, newPassword }, hashPassword(currentPassword))).status).toBe(401);
    expect((await putAsSeller({ currentPassword: newPassword, newPassword }, hashPassword(newPassword))).status).toBe(400);
  });
});