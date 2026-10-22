import { accountsTable, auditLogsTable, db, ordersTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { refundMutableOrderWhereSkipActive } from "./refund-mutation-guard";

// Explicitly approved ownership correction, not an email-based auto-linker.
// Remove once its audit marker has been verified in production.
const ORDER_ID = "b19f235f-06dd-4c46-9798-5bd5584042a9";
const ORDER_CODE = "12437";
const SOURCE = "sablex4711";
const TARGET = "nomis4711";
const MARKER = "approved_order_12437_owner_repaired";
const canonical = (value: string | null | undefined) => value?.trim().replace(/^@/, "").toLowerCase() ?? "";
const email = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";

export async function repairApprovedOrderOwner() {
  if (process.env.NODE_ENV !== "production") return "not_production";
  return db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${MARKER}, 0))`);
    const [applied] = await tx.select({ id: auditLogsTable.id }).from(auditLogsTable)
      .where(eq(auditLogsTable.action, MARKER)).limit(1);
    if (applied) return "already_applied";

    const [order] = await tx.select().from(ordersTable)
      .where(and(eq(ordersTable.id, ORDER_ID), eq(ordersTable.code, ORDER_CODE))).for("update");
    if (!order || order.id !== ORDER_ID || order.code !== ORDER_CODE
      || canonical(order.telegramUsername) !== SOURCE || order.deletedAt
      || order.orderType !== "wholesale" || order.paymentStatus !== "confirmed"
      || Number(order.grandTotal) !== 765) return "not_applicable";

    const accounts = await tx.select().from(accountsTable)
      .where(inArray(accountsTable.telegramUsername, [TARGET, `@${TARGET}`, SOURCE, `@${SOURCE}`])).for("update");
    const targets = accounts.filter(account => canonical(account.telegramUsername) === TARGET);
    if (targets.length !== 1 || accounts.some(account => canonical(account.telegramUsername) === SOURCE))
      return "not_applicable";
    const account = targets[0]!;
    if (account.accountStatus !== "active" || !email(order.shippingEmail)
      || email(order.shippingEmail) !== email(account.email)) return "not_applicable";

    const [updated] = await tx.update(ordersTable).set({ telegramUsername: `@${TARGET}` })
      .where(refundMutableOrderWhereSkipActive(and(
        eq(ordersTable.id, ORDER_ID), eq(ordersTable.telegramUsername, order.telegramUsername),
      ))).returning({ id: ordersTable.id });
    if (!updated) return "not_applicable";
    await tx.insert(auditLogsTable).values({
      type: "change", level: "info", action: MARKER,
      message: "Applied explicitly approved order ownership correction; financial fields unchanged.",
      metadata: { orderId: ORDER_ID, code: ORDER_CODE, previousUsername: order.telegramUsername,
        username: `@${TARGET}`, reason: "Owner confirmed by Admin; shipping email matched the existing account" },
    });
    return "repaired";
  });
}
