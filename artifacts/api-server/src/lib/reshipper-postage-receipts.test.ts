import { expect, it } from "vitest";
import { reshipperPostageReceipts } from "./reshipper-postage-receipts";

it("returns only confirmed receipts owned by this reshipper, including historical receipts once", () => {
  const paid = { id: "R", orderId: "O", assignmentId: "A", status: "paid", amount: 23, currency: "USD", reshipperUsername: "@Alice" } satisfies Pick<import("./gb-onward-payment-rules").OnwardCharge, "id" | "orderId" | "assignmentId" | "status" | "amount" | "currency" | "reshipperUsername">;
  const ledger = { request: paid, history: [
    paid, { ...paid, id: "old", amount: 4, currency: "EUR" },
    { ...paid, id: "pending", status: "pending" },
    { ...paid, id: "cancelled", status: "cancelled" },
    { ...paid, id: "other-owner", assignmentId: "B", reshipperUsername: "Bob" },
    { ...paid, id: "wrong-order", orderId: "X" },
  ] };
  expect(reshipperPostageReceipts(JSON.stringify(ledger), "O", " alice ")).toEqual([
    { currency: "USD", amount: 23 }, { currency: "EUR", amount: 4 },
  ]);
  expect(reshipperPostageReceipts(null, "O", "Alice")).toEqual([]);
  expect(reshipperPostageReceipts(JSON.stringify(ledger), "O", "Bob")).toEqual([{ currency: "USD", amount: 23 }]);
});
it("fails explicitly on invalid confirmed money instead of reporting an incomplete collection", () => {
  const ledger = { request: { id: "R", orderId: "O", reshipperUsername: "Alice", status: "paid", amount: -1, currency: "USD" }, history: [] };
  expect(() => reshipperPostageReceipts(JSON.stringify(ledger), "O", "Alice")).toThrow(/amount/);
  expect(() => reshipperPostageReceipts("broken", "O", "Alice")).toThrow();
});
