import { describe, expect, it, vi } from "vitest";
import type { OrganiserPaymentConfirmationResult } from "./wholesale-organiser-payment-confirmation";
import {
  runWholesaleOrganiserPaymentBackfill,
  type WholesaleOrganiserPaymentBackfillDeps,
} from "./wholesale-organiser-payment-backfill";

vi.mock("@workspace/db", () => {
  throw new Error("The database module must remain lazy for injected backfill tests.");
});

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    and: vi.fn((...predicates: unknown[]) => ({ kind: "and", predicates })),
    asc: vi.fn((column: unknown) => ({ kind: "asc", column })),
    eq: vi.fn((column: unknown, value: unknown) => ({ kind: "eq", column, value })),
    inArray: vi.fn((column: unknown, value: unknown[]) => ({ kind: "inArray", column, value })),
  };
});

type QueryTrace = {
  where: ReturnType<typeof vi.fn>;
  orderBy: ReturnType<typeof vi.fn>;
};

const sharesTable = {
  id: "id",
  organiserPaymentStatus: "organiserPaymentStatus",
};

function depsFor(
  confirmWholesaleOrganiserPayment: NonNullable<WholesaleOrganiserPaymentBackfillDeps["confirmWholesaleOrganiserPayment"]>,
  rows = [{ id: "SHARE-A" }, { id: "SHARE-B" }],
  trace?: QueryTrace,
): WholesaleOrganiserPaymentBackfillDeps {
  const orderBy = vi.fn(async () => rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  if (trace) {
    trace.where = where;
    trace.orderBy = orderBy;
  }
  return {
    db: { select },
    wholesaleSharesTable: sharesTable,
    confirmWholesaleOrganiserPayment,
  };
}

describe("runWholesaleOrganiserPaymentBackfill", () => {
  it("queries every confirmed parent by ascending share ID", async () => {
    const trace = {} as QueryTrace;
    const confirm = vi.fn(async ({ shareId }: { shareId: string }) => ({
      kind: "already_confirmed",
      shareId,
      organiserOrderId: "organiser-order",
      creatorUsername: "@creator",
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "confirmed",
    } satisfies OrganiserPaymentConfirmationResult));

    await runWholesaleOrganiserPaymentBackfill(depsFor(confirm, [{ id: "SHARE-A" }], trace));

    expect(trace.where).toHaveBeenCalledWith({
      kind: "eq",
      column: sharesTable.organiserPaymentStatus,
      value: "confirmed",
    });
    expect(trace.orderBy).toHaveBeenCalledWith({
      kind: "asc",
      column: sharesTable.id,
    });
  });

  it("repairs through the shared service without changing member payments", async () => {
    const memberOrders = new Map([
      ["organiser-order", "pending"],
      ["member-order", "unpaid"],
    ]);
    const confirm = vi.fn(async ({ shareId }: { shareId: string }) => {
      memberOrders.set("organiser-order", "confirmed");
      return {
        kind: "confirmed",
        shareId,
        organiserOrderId: "organiser-order",
        creatorUsername: "@creator",
        orderChanged: true,
        organiserPaymentStatus: "confirmed",
        organiserOrderPaymentStatus: "confirmed",
      } satisfies OrganiserPaymentConfirmationResult;
    });

    const result = await runWholesaleOrganiserPaymentBackfill(depsFor(confirm));

    expect(result).toEqual({
      scanned: 2,
      repaired: 2,
      alreadyCorrect: 0,
      skippedByCode: {},
    });
    expect(confirm).toHaveBeenNthCalledWith(1, {
      shareId: "SHARE-A",
      source: "backfill",
      expectedCurrentParentStatus: "confirmed",
    });
    expect(memberOrders.get("member-order")).toBe("unpaid");
  });

  it("counts an already-confirmed organiser order as already correct", async () => {
    const confirm = vi.fn(async ({ shareId }: { shareId: string }) => ({
      kind: "already_confirmed",
      shareId,
      organiserOrderId: "organiser-order",
      creatorUsername: "@creator",
      organiserPaymentStatus: "confirmed",
      organiserOrderPaymentStatus: "confirmed",
    } satisfies OrganiserPaymentConfirmationResult));

    await expect(runWholesaleOrganiserPaymentBackfill(depsFor(confirm, [{ id: "SHARE-A" }]))).resolves.toEqual({
      scanned: 1,
      repaired: 0,
      alreadyCorrect: 1,
      skippedByCode: {},
    });
  });

  it.each(["missing_transaction_identity", "invalid_creator_order"] as const)(
    "safely skips %s",
    async (code) => {
      const confirm = vi.fn(async ({ shareId }: { shareId: string }) => ({
        kind: "rejected",
        code,
        message: "safe rejection",
      } satisfies OrganiserPaymentConfirmationResult));

      await expect(runWholesaleOrganiserPaymentBackfill(depsFor(confirm, [{ id: "SHARE-A" }]))).resolves.toEqual({
        scanned: 1,
        repaired: 0,
        alreadyCorrect: 0,
        skippedByCode: { [code]: 1 },
      });
    },
  );

  it("scans a confirmed non-submitted share and categorizes its safe rejection", async () => {
    const confirm = vi.fn(async ({ shareId }: { shareId: string }) => ({
      kind: "rejected",
      code: "invalid_share_status",
      message: "Shared order is not submitted.",
    } satisfies OrganiserPaymentConfirmationResult));

    await expect(runWholesaleOrganiserPaymentBackfill(
      depsFor(confirm, [{ id: "CONFIRMED-OPEN" }]),
    )).resolves.toEqual({
      scanned: 1,
      repaired: 0,
      alreadyCorrect: 0,
      skippedByCode: { invalid_share_status: 1 },
    });
  });

  it("is a rerun no-op with no duplicate audit", async () => {
    let repaired = false;
    let auditRows = 0;
    const memberOrders = { organiser: "pending", member: "unpaid" };
    const confirm = vi.fn(async ({ shareId }: { shareId: string }) => {
      if (repaired) {
        return {
          kind: "already_confirmed",
          shareId,
          organiserOrderId: "organiser-order",
          creatorUsername: "@creator",
          organiserPaymentStatus: "confirmed",
          organiserOrderPaymentStatus: "confirmed",
        } satisfies OrganiserPaymentConfirmationResult;
      }
      repaired = true;
      memberOrders.organiser = "confirmed";
      auditRows += 1;
      return {
        kind: "confirmed",
        shareId,
        organiserOrderId: "organiser-order",
        creatorUsername: "@creator",
        orderChanged: true,
        organiserPaymentStatus: "confirmed",
        organiserOrderPaymentStatus: "confirmed",
      } satisfies OrganiserPaymentConfirmationResult;
    });
    const deps = depsFor(confirm, [{ id: "SHARE-A" }]);

    await expect(runWholesaleOrganiserPaymentBackfill(deps)).resolves.toMatchObject({
      repaired: 1,
      alreadyCorrect: 0,
    });
    await expect(runWholesaleOrganiserPaymentBackfill(deps)).resolves.toMatchObject({
      repaired: 0,
      alreadyCorrect: 1,
    });

    expect(auditRows).toBe(1);
    expect(memberOrders.member).toBe("unpaid");
  });

  it("wraps unexpected service errors with privacy-safe partial progress", async () => {
    const confirm = vi.fn(async ({ shareId }: { shareId: string }) => {
      if (shareId === "SHARE-REPAIRED") {
        return {
          kind: "confirmed",
          shareId,
          organiserOrderId: "organiser-order",
          creatorUsername: "@creator",
          orderChanged: true,
          organiserPaymentStatus: "confirmed",
          organiserOrderPaymentStatus: "confirmed",
        } satisfies OrganiserPaymentConfirmationResult;
      }
      if (shareId === "SHARE-CORRECT") {
        return {
          kind: "already_confirmed",
          shareId,
          organiserOrderId: "organiser-order",
          creatorUsername: "@creator",
          organiserPaymentStatus: "confirmed",
          organiserOrderPaymentStatus: "confirmed",
        } satisfies OrganiserPaymentConfirmationResult;
      }
      if (shareId === "SHARE-SKIPPED") {
        return {
          kind: "rejected",
          code: "invalid_share_status",
          message: "safe rejection",
        } satisfies OrganiserPaymentConfirmationResult;
      }
      throw new Error("database unavailable");
    });

    const result = runWholesaleOrganiserPaymentBackfill(depsFor(confirm, [
      { id: "SHARE-REPAIRED" },
      { id: "SHARE-CORRECT" },
      { id: "SHARE-SKIPPED" },
      { id: "SHARE-FAILED" },
    ]));

    await expect(result).rejects.toMatchObject({
      name: "WholesaleOrganiserPaymentBackfillError",
      summary: {
        scanned: 4,
        repaired: 1,
        alreadyCorrect: 1,
        skippedByCode: { invalid_share_status: 1 },
      },
    });
    await expect(result).rejects.not.toThrow("database unavailable");
  });
});