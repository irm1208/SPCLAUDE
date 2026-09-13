import { db, wholesaleSharesTable } from "@workspace/db";
import { asc, eq } from "drizzle-orm";
import {
  confirmWholesaleOrganiserPayment,
  type OrganiserPaymentConfirmationResult,
} from "./wholesale-organiser-payment-confirmation";

export type WholesaleOrganiserPaymentBackfillSummary = {
  scanned: number;
  repaired: number;
  alreadyCorrect: number;
  skippedByCode: Record<string, number>;
};

type ConfirmationInput = {
  shareId: string;
  source: "backfill";
  expectedCurrentParentStatus: "confirmed";
};

export type WholesaleOrganiserPaymentBackfillDeps = {
  db?: {
    select: (...args: any[]) => any;
  };
  confirmWholesaleOrganiserPayment?: (
    input: ConfirmationInput,
  ) => Promise<OrganiserPaymentConfirmationResult>;
};

export async function runWholesaleOrganiserPaymentBackfill(
  deps: WholesaleOrganiserPaymentBackfillDeps = {},
): Promise<WholesaleOrganiserPaymentBackfillSummary> {
  const queryDb = deps.db ?? db;
  const confirm = deps.confirmWholesaleOrganiserPayment ?? confirmWholesaleOrganiserPayment;
  const shares = await queryDb
    .select({ id: wholesaleSharesTable.id })
    .from(wholesaleSharesTable)
    .where(eq(wholesaleSharesTable.organiserPaymentStatus, "confirmed"))
    .orderBy(asc(wholesaleSharesTable.id));

  const summary: WholesaleOrganiserPaymentBackfillSummary = {
    scanned: shares.length,
    repaired: 0,
    alreadyCorrect: 0,
    skippedByCode: {},
  };

  for (const share of shares) {
    const result = await confirm({
      shareId: share.id,
      source: "backfill",
      expectedCurrentParentStatus: "confirmed",
    });

    if (result.kind === "rejected") {
      summary.skippedByCode[result.code] = (summary.skippedByCode[result.code] ?? 0) + 1;
    } else if (result.kind === "confirmed" && result.orderChanged) {
      summary.repaired += 1;
    } else if (
      result.kind === "already_confirmed" ||
      (result.kind === "confirmed" && !result.orderChanged)
    ) {
      summary.alreadyCorrect += 1;
    } else {
      throw new Error("Unexpected organiser payment backfill result.");
    }
  }

  return summary;
}
