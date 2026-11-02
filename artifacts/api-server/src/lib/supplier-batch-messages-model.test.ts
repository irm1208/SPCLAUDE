import { describe, expect, it } from "vitest";
import { messageInput, batchMessageAudience, batchMessageText, escapeBatchMessage } from "./supplier-batch-messages-model";

describe("supplier batch message audience", () => {
  const batches = [
    { id: "a", reference: "GB / 001", state: "ordered", snapshot: { orders: [{ id: "1" }, { id: "2" }] } },
    { id: "b", reference: "GB / 002", state: "prepared", snapshot: { orders: [{ id: "1" }, { id: "3" }, { id: "4" }] } },
  ];
  const orders = [
    { id: "1", telegramUsername: "@Alice", status: "Processing", deletedAt: null },
    { id: "2", telegramUsername: "alice", status: "Processing", deletedAt: null },
    { id: "3", telegramUsername: "bob", status: "Submitted", deletedAt: null },
    { id: "4", telegramUsername: "cancelled", status: "Cancelled", deletedAt: null },
  ];
  const accounts = [
    { telegramUsername: "alice", telegramChatId: "private", telegramNotifications: { status: true } },
    { telegramUsername: "bob", telegramChatId: null, telegramNotifications: {} },
  ];
  it("deduplicates members across orders and quantity-split batches, including unpaid orders", () => {
    expect(batchMessageAudience(batches, orders, accounts).recipients).toEqual([
      { username: "alice", telegramAvailable: true },
      { username: "bob", telegramAvailable: false },
    ]);
  });
  it("does not trust snapshot usernames and excludes deleted or cancelled orders", () => {
    const result = batchMessageAudience(batches, orders.map(o => ({ ...o, deletedAt: new Date() })), accounts);
    expect(result.recipients).toEqual([]);
  });
  it("counts missing accounts, and respects Telegram opt-out", () => {
    const result = batchMessageAudience(batches, orders, [ { ...accounts[0], telegramNotifications: { status: false } } ]);
    expect(result).toMatchObject({ missingAccounts: 1, recipients: [{ username: "alice", telegramAvailable: false }] });
  });
  it("rejects missing/released batches instead of broadening the audience", () => {
    expect(() => messageInput({ batchIds: [], message: "hi" })).toThrow();
    expect(() => messageInput({ batchIds: ["a"], message: " " })).toThrow();
    expect(() => messageInput({ batchIds: ["a"], message: "a".repeat(2001) })).toThrow();
    expect(() => batchMessageAudience([{ ...batches[0], state: "released" }], orders, accounts)).toThrow();
  });
  it("normalises selection and keeps user HTML inert in notifications", () => {
    expect(messageInput({ batchIds: ["b", "a", "b"], message: " hi " })).toEqual({ batchIds: ["a", "b"], message: "hi" });
    expect(escapeBatchMessage(batchMessageText("HGH <36>", ["GB / 001"], '<a href="https://bad">x</a>'))).toContain("&lt;a href=");
  });
});
