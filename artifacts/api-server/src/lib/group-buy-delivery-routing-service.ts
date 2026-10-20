import { db, groupBuysTable, gbReshippersTable, accountsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { assertDirectShippingEligible, DeliveryRoutingError, resolvePostageReshipper } from "./group-buy-delivery-routing";
import type { CustomPostageOption } from "./group-buy-shipping-options";

export async function resolveGroupOrderRoute(input: {
  gbId: string; methodId: string; direct: boolean; country?: string | null;
  username: string; preferred?: string | null; items: { quantity: number }[];
  legacyDirectKits?: number;
}) {
  const [group] = await db.select().from(groupBuysTable).where(eq(groupBuysTable.id, input.gbId));
  if (!group) throw new DeliveryRoutingError("Group buy not found.");
  if (input.direct !== (input.methodId === "__direct_shipping")) throw new DeliveryRoutingError("Choose either reshipper postage or the dedicated Direct Shipping option.");
  if (input.direct) {
    const minimum = Math.min(Number(group.directShippingMinKits ?? 30), input.legacyDirectKits ?? Infinity);
    assertDirectShippingEligible({ ...group, directShippingMinKits: minimum }, input.items);
    return { reshipperUsername: null, routingType: "direct" as const, fixedReshipper: false };
  }
  let country = input.country;
  if (!country) {
    const [account] = await db.select({ country: accountsTable.country }).from(accountsTable).where(eq(accountsTable.telegramUsername, input.username));
    country = account?.country;
  }
  const assignments = await db.select().from(gbReshippersTable).where(and(eq(gbReshippersTable.gbId, input.gbId), eq(gbReshippersTable.enabled, true)));
  let options: CustomPostageOption[] = [];
  try { options = group.shippingOptions ? JSON.parse(group.shippingOptions) : []; }
  catch { throw new DeliveryRoutingError("Postage settings could not be read. Contact the organiser."); }
  const option = options.find(row => row.id === input.methodId);
  const selected = option?.reshipperUsername || input.preferred;
  const reshipperUsername = resolvePostageReshipper(selected, country, assignments);
  return { reshipperUsername, routingType: reshipperUsername ? "reshipper" as const : "unrouted" as const, fixedReshipper: Boolean(option?.reshipperUsername) };
}
