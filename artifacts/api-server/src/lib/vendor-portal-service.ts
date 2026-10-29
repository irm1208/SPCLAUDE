import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db, accountsTable, fs3CostsTable, ordersTable, orderLineItemsTable,
  wholesaleSharesTable, wholesaleShareMembersTable, vendorPortalAccessTable,
  vendorSubmissionsTable, vendorAuditTable, productsTable, type VendorSnapshot,
} from "@workspace/db";
import { getVendors } from "../routes/config";
import { resolveProductVendor } from "./multi-vendor-shipping";
import { calcTotalShipping, pickRegionForCountry } from "./wholesale-shipping";
import { assertNoActiveRefunds, refundMutationPredicate } from "./refund-mutation-guard";
import { supplierCatalogueCosts, supplierItems, requiredShipping, sourceFingerprint, previewFingerprint, VendorPortalError } from "./vendor-portal-model";
import { centsToUsdString, usdToCents } from "./refund-money";

export type Executor = any;
export async function auditVendor(tx: Executor, actor: string, action: string, submissionId: string | null, details: Record<string, unknown> = {}) {
  await tx.insert(vendorAuditTable).values({ id: randomUUID(), actor, action, submissionId, details });
}
export async function vendorAccess(tx: Executor, username: string, lock = false) {
  let accountQuery = tx.select({ status: accountsTable.accountStatus }).from(accountsTable).where(eq(accountsTable.telegramUsername, username));
  if (lock) accountQuery = accountQuery.for("update");
  const [account] = await accountQuery;
  if (account?.status !== "active") throw new VendorPortalError("Account is not active.", 403);
  let query = tx.select().from(vendorPortalAccessTable).where(eq(vendorPortalAccessTable.username, username));
  if (lock) query = query.for("update");
  const [access] = await query;
  const vendor = access && (await getVendors()).find(v => v.id === access.vendorId);
  if (!vendor) throw new VendorPortalError("Vendor access is not enabled for this account.", 403);
  return { vendorId: vendor.id, vendorName: vendor.name, username };
}

export function validateSourceOrders(orders: any[]) {
  if (!orders.length) throw new VendorPortalError("Order no longer exists.", 409);
  for (const order of orders) {
    if (order.deletedAt || !["Submitted", "Processing", "Shipped", "Completed"].includes(order.status) ||
        !["wholesale", "wholesale_shared"].includes(order.orderType) || order.groupBuyId) {
      throw new VendorPortalError("An order was cancelled, completed or is not a wholesale order. Review it in Admin.", 409);
    }
    if (order.paymentStatus !== "confirmed" ||
        (Number(order.amountDue) > 0 && !["confirmed", "waived"].includes(order.balancePaymentStatus))) {
      throw new VendorPortalError("All orders must be fully paid with no unresolved balance before fulfilment.", 409);
    }
  }
}

// Locks use the same parent→member-order direction as shared-order workflows.
export async function loadVendorSource(tx: Executor, sourceKey: string, lock = false) {
  const [baseKey, selectedVendorId] = sourceKey.split(":vendor:");
  const sharedId = baseKey.startsWith("share:") ? baseKey.slice(6) : null;
  let share: any = null;
  let orderIds: string[];
  if (sharedId) {
    let query = tx.select().from(wholesaleSharesTable).where(eq(wholesaleSharesTable.id, sharedId));
    if (lock) query = query.for("update");
    [share] = await query;
    if (!share || share.status !== "submitted" || share.organiserPaymentStatus !== "confirmed") {
      throw new VendorPortalError("Shared order must be submitted and its platform payment confirmed.", 409);
    }
    const members = await tx.select({ orderId: wholesaleShareMembersTable.orderId }).from(wholesaleShareMembersTable)
      .where(eq(wholesaleShareMembersTable.shareId, sharedId));
    if (!members.length || members.some((m: any) => !m.orderId)) throw new VendorPortalError("Shared order membership is incomplete.", 409);
    orderIds = members.map((m: any) => m.orderId).sort();
  } else {
    if (!sourceKey.startsWith("order:")) throw new VendorPortalError("Invalid order source.");
    orderIds = [sourceKey.slice(6)];
  }
  let query = tx.select().from(ordersTable).where(inArray(ordersTable.id, orderIds)).orderBy(asc(ordersTable.id));
  if (lock) query = query.for("update");
  let orders: any[] = await query;
  if (orders.length !== orderIds.length) throw new VendorPortalError("Order membership changed. Review the order.", 409);
  validateSourceOrders(orders);
  if (orders.some(o => (sharedId ? o.sharedOrderId !== sharedId || o.orderType !== "wholesale_shared" : o.sharedOrderId || o.orderType !== "wholesale"))) {
    throw new VendorPortalError("Order does not match this supplier shipment.", 409);
  }
  if (lock) await assertNoActiveRefunds(tx, orderIds);
  else {
    const mutable = await tx.select({ id: ordersTable.id }).from(ordersTable).where(and(inArray(ordersTable.id, orderIds), refundMutationPredicate()));
    if (mutable.length !== orderIds.length) throw new VendorPortalError("Order has an active refund.", 409);
  }
  const allItems = await tx.select({
    productId: orderLineItemsTable.productId, productName: orderLineItemsTable.productName,
    quantity: orderLineItemsTable.quantity, vendorId: orderLineItemsTable.vendorId, orderId: orderLineItemsTable.orderId,
  }).from(orderLineItemsTable).where(inArray(orderLineItemsTable.orderId, orderIds));
  const vendors = await getVendors();
  const products: any[] = await tx.select().from(productsTable).where(inArray(productsTable.id, allItems.map((i: any) => i.productId)));
  const resolvedItems = allItems.map((i: any) => ({
    ...i, vendorId: i.vendorId ?? share?.vendorId ?? orders.find(o => o.id === i.orderId)?.wholesaleVendorId
      ?? resolveProductVendor(products.find(p => p.id === i.productId) ?? {}, vendors)?.id ?? null,
  }));
  const items = selectedVendorId ? resolvedItems.filter((i: any) => i.vendorId === selectedVendorId) : resolvedItems;
  if (!items.length) throw new VendorPortalError("This order has no items for the selected vendor.", 409);
  const vendorIds = [...new Set<string>(items.map((i: any) => i.vendorId).filter(Boolean))];
  if (selectedVendorId && (vendorIds.length !== 1 || vendorIds[0] !== selectedVendorId)) throw new VendorPortalError("Vendor ownership is unclear. Review the order in Admin.", 409);
  orderIds = [...new Set<string>(items.map((i: any) => i.orderId))].sort();
  orders = orders.filter(o => orderIds.includes(o.id));
  const shipping = requiredShipping(share ?? orders[0]);
  return {
    orderIds, orders, share, items, shipping, vendorIds, products,
    fingerprint: sourceFingerprint({ items, shipping, orderIds }),
    reference: sharedId ? `Shared ${sharedId}` : orders[0].code,
  };
}

export async function isVendorSubmissionStale(tx: Executor, row: any): Promise<boolean> {
  try {
    const source = await loadVendorSource(tx, row.sourceKey);
    return source.fingerprint !== row.sourceFingerprint || source.vendorIds.some(id => id !== row.vendorId);
  } catch (error) {
    if (error instanceof VendorPortalError || (error as any)?.name === "RefundMutationBlockedError") return true;
    throw error;
  }
}

export async function prepareVendorShipments(tx: Executor, vendorId: string, orderCodes: string[]) {
  const vendor = (await getVendors()).find(v => v.id === vendorId);
  if (!vendor) throw new VendorPortalError("Choose a configured wholesale vendor.");
  const codes = [...new Set(orderCodes)];
  if (!codes.length || codes.length > 100 || codes.some(c => !/^[0-9]{1,20}$/.test(c))) throw new VendorPortalError("Enter between 1 and 100 wholesale order numbers.");
  const matches = await tx.select({ id: ordersTable.id, code: ordersTable.code, sharedOrderId: ordersTable.sharedOrderId })
    .from(ordersTable).where(and(inArray(ordersTable.code, codes), isNull(ordersTable.deletedAt)));
  if (matches.length !== codes.length || codes.some(c => matches.filter((o: any) => o.code === c).length !== 1)) {
    throw new VendorPortalError("Some order numbers are missing or ambiguous. Check the selected orders.");
  }
  const keys: string[] = [...new Set<string>(matches.map((o: any) => o.sharedOrderId ? `share:${o.sharedOrderId}:vendor:${vendorId}` : `order:${o.id}`))].sort();
  const costs = await tx.select().from(fs3CostsTable);
  const prepared = [];
  for (let sourceKey of keys) {
    if (sourceKey.includes(":vendor:")) {
      const legacyKey = sourceKey.split(":vendor:")[0];
      const [legacy] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.sourceKey, legacyKey));
      if (legacy) {
        if (legacy.vendorId !== vendorId) throw new VendorPortalError("This legacy shipment is already assigned to another vendor.", 409);
        sourceKey = legacyKey;
      }
    }
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-submit:${sourceKey}`}))`);
    const source = await loadVendorSource(tx, sourceKey, true);
    if (source.vendorIds.length !== 1 || source.vendorIds[0] !== vendorId) throw new VendorPortalError("This order belongs to a different vendor. Review its vendor assignment.", 409);
    const [existing] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.sourceKey, sourceKey)).for("update");
    if (existing) {
      if (existing.vendorId !== vendorId) throw new VendorPortalError("This shipment is already submitted to another vendor.", 409);
      if (existing.sourceFingerprint !== source.fingerprint) throw new VendorPortalError("This submission is stale. Recall it in Admin before resubmitting.", 409);
      prepared.push({ ...existing, alreadySubmitted: true });
      continue;
    }
    if (source.orders.some(o => ["Shipped", "Completed"].includes(o.status))) throw new VendorPortalError("An already shipped or completed order cannot be submitted as a new supplier shipment.", 409);
    const distinctCosts = supplierCatalogueCosts(source.items, source.products, costs);
    const items = supplierItems(source.items, distinctCosts);
    const kits = items.reduce((total, i) => total + i.quantity, 0);
    const region = pickRegionForCountry(vendor, source.shipping.country);
    const shippingAmount = region && calcTotalShipping(vendor, region.region, kits);
    if (shippingAmount == null || !Number.isFinite(shippingAmount) || shippingAmount < 0) {
      throw new VendorPortalError(`Set calculable supplier shipping rates for ${source.shipping.country} on ${vendor.name} before submitting.`);
    }
    const productCents = items.reduce((sum, i) => sum + usdToCents(i.lineTotal), 0n);
    const shippingCost = shippingAmount.toFixed(2);
    const snapshot: VendorSnapshot = { items, shipping: source.shipping, currency: "USD",
      productCost: centsToUsdString(productCents), shippingCost, totalCost: centsToUsdString(productCents + usdToCents(shippingCost)) };
    prepared.push({
      id: sourceKey, sourceKey, reference: source.reference, vendorId,
      sharedOrderId: source.share?.id ?? null, orderIds: source.orderIds,
      sourceFingerprint: source.fingerprint, snapshot, status: "Submitted", submittedAt: null,
      trackingNumber: null, carrier: null, alreadySubmitted: false,
    });
  }
  return prepared;
}

export function vendorPreviewToken(prepared: any[]) {
  return previewFingerprint(prepared.map(p => ({
    sourceKey: p.sourceKey, vendorId: p.vendorId, sourceFingerprint: p.sourceFingerprint,
    snapshot: p.snapshot,
  })));
}

export async function submitVendorOrders(vendorId: string, codes: string[], token: string, actor: string) {
  return db.transaction(async tx => {
    const prepared = await prepareVendorShipments(tx, vendorId, codes);
    if (!token || token !== vendorPreviewToken(prepared)) throw new VendorPortalError("Orders or supplier prices changed. Preview again before submitting.", 409);
    for (const p of prepared) {
      if (p.alreadySubmitted) continue;
      const id = randomUUID();
      await tx.insert(vendorSubmissionsTable).values({
        id, sourceKey: p.sourceKey, vendorId, reference: p.reference, orderIds: p.orderIds,
        sharedOrderId: p.sharedOrderId, snapshot: p.snapshot, sourceFingerprint: p.sourceFingerprint, submittedBy: actor,
      });
      await auditVendor(tx, actor, "submitted", id, { vendorId, orderCount: p.orderIds.length });
    }
    return { ok: true };
  });
}
