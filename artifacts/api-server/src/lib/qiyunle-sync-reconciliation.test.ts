import { describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  transactionCalls: 0,
  committedWrites: [] as {
    values: { batchStock: number | null };
    predicate?: { column: string; value: string };
  }[],
  failOnPositiveWrite: false,
}));

vi.mock("drizzle-orm", async (importOriginal) => ({
  ...(await importOriginal()),
  eq: (column: string, value: string) => ({ column, value }),
}));

vi.mock("@workspace/db", () => ({
  db: {
    transaction: async (callback: (tx: {
      update: () => {
        set: (values: { batchStock: number | null }) => {
          where: (predicate: { column: string; value: string }) => Promise<void>;
          then: <T>(
            onfulfilled?: ((value: void) => T | PromiseLike<T>) | null,
          ) => Promise<T>;
        };
      };
    }) => Promise<void>) => {
      state.transactionCalls++;
      const stagedWrites: typeof state.committedWrites = [];
      await callback({
        update: () => ({
          set: (values) => ({
            where: async (predicate) => {
              if (values.batchStock !== null && state.failOnPositiveWrite) {
                throw new Error("positive write failed");
              }
              stagedWrites.push({ values, predicate });
            },
            then: (onfulfilled) => {
              stagedWrites.push({ values });
              return Promise.resolve().then(onfulfilled);
            },
          }),
        }),
      });
      state.committedWrites.push(...stagedWrites);
    },
  },
  qiyunleMappingsTable: { qiyunleCode: "qiyunle_code" },
}));

import {
  reconcileQiyunleBatchStock,
  runQiyunleSyncWithInventoryFetcher,
} from "./qiyunle-sync";

describe("reconcileQiyunleBatchStock", () => {
  it("atomically clears mappings before writing only positive current stock", async () => {
    state.transactionCalls = 0;
    state.committedWrites.length = 0;
    state.failOnPositiveWrite = false;

    await reconcileQiyunleBatchStock(new Map([
      ["current", 12],
      ["zero", 0],
      ["negative", -3],
    ]));

    expect(state.transactionCalls).toBe(1);
    expect(state.committedWrites).toEqual([
      { values: { batchStock: null } },
      {
        values: { batchStock: 12 },
        predicate: { column: "qiyunle_code", value: "current" },
      },
    ]);
  });

  it("rolls back the clear and partial writes when a positive write fails", async () => {
    state.committedWrites.length = 0;
    state.failOnPositiveWrite = true;

    await expect(reconcileQiyunleBatchStock(new Map([
      ["current", 12],
      ["later", 24],
    ]))).rejects.toThrow("positive write failed");

    expect(state.committedWrites).toEqual([]);
  });
});

describe("runQiyunleSyncWithInventoryFetcher", () => {
  it("does not reconcile batch stock when inventory fetching fails", async () => {
    state.transactionCalls = 0;
    state.committedWrites.length = 0;

    await expect(runQiyunleSyncWithInventoryFetcher(
      false,
      async () => {
        throw new Error("inventory unavailable");
      },
    )).rejects.toThrow("inventory unavailable");

    expect(state.transactionCalls).toBe(0);
    expect(state.committedWrites).toEqual([]);
  });
});