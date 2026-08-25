import { describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => ({
  order: null as Record<string, unknown> | null,
  updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  notifyUserFromTemplate: vi.fn().mockResolvedValue(undefined),
  callSageAI: vi.fn().mockResolvedValue("[]"),
}));

vi.mock("@workspace/db", async () => {
  const schema = await import("@workspace/db/schema");
  const fakeDb = {
    select: () => {
      let table = "";
      const builder: Record<string, unknown> = {
        from(value: unknown) {
          table = getTableName(value as never);
          return builder;
        },
        where() { return builder; },
        orderBy() { return builder; },
        limit() { return builder; },
        then(resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) {
          const rows = table === "orders" && mockState.order ? [mockState.order] : [];
          return Promise.resolve(rows).then(resolve, reject);
        },
      };
      return builder;
    },
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: () => {
          mockState.updates.push({ table: getTableName(table as never), values });
          return Promise.resolve([]);
        },
      }),
    }),
  };
  return { ...schema, db: fakeDb, pool: {} };
});

vi.mock("../../middleware/require-admin", () => ({
  requireAdmin: () => true,
  getAdminUsername: () => "test-admin",
}));

vi.mock("../../lib/telegram", () => ({
  notifyUser: vi.fn(),
  sendAdminMessage: vi.fn(),
  sendTelegramMessage: vi.fn(),
  notifyUserFromTemplate: mockState.notifyUserFromTemplate,
  sendAdminFromTemplate: vi.fn(),
}));

vi.mock("../../lib/email", () => ({
  sendTemplatedEmail: vi.fn(),
}));

vi.mock("../../lib/sage-ai", () => ({
  callSageAI: mockState.callSageAI,
}));

import adminRouter from "../admin";

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

async function withServer<T>(fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server: Server = await new Promise(resolve => {
    const value = buildApp().listen(0, () => resolve(value));
  });
  try {
    const { port } = server.address() as AddressInfo;
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
}

describe("admin bulk tracking route", () => {
  it("sends timestamped Telegram messages to the AI as explicit ordered blocks", async () => {
    mockState.order = null;
    mockState.callSageAI.mockClear();

    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/orders/bulk-tracking/ai-parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawText: [
            "[25/08/2026 05:14] - TRACK-ONE",
            "Recipient: Example Person",
            "[25/08/2026 05:16] - TRACK-TWO",
            "The second tracking number is at the bottom.",
          ].join("\n"),
        }),
      });

      expect(response.status).toBe(200);
      const request = mockState.callSageAI.mock.calls[0]?.[0] as {
        messages: Array<{ content: string }>;
      };
      expect(request.messages[0].content).toContain("Telegram message 1 [25/08/2026 05:14]");
      expect(request.messages[0].content).toContain("Telegram message 2 [25/08/2026 05:16]");
    });
  });

  it("matches the bulk route, persists all tracking numbers, and skips duplicate shipment notifications", async () => {
    const items = [{ name: "Example item", qty: 2 }];
    mockState.order = {
      id: "order-1",
      code: "ORDER-1",
      status: "Processing",
      trackingNumber: null,
      trackingNumbers: null,
      trackingShippedItems: null,
      telegramUsername: "customer",
      groupBuyId: null,
      paymentStatus: "confirmed",
      grandTotal: "20.00",
      deliveryMethod: "Standard",
    };
    mockState.updates.length = 0;
    mockState.notifyUserFromTemplate.mockClear();

    await withServer(async baseUrl => {
      const first = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [{ code: "ORDER-1", trackingNumbers: [" TRACK-ONE ", "TRACK-TWO", "TRACK-ONE"], items }],
        }),
      });

      expect(first.status).toBe(200);
      expect(await first.json()).toMatchObject({
        succeeded: 1,
        failed: 0,
        results: [{ code: "ORDER-1", trackingNumber: "TRACK-ONE", ok: true }],
      });
      expect(mockState.updates).toHaveLength(1);
      expect(mockState.updates[0]).toMatchObject({
        table: "orders",
        values: {
          status: "Shipped",
          trackingNumber: "TRACK-ONE",
          trackingNumbers: ["TRACK-ONE", "TRACK-TWO"],
          trackingShippedItems: {
            "TRACK-ONE": items,
            "TRACK-TWO": items,
          },
        },
      });
      expect(mockState.notifyUserFromTemplate).toHaveBeenCalledTimes(1);

      mockState.order = {
        ...mockState.order,
        status: "Shipped",
        trackingNumber: "TRACK-ONE",
        trackingNumbers: ["TRACK-ONE", "TRACK-TWO"],
        trackingShippedItems: {
          "TRACK-ONE": items,
          "TRACK-TWO": items,
        },
      };
      mockState.updates.length = 0;
      mockState.notifyUserFromTemplate.mockClear();

      const retry = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [{ code: "ORDER-1", trackingNumbers: ["TRACK-ONE", "TRACK-TWO"], items }],
        }),
      });

      expect(retry.status).toBe(200);
      expect(await retry.json()).toMatchObject({ succeeded: 1, failed: 0 });
      expect(mockState.updates).toHaveLength(0);
      expect(mockState.notifyUserFromTemplate).not.toHaveBeenCalled();
    });
  });
});