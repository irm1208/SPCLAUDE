import { randomUUID } from "node:crypto";
import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import {
  db, accountsTable, fs3CostsTable, ordersTable, orderLineItemsTable,
  wholesaleSharesTable, wholesaleShareMembersTable, vendorPortalAccessTable, vendorPortalRequestsTable,
  vendorAccountsTable, vendorSessionsTable, vendorSubmissionsTable, vendorAuditTable, productsTable, type VendorSnapshot,
} from "@workspace/db";
import { getVendors } from "../routes/config";
import { calcTotalShipping, pickRegionForCountry } from "./wholesale-shipping";
import { assertNoActiveRefunds, refundMutationPredicate } from "./refund-mutation-guard";
import { supplierCatalogueCosts, supplierItems, requiredShipping, sourceFingerprint, previewFingerprint, VendorPortalError, type VendorApplicationInput } from "./vendor-portal-model";
import { centsToUsdString, usdToCents } from "./refund-money";
import { supplierTextDetails } from "./vendor-supplier-export";
import { loadFs3CostMatches } from "./fs3-cost-matches";
import { resolveFs3SupplierId } from "@workspace/api-zod/fs3-costs";
import { assertVendorOpen, VendorClosedError } from "./vendor-portal-extras";

export type Executor = any;
export async function auditVendor(tx: Executor, actor: string, action: string, submissionId: string | null, details: Record<string, unknown> = {}) {
  await tx.insert(vendorAuditTable).values({ id: randomUUID(), actor, action, submissionId, details });
}
export async function vendorAccess(tx: Executor, username: string, lock = false, sessionHash?: string) {
  let query = tx.select().from(vendorAccountsTable).where(eq(vendorAccountsTable.username, username));
  if (lock) query = query.for("update");
  const [account] = await query;
  if (account?.status !== "active" || !account.vendorId) throw new VendorPortalError("Vendor account is not active or assigned.", 403);
  // Recheck the session after taking the account lock, so resets/suspensions
  // and vendor reassignment cannot race an in-flight fulfilment mutation.
  if (sessionHash) {
    const [session] = await tx.select({ expiresAt: vendorSessionsTable.expiresAt }).from(vendorSessionsTable)
      .where(and(eq(vendorSessionsTable.tokenHash, sessionHash), eq(vendorSessionsTable.username, username)));
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) throw new VendorPortalError("Vendor session expired or revoked.", 401);
  }
  const vendor = (await getVendors()).find(v => v.id === account.vendorId);
  if (!vendor) throw new VendorPortalError("Vendor access is not enabled for this account.", 403);
  return { vendorId: vendor.id, vendorName: vendor.name, username };
}

export async function vendorApplicationFor(tx: Executor, username: string) {
  const [row] = await tx.select().from(vendorPortalRequestsTable).where(eq(vendorPortalRequestsTable.username, username));
  return row ?? null;
}

/** A signed-in account asks for vendor portal access. Re-applying after a rejection replaces the old application. */
export async function applyForVendorAccess(tx: Executor, username: string, input: VendorApplicationInput) {
  const [account] = await tx.select({ status: accountsTable.accountStatus }).from(accountsTable).where(eq(accountsTable.telegramUsername, username)).for("update");
  if (account?.status !== "active") throw new VendorPortalError("Account is not active.", 403);
  const [access] = await tx.select({ vendorId: vendorPortalAccessTable.vendorId }).from(vendorPortalAccessTable).where(eq(vendorPortalAccessTable.username, username));
  if (access) throw new VendorPortalError("This account already has vendor access.", 409);
  const existing = await vendorApplicationFor(tx, username);
  if (existing?.status === "pending") throw new VendorPortalError("Your application is already waiting for review.", 409);
  if (input.requestedVendorId && !(await getVendors()).some(v => v.id === input.requestedVendorId)) throw new VendorPortalError("Vendor not found.");
  const values = { ...input, status: "pending", reviewedBy: null, reviewedAt: null, reviewNote: null, updatedAt: new Date() };
  const [row] = await tx.insert(vendorPortalRequestsTable).values({ username, ...values, createdAt: new Date() })
    .onConflictDoUpdate({ target: vendorPortalRequestsTable.username, set: { ...values, createdAt: new Date() } }).returning();
  await auditVendor(tx, username, "access_requested", null, { companyName: input.companyName, requestedVendorId: input.requestedVendorId });
  return row;
}

/** Admin decision. Approval links the account to a configured vendor exactly like a manual grant. */
export async function reviewVendorApplication(
  tx: Executor, username: string, decision: "approved" | "rejected", actor: string,
  options: { vendorId?: unknown; note?: unknown } = {},
) {
  const note = typeof options.note === "string" && options.note.trim() ? options.note.trim().slice(0, 500) : null;
  const [row] = await tx.select().from(vendorPortalRequestsTable).where(eq(vendorPortalRequestsTable.username, username)).for("update");
  if (!row) throw new VendorPortalError("Application not found.", 404);
  if (row.status !== "pending") throw new VendorPortalError("This application has already been reviewed.", 409);
  let vendorId: string | null = null;
  if (decision === "approved") {
    vendorId = typeof options.vendorId === "string" ? options.vendorId : "";
    if (!vendorId || !(await getVendors()).some(v => v.id === vendorId)) throw new VendorPortalError("Choose the vendor profile to link. Create it in Wholesale setup first if it is missing.");
    const [account] = await tx.select({ status: accountsTable.accountStatus }).from(accountsTable).where(eq(accountsTable.telegramUsername, username)).for("update");
    if (account?.status !== "active") throw new VendorPortalError("An active account is required.", 409);
    await tx.insert(vendorPortalAccessTable).values({ username, vendorId, grantedBy: actor }).onConflictDoUpdate({
      target: vendorPortalAccessTable.username, set: { vendorId, grantedBy: actor, updatedAt: new Date() },
    });
  }
  const [updated] = await tx.update(vendorPortalRequestsTable)
    .set({ status: decision, reviewedBy: actor, reviewedAt: new Date(), reviewNote: note, updatedAt: new Date() })
    .where(eq(vendorPortalRequestsTable.username, username)).returning();
  await auditVendor(tx, actor, decision === "approved" ? "access_granted" : "application_rejected", null, { username, vendorId, note, via: "application" });
  return { ...updated, vendorId };
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
export async function loadVendorSource(tx: Executor, sourceKey: string, lock = false, purpose: "submission" | "export" = "submission") {
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
    ...i, vendorId: resolveFs3SupplierId({
      vendorId: i.vendorId, shareVendorId: share?.vendorId,
      wholesaleVendorId: orders.find(o => o.id === i.orderId)?.wholesaleVendorId,
    }, products.find(p => p.id === i.productId) ?? {}, vendors),
  }));
  const items = selectedVendorId ? resolvedItems.filter((i: any) => i.vendorId === selectedVendorId) : resolvedItems;
  if (!items.length) throw new VendorPortalError("This order has no items for the selected vendor.", 409);
  const vendorIds = [...new Set<string>(items.map((i: any) => i.vendorId).filter(Boolean))];
  if (selectedVendorId && (vendorIds.length !== 1 || vendorIds[0] !== selectedVendorId)) throw new VendorPortalError("Vendor ownership is unclear. Review the order in Admin.", 409);
  orderIds = [...new Set<string>(items.map((i: any) => i.orderId))].sort();
  orders = orders.filter(o => orderIds.includes(o.id));
  const shipping = requiredShipping(share ?? orders[0], purpose);
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

export async function prepareVendorShipments(tx: Executor, vendorId: string, orderCodes: string[], purpose: "submission" | "export" = "submission") {
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
  const costMatches = await loadFs3CostMatches(tx);
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
    const source = await loadVendorSource(tx, sourceKey, true, purpose);
    if (source.vendorIds.length !== 1 || source.vendorIds[0] !== vendorId) throw new VendorPortalError("This order belongs to a different vendor. Review its vendor assignment.", 409);
    const [existing] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.sourceKey, sourceKey)).for("update");
    if (existing) {
      if (existing.vendorId !== vendorId) throw new VendorPortalError("This shipment is already submitted to another vendor.", 409);
      if (existing.sourceFingerprint !== source.fingerprint) throw new VendorPortalError("This submission is stale. Recall it in Admin before resubmitting.", 409);
      prepared.push({ ...existing, alreadySubmitted: true,
        ...(purpose === "export" ? supplierTextDetails(String(source.orders[0]?.telegramUsername ?? ""), existing.snapshot, vendor) : {}),
      });
      continue;
    }
    if (source.orders.some(o => ["Shipped", "Completed"].includes(o.status))) throw new VendorPortalError("An already shipped or completed order cannot be submitted as a new supplier shipment.", 409);
    const distinctCosts = supplierCatalogueCosts(source.items, source.products, costs, costMatches);
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
      ...(purpose === "export" ? supplierTextDetails(String(source.orders[0]?.telegramUsername ?? ""), snapshot, vendor) : {}),
    });
  }
  if (purpose === "export") {
    // Keep the user's selected order sequence without changing lock ordering.
    const position = new Map<string, number>(matches.map((m: any) => [m.id, codes.indexOf(m.code)]));
    const rank = (shipment: any) => Math.min(...shipment.orderIds.map((id: string) => position.get(id) ?? Infinity));
    prepared.sort((a, b) => rank(a) - rank(b));
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
    await saveVendorShipments(tx, vendorId, prepared, actor);
    return { ok: true };
  });
}

async function saveVendorShipments(tx: Executor, vendorId: string, prepared: any[], actor: string) {
  for (const p of prepared) {
    if (p.alreadySubmitted) continue;
    const id = randomUUID();
    await tx.insert(vendorSubmissionsTable).values({
      id, sourceKey: p.sourceKey, vendorId, reference: p.reference, orderIds: p.orderIds,
      sharedOrderId: p.sharedOrderId, snapshot: p.snapshot, sourceFingerprint: p.sourceFingerprint, submittedBy: actor,
    });
    await auditVendor(tx, actor, "submitted", id, { vendorId, orderCount: p.orderIds.length });
  }
}

/** Internal payment automation: uses the same locked checks as manual submission. */
export async function autoSubmitPaidVendorOrder(orderId: string) {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId));
  if (!order) return;
  const baseKey = order.sharedOrderId ? `share:${order.sharedOrderId}` : `order:${order.id}`;
  const source = await loadVendorSource(db, baseKey);
  if (!source.vendorIds.length) throw new VendorPortalError("Vendor ownership is unclear. Review the order in Admin.", 409);
  const failures: string[] = [];
  for (const vendorId of source.vendorIds.sort()) {
    try { await db.transaction(async tx => {
      // Holiday mode: leave the order unrouted and let the scheduler retry once the vendor reopens.
      await assertVendorOpen(tx, vendorId);
      const sourceKey = order.sharedOrderId ? `${baseKey}:vendor:${vendorId}` : baseKey;
      // Coordinate both vendor-scoped and legacy recalls before inspecting state.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-submit:${baseKey}`}))`);
      if (sourceKey !== baseKey) await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`vendor-submit:${sourceKey}`}))`);
      const [recalled] = await tx.select({ id: vendorAuditTable.id }).from(vendorAuditTable).where(and(
        eq(vendorAuditTable.action, "submission_recalled"),
        sql`${vendorAuditTable.details}->>'sourceKey' IN (${sourceKey}, ${baseKey})`,
        sql`${vendorAuditTable.details}->>'vendorId' = ${vendorId}`,
      )).limit(1);
      if (recalled) return;
      const [existing] = await tx.select({ id: vendorSubmissionsTable.id }).from(vendorSubmissionsTable)
        .where(inArray(vendorSubmissionsTable.sourceKey, [sourceKey, baseKey])).limit(1);
      if (existing) return;
      const prepared = await prepareVendorShipments(tx, vendorId, [order.code]);
      await saveVendorShipments(tx, vendorId, prepared, "system:paid-order");
    }); } catch (error) {
      if (error instanceof VendorClosedError) continue;
      failures.push(`${vendorId}: ${error instanceof Error ? error.message : "Submission failed"}`);
    }
  }
  if (failures.length) throw new VendorPortalError(failures.join("; "), 409);
}
