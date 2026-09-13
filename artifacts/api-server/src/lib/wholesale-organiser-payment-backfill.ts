import { asc, eq } from "drizzle-orm";
import {
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

type WholesaleSharesTableLike = {
  id: any;
  organiserPaymentStatus: any;
};

export type WholesaleOrganiserPaymentBackfillDeps = {
  db?: {
    select: (...args: any[]) => any;
  };
  wholesaleSharesTable?: WholesaleSharesTableLike;
  confirmWholesaleOrganiserPayment?: (
    input: ConfirmationInput,
  ) => Promise<OrganiserPaymentConfirmationResult>;
};

export class WholesaleOrganiserPaymentBackfillError extends Error {
  readonly summary: WholesaleOrganiserPaymentBackfillSummary;

  constructor(summary: WholesaleOrganiserPaymentBackfillSummary, _cause?: unknown) {
    super("Wholesale organiser payment backfill failed.");
    this.name = "WholesaleOrganiserPaymentBackfillError";
    this.summary = {
      ...summary,
      skippedByCode: { ...summary.skippedByCode },
    };
  }
}

function emptySummary(): WholesaleOrganiserPaymentBackfillSummary {
  return {
    scanned: 0,
    repaired: 0,
    alreadyCorrect: 0,
    skippedByCode: {},
  };
}

export async function runWholesaleOrganiserPaymentBackfill(
  deps: WholesaleOrganiserPaymentBackfillDeps = {},
): Promise<WholesaleOrganiserPaymentBackfillSummary> {
  const summary = emptySummary();

  try {
    let queryDb = deps.db;
    let sharesTable = deps.wholesaleSharesTable;
    if (!queryDb || !sharesTable) {
      const database = await import("@workspace/db");
      queryDb ??= database.db;
      sharesTable ??= database.wholesaleSharesTable;
    }
    if (!queryDb || !sharesTable) {
      throw new Error("Backfill database dependencies are unavailable.");
    }

    let confirm = deps.confirmWholesaleOrganiserPayment;
    if (!confirm) {
      const confirmation = await import("./wholesale-organiser-payment-confirmation");
      confirm = confirmation.confirmWholesaleOrganiserPayment;
    }

    const resolvedDb = queryDb;
    const resolvedSharesTable = sharesTable;
    const shares = await resolvedDb
      .select({ id: resolvedSharesTable.id })
      .from(resolvedSharesTable)
      .where(eq(resolvedSharesTable.organiserPaymentStatus, "confirmed"))
      .orderBy(asc(resolvedSharesTable.id));

    for (const share of shares) {
      summary.scanned += 1;
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
  } catch (error) {
    if (error instanceof WholesaleOrganiserPaymentBackfillError) throw error;
    throw new WholesaleOrganiserPaymentBackfillError(summary, error);
  }
}
