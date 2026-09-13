import { describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => {
  const tables = {
    shares: { id: "share.id", organiserPaymentStatus: "share.status" },
    members: { shareId: "member.shareId", isCreator: "member.isCreator" },
    orders: {
      id: "order.id",
      orderType: "order.type",
      sharedOrderId: "order.sharedOrderId",
      telegramUsername: "order.username",
    },
    audit: "audit",
  };
  const state = {
    share: {
      id: "SHARE1",
      creatorUsername: "@creator",
      status: "submitted",
      organiserPaymentStatus: "pending",
      organiserPaymentTxHash: "0xhash",
      organiserPaymentCurrency: "USDT",
      organiserPaymentNetwork: "ERC-20",
      totalVendorShipping: "5.00",
    },
    member: {
      id: "member-1",
      shareId: "SHARE1",
      username: "@creator",
      isCreator: true,
      orderId: "order-1",
      items: [{ quantity: 2, unitPrice: "10.00" }],
    },
    order: {
      id: "order-1",
      telegramUsername: "@creator",
      orderType: "wholesale_shared",
      sharedOrderId: "SHARE1",
      paymentStatus: "pending",
    },
    audits: [] as unknown[],
    updates: [] as unknown[],
  };

  const db = {
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(tx)),
  };
  const tx = {
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          for: vi.fn(async () => {
            if (table === tables.shares) return [state.share];
            if (table === tables.members) return [state.member];
            if (table === tables.orders) return [state.order];
            return [];
          }),
        })),
      })),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: unknown) => ({
        where: vi.fn(() => ({
          returning: vi.fn(async () => {
            state.updates.push({ table, values });
            if (table === tables.orders) state.order = { ...state.order, ...(values as object) };
            if (table === tables.shares) state.share = { ...state.share, ...(values as object) };
            return [{ ...state.order }];
          }),
        })),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn(async (values: unknown) => {
        state.audits.push({ table, values });
      }),
    })),
  };
  return { db, tables, tx, state };
});

vi.mock("@workspace/db", () => ({
  db: harness.db,
  wholesaleSharesTable: harness.tables.shares,
  wholesaleShareMembersTable: harness.tables.members,
  ordersTable: harness.tables.orders,
  auditLogsTable: harness.tables.audit,
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((...args: unknown[]) => args),
  inArray: vi.fn((...args: unknown[]) => args),
}));

import {
  confirmWholesaleOrganiserPayment,
  type WholesaleOrganiserPaymentConfirmationInput,
} from "./wholesale-organiser-payment-confirmation";

describe("confirmWholesaleOrganiserPayment", () => {
  const input: WholesaleOrganiserPaymentConfirmationInput = {
    shareId: "SHARE1",
    mode: "admin",
  };

  it("confirms the creator order and parent atomically, recording one audit event", async () => {
    const result = await confirmWholesaleOrganiserPayment(input);

    expect(result).toMatchObject({ status: "confirmed", shareId: "SHARE1", creatorOrderId: "order-1" });
    expect(harness.db.transaction).toHaveBeenCalledOnce();
    expect(harness.state.updates).toHaveLength(2);
    expect(harness.state.audits).toHaveLength(1);
  });

  it("returns already_confirmed without changing a confirmed creator order", async () => {
    harness.state.order.paymentStatus = "confirmed";
    harness.state.share.organiserPaymentStatus = "confirmed";
    harness.state.updates.length = 0;
    harness.state.audits.length = 0;

    const result = await confirmWholesaleOrganiserPayment({ ...input, mode: "backfill" });

    expect(result).toMatchObject({ status: "already_confirmed", creatorOrderId: "order-1" });
    expect(harness.state.updates).toHaveLength(0);
    expect(harness.state.audits).toHaveLength(0);
  });

  it("rejects a submitted share with missing stored transaction details", async () => {
    harness.state.share.organiserPaymentStatus = "pending";
    harness.state.share.organiserPaymentTxHash = "";
    harness.state.order.paymentStatus = "pending";

    const result = await confirmWholesaleOrganiserPayment(input);

    expect(result.status).toBe("rejected");
    expect(result).toHaveProperty("reason", "missing_transaction_details");
  });
});