import { db, gbHalfKitClaimsTable, groupBuysTable, gbReshippersTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { resolveHalfKitPaymentMethods } from "./half-kit-payment-routing";
import { isValidEthAddress, isValidBtcAddress, isValidSolanaAddress } from "./payment-verify";

/** Null means ordinary routing. An object with null wallets means fail closed. */
export async function resolveHalfKitPayments(
  order: { id?: string; groupBuyId: string | null; shippingCountry?: string | null; reshipperUsername?: string | null },
  database: any = db,
) {
  if (!order.id || !order.groupBuyId) return null;
  const [claim] = await database.select({ id: gbHalfKitClaimsTable.id }).from(gbHalfKitClaimsTable)
    .where(and(eq(gbHalfKitClaimsTable.orderId, order.id), eq(gbHalfKitClaimsTable.state, "active"))).limit(1);
  if (!claim) return null;
  const [gb] = await database.select({ organiserPayments: groupBuysTable.organiserPayments }).from(groupBuysTable)
    .where(eq(groupBuysTable.id, order.groupBuyId));
  const [reshipper] = order.reshipperUsername || order.shippingCountry
    ? await database.select({
      reshipperUsername: gbReshippersTable.reshipperUsername,
      reshipperPaymentDetails: gbReshippersTable.reshipperPaymentDetails,
      enabledPaymentMethods: gbReshippersTable.enabledPaymentMethods,
    }).from(gbReshippersTable).where(and(
      eq(gbReshippersTable.gbId, order.groupBuyId),
      eq(gbReshippersTable.enabled, true),
      eq(gbReshippersTable.paymentTarget, "reshipper"),
      order.reshipperUsername
        ? eq(gbReshippersTable.reshipperUsername, order.reshipperUsername)
        : eq(gbReshippersTable.country, order.shippingCountry!),
    ))
    : [];
  return resolveHalfKitPaymentMethods(gb?.organiserPayments, reshipper,
    address => isValidEthAddress(address) || isValidBtcAddress(address) || isValidSolanaAddress(address));
}
