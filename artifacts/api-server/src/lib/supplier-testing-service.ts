import { ordersTable, orderLineItemsTable, productsTable, groupBuysTable, wholesaleShareMembersTable,
  supplierTestingInterestsTable, supplierTestingGroupsTable, testingPoolsTable, poolParticipantsTable } from "@workspace/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import { eligibleTestingOrder, resolveTestingSupplier, testingUsername } from "./supplier-testing";

export async function loadSupplierTestingItems(database: any, vendors: { id: string; name: string }[], username?: string, orderId?: string) {
  const conditions = [];
  if (username) conditions.push(sql`lower(ltrim(${ordersTable.telegramUsername}, '@')) = ${testingUsername(username)}`);
  if (orderId) conditions.push(eq(ordersTable.id, orderId));
  const rows = await database.select({
    order: ordersTable, line: orderLineItemsTable, product: productsTable,
    groupSupplier: groupBuysTable.labTestSupplier, memberId: wholesaleShareMembersTable.id,
  }).from(ordersTable)
    .innerJoin(orderLineItemsTable, eq(orderLineItemsTable.orderId, ordersTable.id))
    .leftJoin(productsTable, eq(productsTable.id, orderLineItemsTable.productId))
    .leftJoin(groupBuysTable, eq(groupBuysTable.id, ordersTable.groupBuyId))
    .leftJoin(wholesaleShareMembersTable, and(eq(wholesaleShareMembersTable.orderId, ordersTable.id),
      eq(wholesaleShareMembersTable.shareId, ordersTable.sharedOrderId),
      sql`lower(ltrim(${wholesaleShareMembersTable.username}, '@')) = lower(ltrim(${ordersTable.telegramUsername}, '@'))`))
    .where(and(...conditions));
  const result = new Map<string, any>();
  const conflicts = new Set<string>();
  for (const row of rows) {
    const { order, line, product } = row;
    const supplier = resolveTestingSupplier({
      vendorId: line.vendorId || order.wholesaleVendorId,
      productVendorId: product?.wholesaleVendorId, productVendor: product?.vendor,
      groupSupplier: order.groupBuyId ? row.groupSupplier : null,
    }, vendors);
    if (!supplier || !(Number(line.quantity) > 0)) continue;
    const key = `${order.id}:${line.productId}`;
    if (conflicts.has(key)) continue;
    const previous = result.get(key);
    if (previous && previous.supplierId !== supplier.id) { result.delete(key); conflicts.add(key); continue; }
    const eligible = eligibleTestingOrder(order, username ?? order.telegramUsername)
      && (order.orderType !== "wholesale_shared" || !!row.memberId) && !line.isOos;
    result.set(key, {
      orderId: order.id, orderCode: order.code, orderType: order.groupBuyId ? "group_buy" : order.orderType,
      username: order.telegramUsername, productId: line.productId, productName: line.productName,
      supplierId: supplier.id, supplierName: supplier.name,
      quantity: (previous?.quantity ?? 0) + Number(line.quantity), eligible,
    });
  }
  return [...result.values()];
}

export async function loadSupplierTestingGroups(database: any, username?: string) {
  const groups = await database.select({ group: supplierTestingGroupsTable, pool: testingPoolsTable })
    .from(supplierTestingGroupsTable).innerJoin(testingPoolsTable, eq(testingPoolsTable.id, supplierTestingGroupsTable.poolId));
  const interests = username ? await database.select().from(supplierTestingInterestsTable)
    .where(sql`lower(ltrim(${supplierTestingInterestsTable.accountUsername}, '@')) = ${testingUsername(username)}`) : [];
  const joined = new Set(interests.map((i: any) => i.groupId));
  // An unknown batch must never imply that another batch's results cover this member's order.
  const visible = groups.filter((g: any) => !username || joined.has(g.group.id));
  const ids = visible.map((g: any) => g.pool.id);
  const payments = ids.length ? await database.select({
    poolId: poolParticipantsTable.poolId, id: poolParticipantsTable.id, accountUsername: poolParticipantsTable.accountUsername,
    amountUsd: poolParticipantsTable.amountUsd, paymentStatus: poolParticipantsTable.paymentStatus,
  }).from(poolParticipantsTable).where(inArray(poolParticipantsTable.poolId, ids)) : [];
  return visible.map(({ group, pool }: any) => ({
    id: group.id, poolId: pool.id, slug: pool.slug, title: pool.title,
    supplierId: group.supplierId, supplierName: group.supplierName, productId: group.productId,
    productName: group.productName, batchNumber: group.batchNumber, status: pool.status,
    targetAmountUsd: Number(pool.targetAmountUsd),
    raisedUsd: Number(payments.filter((p: any) => p.poolId === pool.id && p.paymentStatus === "verified")
      .reduce((sum: number, p: any) => sum + Number(p.amountUsd), 0).toFixed(2)),
    hasResults: !!pool.resultPostedAt, joined: joined.has(group.id),
    contributions: username ? payments.filter((p: any) => p.poolId === pool.id && p.accountUsername &&
      testingUsername(p.accountUsername) === testingUsername(username)).map((p: any) =>
      ({ id: p.id, amountUsd: Number(p.amountUsd), paymentStatus: p.paymentStatus })) : [],
  }));
}
