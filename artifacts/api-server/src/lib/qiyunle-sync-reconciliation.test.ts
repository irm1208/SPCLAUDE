import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  transactionCalls: 0,
  writes: [] as { batchStock: number | null; code?: string }[],
}));

vi.mock("@workspace/db", () => ({
  db: {
    transaction: async (callback: (tx: {
      update: () => {
        set: (values: { batchStock: number | null }) => {
          where: () => Promise<void>;
          then: <T>(
            onfulfilled?: ((value: void) => T | PromiseLike<T>) | null,
          ) => Promise<T>;
        };
      };
    }) => Promise<void>) => {
      state.transactionCalls++;
      return callback({
      update: () => ({
        set: (values) => {
          const write: { batchStock: number | null; code?: string } = { ...values };
          state.writes.push(write);
          return {
            where: () => Promise.resolve(),
            then: (onfulfilled) => Promise.resolve().then(onfulfilled),
          };
        },
      }),
      });
    },
  },
  qiyunleMappingsTable: { qiyunleCode: "qiyunle_code" },
}));

import { reconcileQiyunleBatchStock } from "./qiyunle-sync";

describe("reconcileQiyunleBatchStock", () => {
  it("atomically clears mappings before writing only positive current stock", async () => {
    state.transactionCalls = 0;
    state.writes.length = 0;

    await reconcileQiyunleBatchStock(new Map([
      ["current", 12],
      ["zero", 0],
      ["negative", -3],
    ]));

    expect(state.transactionCalls).toBe(1);
    expect(state.writes).toEqual([
      { batchStock: null },
      { batchStock: 12 },
    ]);
  });
});