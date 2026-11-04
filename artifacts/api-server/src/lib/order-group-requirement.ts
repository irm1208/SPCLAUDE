import { groupBuyProductsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export class OrderGroupRequiredError extends Error {}

/** Standalone retail is valid; group-catalogue products require a resolved group. */
export async function assertOrderGroupContext(database: any, input: {
  groupBuyId: string | null; isWholesale: boolean; productIds: string[];
}) {
  if (input.groupBuyId || input.isWholesale || !input.productIds.length) return;
  // Include inactive mappings: a closed/disabled group must not become a
  // standalone checkout simply because it is no longer eligible for inference.
  const matches = await database.select({ productId: groupBuyProductsTable.productId })
    .from(groupBuyProductsTable)
    .where(inArray(groupBuyProductsTable.productId, input.productIds)).limit(1);
  if (matches.length) {
    throw new OrderGroupRequiredError("Please select your group buy before placing this order. Return to your group buy and reopen checkout.");
  }
}
