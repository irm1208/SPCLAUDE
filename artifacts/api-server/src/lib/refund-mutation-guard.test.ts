import { describe, expect, it, vi } from "vitest";
import { groupBuyRefundsTable } from "@workspace/db";

import {
  ACTIVE_REFUND_STATUSES,
  RefundMutationBlockedError,
  assertNoActiveRefund,
  assertNoActiveRefunds,
  refundMutationDatabaseErrorOrderId,
  refundMutationConflictResponse,
  refundMutationHttpStatus,
  refundMutationErrorOrderId,
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

  it("recognizes the fail-closed database branch used by low-level writers", () => {
    expect(refundMutationDatabaseErrorOrderId({
      code: "22P02",
      message: 'invalid input syntax for type integer: "refund_active:order-1"',
    })).toBe("order-1");
    expect(refundMutationDatabaseErrorOrderId({
      code: "22P02",
      message: "invalid input syntax for type integer: unrelated",
    })).toBeNull();
  });

  it("normalizes explicit and fail-closed errors for route-local catches", () => {
    expect(refundMutationErrorOrderId(new RefundMutationBlockedError("order-1"))).toBe("order-1");
    expect(refundMutationErrorOrderId({
      code: "22P02",
      message: 'invalid input syntax for type integer: "refund_active:order-2"',
    })).toBe("order-2");
    expect(refundMutationErrorOrderId({
      code: "22P02",
      message: 'invalid input syntax for type integer: "not-a-refund-conflict"',
    })).toBeNull();
    expect(refundMutationErrorOrderId({
      code: "22P02",
      message: "refund_active:order-3",
    })).toBeNull();
    expect(refundMutationConflictResponse({
      code: "22P02",
      message: 'invalid input syntax for type integer: "refund_active:order-4"',
    })).toEqual({
      status: 409,
      body: {
        error: "Order mutation is blocked while a refund is active.",
        code: "refund_active",
        orderId: "order-4",
      },
    });
    expect(refundMutationHttpStatus(new RefundMutationBlockedError("order-6"))).toBe(409);
    expect(refundMutationConflictResponse({
      code: "22P02",
      message: 'invalid input syntax for type integer: "bad-input"',
    })).toBeNull();
    expect(refundMutationHttpStatus({
      code: "22P02",
      status: 400,
      message: 'invalid input syntax for type integer: "bad-input"',
    })).toBe(400);
    expect(refundMutationHttpStatus({
      code: "22P02",
      message: 'invalid input syntax for type integer: "refund_active:order-5"',
    })).toBeNull();
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