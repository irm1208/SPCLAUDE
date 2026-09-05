import { describe, expect, it, vi } from "vitest";
import express, { type Express } from "express";
import { getTableName } from "drizzle-orm";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const mockState = vi.hoisted(() => ({
  adminAuthorized: true,
  casConflict: false,
  order: null as Record<string, unknown> | null,
  updates: [] as Array<{ table: string; values: Record<string, unknown> }>,
  notifyUser: vi.fn().mockResolvedValue(undefined),
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
          if (!mockState.casConflict) {
            mockState.updates.push({ table: getTableName(table as never), values });
          }
          const result = Promise.resolve(mockState.casConflict
            ? []
            : [{ id: mockState.order?.id ?? "order-1" }]);
          return Object.assign(result, { returning: () => result });
        },
      }),
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
  notifyUser: mockState.notifyUser,
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
  it("rejects an unauthenticated bulk write before reading or changing an order", async () => {
    mockState.adminAuthorized = false;
    mockState.updates.length = 0;
    try {
      await withServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lines: [{ code: "ORDER-1", trackingNumbers: ["TRACK"] }] }),
        });
        expect(response.status).toBe(403);
        expect(mockState.updates).toHaveLength(0);
      });
    } finally {
      mockState.adminAuthorized = true;
    }
  });

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

  it("returns the matched order's current flat and physical package tracking", async () => {
    const currentPackage = {
      id: "package-1", courier: "bmurfs",
      internationalTrackingNumber: "INTL", localTrackingNumber: null,
    };
    mockState.order = {
      id: "order-1", code: "ORDER-1", telegramUsername: "customer",
      status: "Shipped", trackingNumber: "INTL", trackingNumbers: ["INTL"],
      trackingPackages: [currentPackage], groupBuyId: "gb-1", sharedOrderId: null,
      shippingName: "Example Person", shippingPhone: null,
      shippingAddress: "1 Example Street", shippingCity: "London",
      shippingPostcode: "SW1A1AA", shippingCountry: "United Kingdom",
      grandTotal: "20.00", createdAt: new Date(),
    };
    mockState.callSageAI.mockResolvedValueOnce(JSON.stringify([{
      label: "shipment",
      trackingNumbers: ["INTL", "LOCAL"],
      trackingPackages: [],
      reviewWarnings: ["Confirm the explicit BMURFS roles"],
      items: [],
      address: {
        name: "Example Person", line1: "1 Example Street", city: "London",
        postcode: "SW1A1AA", country: "United Kingdom", phone: "",
      },
    }]));

    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/orders/bulk-tracking/ai-parse`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rawText: "Example shipment" }),
      });
      const body = await response.json() as { shipments: Array<{ match: unknown }> };
      expect(body.shipments[0].match).toMatchObject({
        currentTrackingNumber: "INTL",
        currentTrackingNumbers: ["INTL"],
        currentTrackingPackages: [currentPackage],
        currentTrackingSnapshot: JSON.stringify({
          numbers: ["INTL"],
          packages: [currentPackage],
        }),
      });
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

  it("applies an explicit BMURFS amendment as one physical package and labels both legs", async () => {
    mockState.order = {
      id: "order-1",
      code: "ORDER-1",
      status: "Shipped",
      trackingNumber: "SMEX6082643740",
      trackingNumbers: ["SMEX6082643740"],
      trackingPackages: null,
      trackingDetails: {},
      trackingShippedItems: { SMEX6082643740: [{ name: "Example", qty: 1 }] },
      telegramUsername: "customer",
      groupBuyId: null,
      sharedOrderId: null,
      orderType: "wholesale",
      paymentStatus: "confirmed",
      grandTotal: "20.00",
      deliveryMethod: "Standard",
    };
    mockState.updates.length = 0;
    mockState.notifyUserFromTemplate.mockClear();

    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lines: [{
            code: "ORDER-1",
            trackingPackages: [{
              id: "package-1",
              courier: "BMURFS Express",
              internationalTrackingNumber: "SMEX6082643740",
              localTrackingNumber: "HD358713635GB",
            }],
          }],
        }),
      });

      expect(response.status).toBe(200);
      expect(mockState.updates[0].values).toMatchObject({
        trackingNumber: "SMEX6082643740",
        trackingNumbers: ["SMEX6082643740", "HD358713635GB"],
        trackingPackages: [{
          id: "package-1",
          courier: "bmurfs",
          internationalTrackingNumber: "SMEX6082643740",
          localTrackingNumber: "HD358713635GB",
        }],
      });
      expect(mockState.notifyUserFromTemplate).toHaveBeenCalledTimes(1);
      expect(mockState.notifyUserFromTemplate.mock.calls[0]?.[3]?.tracking).toContain("Local courier");
    });
  });

  it("aggregates package append and same-international amendment without losing unrelated packages", async () => {
    const first = {
      id: "package-1", courier: "bmurfs",
      internationalTrackingNumber: "INTL-ONE", localTrackingNumber: null,
    };
    const unrelated = {
      id: "package-2", courier: "DHL",
      internationalTrackingNumber: "DHL-TWO", localTrackingNumber: null,
    };
    mockState.order = {
      id: "order-1", code: "ORDER-1", status: "Shipped",
      trackingNumber: "INTL-ONE", trackingNumbers: ["INTL-ONE", "DHL-TWO"],
      trackingPackages: [first, unrelated], trackingDetails: {},
      trackingShippedItems: { "DHL-TWO": [{ name: "Unrelated", qty: 1 }] },
      telegramUsername: "customer", groupBuyId: null, sharedOrderId: null,
      orderType: "wholesale", paymentStatus: "confirmed",
      grandTotal: "20.00", deliveryMethod: "Standard",
    };
    mockState.updates.length = 0;

    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [
          { code: "ORDER-1", trackingPackages: [{
            id: "package-3", courier: "UPS",
            internationalTrackingNumber: "UPS-THREE", localTrackingNumber: null,
          }], items: [{ name: "Third", qty: 3 }] },
          { code: "ORDER-1", trackingPackages: [{
            ...first, localTrackingNumber: "LOCAL-ONE",
          }], items: [{ name: "First", qty: 2 }] },
        ] }),
      });

      expect(response.status).toBe(200);
      const responseBody = await response.json() as {
        succeeded: number;
        failed: number;
        results?: Array<{ error?: string }>;
      };
      expect(responseBody.results?.[0]?.error).toBeUndefined();
      expect(responseBody).toMatchObject({ succeeded: 1, failed: 0 });
      expect(mockState.updates).toHaveLength(1);
      expect(mockState.updates[0].values.trackingPackages).toEqual([
        { ...first, localTrackingNumber: "LOCAL-ONE" },
        unrelated,
        {
          id: "package-3", courier: "UPS",
          internationalTrackingNumber: "UPS-THREE", localTrackingNumber: null,
        },
      ]);
      expect(mockState.updates[0].values.trackingShippedItems).toEqual({
        "INTL-ONE": [{ name: "First", qty: 2 }],
        "DHL-TWO": [{ name: "Unrelated", qty: 1 }],
        "UPS-THREE": [{ name: "Third", qty: 3 }],
      });
    });
  });

  it("rejects conflicting proposed pairs and duplicate identifiers at the route boundary", async () => {
    mockState.order = {
      id: "order-1", code: "ORDER-1", status: "Processing",
      trackingNumber: null, trackingNumbers: null, trackingPackages: null,
      trackingDetails: {}, telegramUsername: "customer", groupBuyId: null,
      sharedOrderId: null, orderType: "wholesale", paymentStatus: "confirmed",
      grandTotal: "20.00", deliveryMethod: "Standard",
    };
    mockState.updates.length = 0;

    await withServer(async baseUrl => {
      const conflicting = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [{
          code: "ORDER-1",
          trackingNumbers: ["NOT-THE-PAIR"],
          trackingPackages: [{
            id: "p1", courier: "bmurfs",
            internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
          }],
        }] }),
      });
      expect(await conflicting.json()).toMatchObject({ succeeded: 0, failed: 1 });

      const duplicate = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [{
          code: "ORDER-1",
          trackingPackages: [
            { id: "p1", courier: "DHL", internationalTrackingNumber: "DUP", localTrackingNumber: null },
            { id: "p2", courier: "UPS", internationalTrackingNumber: "dup", localTrackingNumber: null },
          ],
        }] }),
      });
      expect(await duplicate.json()).toMatchObject({ succeeded: 0, failed: 1 });
      expect(mockState.updates).toHaveLength(0);
    });
  });

  it("rejects shared-order pairing before applying an accompanying payment change", async () => {
    mockState.order = {
      id: "order-1", code: "ORDER-1", status: "Processing",
      trackingNumber: null, trackingNumbers: null, trackingPackages: null,
      trackingDetails: {}, telegramUsername: "customer",
      sharedOrderId: "share-1", orderType: "wholesale_shared",
      paymentStatus: "unpaid", grandTotal: "20.00", deliveryMethod: "Standard",
    };
    mockState.updates.length = 0;

    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/orders/order-1`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "confirmed",
          trackingPackages: [{
            id: "p1", courier: "bmurfs",
            internationalTrackingNumber: "INTL", localTrackingNumber: "LOCAL",
          }],
        }),
      });
      expect(response.status).toBe(400);
      expect(mockState.updates).toHaveLength(0);
    });
  });

  it("treats an identical single-order tracking save as a successful notification no-op", async () => {
    mockState.order = {
      id: "order-1", code: "ORDER-1", status: "Shipped",
      trackingNumber: "INTL", trackingNumbers: ["INTL"],
      trackingPackages: null, trackingDetails: {},
      trackingShippedItems: null, telegramUsername: "customer",
      groupBuyId: null, sharedOrderId: null, orderType: "wholesale",
      paymentStatus: "confirmed", grandTotal: "20.00",
      deliveryMethod: "Standard", productSubtotal: "20.00",
    };
    mockState.notifyUser.mockClear();
    mockState.updates.length = 0;

    await withServer(async baseUrl => {
      const response = await fetch(`${baseUrl}/admin/orders/order-1`, {
        method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ trackingNumbers: ["INTL"] }),
      });
      expect(response.status).toBe(200);
      expect(mockState.notifyUser).not.toHaveBeenCalled();
    });
  });

  it("returns 409 and suppresses notifications when a single-write cache CAS loses a refresh race", async () => {
    mockState.order = {
      id: "order-1", code: "ORDER-1", status: "Shipped",
      trackingNumber: "OLD", trackingNumbers: ["OLD"],
      trackingPackages: null,
      trackingDetails: { OLD: { trackingNumber: "OLD", status: "in_transit", events: [], lastChecked: "2026-01-01" } },
      trackingStatus: "in_transit", trackingEvents: [], trackingLastChecked: new Date("2026-01-01"),
      trackingShippedItems: null, telegramUsername: "customer",
      groupBuyId: null, sharedOrderId: null, orderType: "wholesale",
      paymentStatus: "confirmed", grandTotal: "20.00",
      deliveryMethod: "Standard", productSubtotal: "20.00",
    };
    mockState.casConflict = true;
    mockState.notifyUser.mockClear();
    mockState.updates.length = 0;
    try {
      await withServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/admin/orders/order-1`, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ trackingNumbers: ["NEW"] }),
        });
        expect(response.status).toBe(409);
        expect(mockState.updates).toHaveLength(0);
        expect(mockState.notifyUser).not.toHaveBeenCalled();
      });
    } finally {
      mockState.casConflict = false;
    }
  });

  it("reports a per-line conflict and suppresses shipment notifications when bulk CAS loses a refresh race", async () => {
    mockState.order = {
      id: "order-1", code: "ORDER-1", status: "Shipped",
      trackingNumber: "OLD", trackingNumbers: ["OLD"],
      trackingPackages: null,
      trackingDetails: { OLD: { trackingNumber: "OLD", status: "in_transit", events: [], lastChecked: "2026-01-01" } },
      trackingStatus: "in_transit", trackingEvents: [], trackingLastChecked: new Date("2026-01-01"),
      trackingShippedItems: null, telegramUsername: "customer",
      groupBuyId: null, sharedOrderId: null, orderType: "wholesale",
      paymentStatus: "confirmed", grandTotal: "20.00", deliveryMethod: "Standard",
    };
    mockState.casConflict = true;
    mockState.notifyUserFromTemplate.mockClear();
    mockState.updates.length = 0;
    try {
      await withServer(async baseUrl => {
        const response = await fetch(`${baseUrl}/admin/orders/bulk-tracking`, {
          method: "PATCH", headers: { "content-type": "application/json" },
          body: JSON.stringify({ lines: [{ code: "ORDER-1", trackingNumbers: ["NEW"] }] }),
        });
        expect(await response.json()).toMatchObject({
          succeeded: 0,
          failed: 1,
          results: [{ ok: false, error: expect.stringMatching(/another writer/i) }],
        });
        expect(mockState.updates).toHaveLength(0);
        expect(mockState.notifyUserFromTemplate).not.toHaveBeenCalled();
      });
    } finally {
      mockState.casConflict = false;
    }
  });
});