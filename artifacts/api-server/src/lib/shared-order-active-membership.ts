import { ordersTable, wholesaleShareMembersTable } from "@workspace/db";
import { sql } from "drizzle-orm";

export function activeSharedOrderMembershipWhere() {
  return sql`(
    ${ordersTable.orderType} IS DISTINCT FROM 'wholesale_shared'
    OR EXISTS (
      SELECT 1
      FROM ${wholesaleShareMembersTable} AS active_shared_member
      WHERE active_shared_member.order_id = ${ordersTable.id}
    )
  )`;
}

export function orphanedSharedOrderMembershipWhere() {
  return sql`(
    ${ordersTable.orderType} = 'wholesale_shared'
    AND NOT EXISTS (
      SELECT 1
      FROM ${wholesaleShareMembersTable} AS active_shared_member
      WHERE active_shared_member.order_id = ${ordersTable.id}
    )
  )`;
}