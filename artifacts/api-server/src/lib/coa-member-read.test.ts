import { describe, expect, it, vi } from "vitest";
vi.mock("@workspace/db", async () => ({
  ...await import("../../../../lib/db/src/schema"),
  db: {},
}));
vi.mock("./crypto-pricing", () => ({ fetchFiatToUsd: vi.fn() }));
vi.mock("./payment-verify", () => ({ verifyTransaction: vi.fn() }));
vi.mock("./gb-onward-chain-time", () => ({ onwardTransactionTime: vi.fn() }));
vi.mock("./coa-notifications", () => ({ queueCoaNotification: vi.fn() }));
vi.mock("./coa-certificates", () => ({ coaCertificateStore: vi.fn(), validateCoaPdf: vi.fn(), removeCoaPdf: vi.fn() }));
import { groupBuysTable, ordersTable } from "@workspace/db";
import { getMemberCoa } from "./group-buy-coa";

function readDatabase(owner = "member") {
  const request = { id: "request", orderId: "order", status: "reserved", source: "public",
    expiresAt: new Date(Date.now() + 60_000), fee: "65", currency: "USD", rails: [],
    manualInstructions: "", internalNotes: "staff only" };
  const transaction = vi.fn(() => { throw new Error("Status reads must not acquire write locks"); });
  const select = vi.fn(() => ({
    from: (table: unknown) => {
      const query: any = {
        leftJoin: () => query,
        where: async () => table === ordersTable
          ? [{ id: "order", groupBuyId: "group", telegramUsername: owner, status: "Submitted" }]
          : table === groupBuysTable ? [{ group: { name: "Synthetic group" },
            settings: { mode: "open", fee: "65", currency: "USD", cap: 2, rails: [], manualInstructions: "" } }]
            : [request, { ...request, id: "expired", orderId: "other", expiresAt: new Date(0) }],
      };
      return query;
    },
  }));
  return { select, transaction };
}
describe("non-blocking member COA status", () => {
  it("loads current capacity and private request without transactions or expiry writes", async () => {
    const database = readDatabase();
    const view = await getMemberCoa("order", "MEMBER", database as any);
    expect(database.transaction).not.toHaveBeenCalled();
    expect(database.select).toHaveBeenCalledTimes(3);
    expect(view.available).toBe(1);
    expect(view.request?.id).toBe("request");
    expect(view.request).not.toHaveProperty("internalNotes");
  });
  it("still rejects another member before reading any COA information", async () => {
    const database = readDatabase("someone-else");
    await expect(getMemberCoa("order", "member", database as any)).rejects.toThrow("Order not found");
    expect(database.select).toHaveBeenCalledTimes(1);
  });
});
