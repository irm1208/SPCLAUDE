import { readFileSync } from "node:fs";
import { getTableName } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  order: {} as Record<string, any>, accounts: [] as Record<string, any>[],
  applied: false, queries: [] as unknown[], writes: [] as Record<string, unknown>[],
  audits: [] as Record<string, unknown>[], transactions: 0, skipUpdate: false,
}));
vi.mock("@workspace/db", async () => {
  const schema = await import("../../../../lib/db/src/schema");
  const tx = {
    execute: async (query: unknown) => { state.queries.push(query); },
    select: () => ({
      from: (table: any) => ({
        where: () => {
          const name = getTableName(table);
          const rows = name === "orders" ? [structuredClone(state.order)]
            : name === "accounts" ? structuredClone(state.accounts) : state.applied ? [{ id: 1 }] : [];
          const chain = {
            limit: () => chain,
            for: () => chain,
            then: (resolve: any) => Promise.resolve(rows).then(resolve),
          };
          return chain;
        },
      }),
    }),
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: () => ({
          returning: async () => {
            if (state.skipUpdate) return [];
            state.writes.push(values); Object.assign(state.order, values); return [{ id: state.order.id }];
          },
        }),
      }),
    }),
    insert: () => ({
      values: async (values: Record<string, unknown>) => { state.audits.push(values); state.applied = true; },
    }),
  };
  return { ...schema, db: { transaction: async (run: any) => { state.transactions++; return run(tx); } } };
});

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  state.order = {
    id: "b19f235f-06dd-4c46-9798-5bd5584042a9", code: "12437", telegramUsername: "@sablex4711",
    shippingEmail: "same@example.test", status: "Submitted", orderType: "wholesale",
    paymentStatus: "confirmed", grandTotal: "765.00", deletedAt: null,
  };
  state.accounts = [{ telegramUsername: "nomis4711", email: "same@example.test", accountStatus: "active" }];
  state.applied = false; state.queries = []; state.writes = []; state.audits = []; state.transactions = 0;
  state.skipUpdate = false;
});

describe("approved order owner correction", () => {
  it("only changes the approved order owner and records an audit in the same transaction", async () => {
    const { repairApprovedOrderOwner } = await import("./approved-order-owner-repair");
    expect(await repairApprovedOrderOwner()).toBe("repaired");
    expect(state.writes).toEqual([{ telegramUsername: "@nomis4711" }]);
    expect(state.order.paymentStatus).toBe("confirmed");
    expect(state.order.grandTotal).toBe("765.00");
    expect(state.audits).toHaveLength(1);
    expect(state.audits[0]?.metadata).toMatchObject({ previousUsername: "@sablex4711", username: "@nomis4711" });
    expect(state.transactions).toBe(1);
    expect(state.queries).toHaveLength(1);
    expect(await repairApprovedOrderOwner()).toBe("already_applied");
    expect(state.writes).toHaveLength(1);
  });
  it.each([
    ["wrong order", { id: "another-order" }],
    ["wrong code", { code: "other-code" }],
    ["changed owner", { telegramUsername: "@someone-else" }],
    ["email mismatch", { shippingEmail: "different@example.test" }],
    ["missing email", { shippingEmail: "" }],
    ["different total", { grandTotal: "100.00" }],
    ["unconfirmed payment", { paymentStatus: "unpaid" }],
    ["deleted order", { deletedAt: new Date() }],
    ["shared order", { orderType: "wholesale_shared" }],
  ])("does not modify %s", async (_label, changes) => {
    Object.assign(state.order, changes);
    const { repairApprovedOrderOwner } = await import("./approved-order-owner-repair");
    expect(await repairApprovedOrderOwner()).toBe("not_applicable");
    expect(state.writes).toEqual([]);
    expect(state.audits).toEqual([]);
  });
  it("does not transfer ownership if the old username now has an account", async () => {
    state.accounts.push({ telegramUsername: "sablex4711", email: "same@example.test", accountStatus: "active" });
    const { repairApprovedOrderOwner } = await import("./approved-order-owner-repair");
    expect(await repairApprovedOrderOwner()).toBe("not_applicable");
    expect(state.writes).toEqual([]);
  });
  it("does not run in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { repairApprovedOrderOwner } = await import("./approved-order-owner-repair");
    expect(await repairApprovedOrderOwner()).toBe("not_production");
    expect(state.transactions).toBe(0);
  });
  it("does not record a repair when active-refund protection prevents the update", async () => {
    state.skipUpdate = true;
    const { repairApprovedOrderOwner } = await import("./approved-order-owner-repair");
    expect(await repairApprovedOrderOwner()).toBe("not_applicable");
    expect(state.writes).toEqual([]);
    expect(state.audits).toEqual([]);
  });
  it.each(["suspended", "banned"])("does not link to a %s account", async status => {
    state.accounts[0]!.accountStatus = status;
    const { repairApprovedOrderOwner } = await import("./approved-order-owner-repair");
    expect(await repairApprovedOrderOwner()).toBe("not_applicable");
    expect(state.writes).toEqual([]);
  });
  it("runs before readiness and keeps active-refund protection in the update", () => {
    const index = readFileSync(new URL("../index.ts", import.meta.url), "utf8");
    const position = index.indexOf(".then(() => repairApprovedOrderOwner())");
    expect(position).toBeGreaterThan(-1);
    expect(position).toBeLessThan(index.indexOf("markApplicationReady();"));
    const source = readFileSync(new URL("./approved-order-owner-repair.ts", import.meta.url), "utf8");
    expect(source.includes("refundMutableOrderWhereSkipActive")).toBe(true);
  });
});
