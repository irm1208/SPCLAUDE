import { describe, expect, it, vi } from "vitest";
import type { OrganiserPaymentConfirmationResult } from "./wholesale-organiser-payment-confirmation";
import {
  runWholesaleOrganiserPaymentBackfill,
  type WholesaleOrganiserPaymentBackfillDeps,
} from "./wholesale-organiser-payment-backfill";

function depsFor(
  confirmWholesaleOrganiserPayment: NonNullable<WholesaleOrganiserPaymentBackfillDeps["confirmWholesaleOrganiserPayment"]>,
  rows = [{ id: "SHARE-A" }, { id: "SHARE-B" }],
): WholesaleOrganiserPaymentBackfillDeps {
  const orderBy = vi.fn(async () => rows);
  const where = vi.fn(() => ({ orderBy }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return {
    db: { select },
    confirmWholesaleOrganiserPayment,
  };
}

describe("runWholesaleOrganiserPaymentBackfill", () => {
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

  it("propagates unexpected service errors", async () => {
    const confirm = vi.fn(async () => {
      throw new Error("database unavailable");
    });

    await expect(runWholesaleOrganiserPaymentBackfill(depsFor(confirm, [{ id: "SHARE-A" }]))).rejects.toThrow(
      "database unavailable",
    );
  });
});