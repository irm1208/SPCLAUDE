import { describe, expect, it, vi } from "vitest";
import { groupBuyRefundsTable } from "@workspace/db";

import {
  ACTIVE_REFUND_STATUSES,
  RefundMutationBlockedError,
  assertNoActiveRefund,
  assertNoActiveRefunds,
  refundMutationPredicate,
  withRefundMutationGuard,
} from "./refund-mutation-guard";

describe("refund mutation guard", () => {
  it("defines only the three statuses that block order mutations", () => {
    expect(ACTIVE_REFUND_STATUSES).toEqual([
      "requested",
      "verifying",
      "verification_failed",
    ]);
  });

  it.each(["requested", "verifying", "verification_failed"] as const)(
    "rejects an order with %s refund",
    async status => {
      const database = fakeDatabase([{ orderId: "order-1", id: "refund-1", status }]);

      await expect(assertNoActiveRefund(database, "order-1"))
        .rejects.toMatchObject({ code: "refund_active", orderId: "order-1" });
      await expect(assertNoActiveRefund(database, "order-1"))
        .rejects.toBeInstanceOf(RefundMutationBlockedError);
    },
  );

  it("allows no refund and completed refunds", async () => {
    await expect(assertNoActiveRefund(fakeDatabase([]), "order-1")).resolves.toBeUndefined();
    await expect(assertNoActiveRefund(fakeDatabase([
      { orderId: "order-1", id: "refund-1", status: "completed" },
    ]), "order-1")).resolves.toBeUndefined();
  });

  it("builds a NOT EXISTS predicate for conditional order updates", () => {
    const predicate = refundMutationPredicate();
    expect(predicate.queryChunks?.some((chunk: unknown) =>
      typeof chunk === "object" && chunk !== null && "value" in chunk
        && String((chunk as { value?: unknown }).value).includes("NOT EXISTS"),
    )).toBe(true);
  });

  it("locks and checks every bulk order in deterministic order, rejecting the whole batch", async () => {
    const database = fakeDatabase([
      { orderId: "order-b", id: "refund-b", status: "requested" },
      { orderId: "order-a", id: "refund-a", status: "completed" },
    ]);

    await expect(assertNoActiveRefunds(database, ["order-b", "order-a"]))
      .rejects.toMatchObject({ code: "refund_active", orderId: "order-b" });
    expect(database.lockedOrderIds).toEqual(["order-a", "order-b"]);
    expect(database.checkedOrderIds).toEqual(["order-a", "order-b"]);
  });

  it("runs a bulk mutation only after the complete guard succeeds", async () => {
    const database = fakeDatabase([]);
    database.transaction = vi.fn(async (callback: (tx: typeof database) => Promise<unknown>) => callback(database));
    const mutate = vi.fn(async () => "mutated");

    await expect(withRefundMutationGuard(database, ["order-a"], mutate)).resolves.toBe("mutated");
    expect(mutate).toHaveBeenCalledOnce();
  });
});

function fakeDatabase(refunds: Array<{ orderId: string; id: string; status: string }>) {
  const database = {
    lockedOrderIds: [] as string[],
    checkedOrderIds: [] as string[],
    transaction: undefined as unknown,
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            for: vi.fn(async () => {
              if (table === groupBuyRefundsTable) {
                return refunds.filter(refund => ACTIVE_REFUND_STATUSES.includes(refund.status as never));
              }
              const ids = ["order-a", "order-b"];
              database.lockedOrderIds.push(...ids);
              database.checkedOrderIds.push(...ids);
              return ids.map(id => ({ id }));
            }),
          })),
          for: vi.fn(async () => table === groupBuyRefundsTable
            ? refunds.filter(refund => ACTIVE_REFUND_STATUSES.includes(refund.status as never))
            : []),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve(
            table === groupBuyRefundsTable
              ? refunds.filter(refund => ACTIVE_REFUND_STATUSES.includes(refund.status as never))
              : [],
          ).then(resolve),
        })),
      })),
    })),
  };
  return database;
}