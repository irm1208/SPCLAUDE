import { Router, type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { db, accountsTable, ordersTable, productsTable, groupBuyProductsTable, groupBuysTable,
  testingPoolsTable, poolParticipantsTable, supplierTestingGroupsTable, supplierTestingInterestsTable, supplierTestingMembershipsTable } from "@workspace/db";
import { and, eq, sql } from "drizzle-orm";
import { requireAccount } from "../middleware/account-auth";
import { requireAdminForRequest, getAdminUsername } from "../middleware/require-admin";
import { getVendors } from "./config";
import { writeLog } from "../lib/audit-log";
import { isJbgSupplier, resolveTestingSupplier, supplierTestingIdentity, testingUsername } from "../lib/supplier-testing";
import { loadSupplierTestingItems, loadSupplierTestingGroups } from "../lib/supplier-testing-service";

const router = Router();
const adminAccess: RequestHandler = async (req, res, next) => {
  if (await requireAdminForRequest(req, res)) next();
};
const own = (username: string) => sql`lower(ltrim(${supplierTestingInterestsTable.accountUsername}, '@')) = ${testingUsername(username)}`;
const text = (value: unknown, max: number) => typeof value === "string" && value.trim().length <= max ? value.trim() : "";

router.get("/account/supplier-testing", requireAccount, async (req, res) => {
  const username = req.account!.telegramUsername;
  const [items, interests, groups] = await Promise.all([
    loadSupplierTestingItems(db, await getVendors(), username),
    db.select().from(supplierTestingInterestsTable).where(own(username)),
    loadSupplierTestingGroups(db, username),
  ]);
  const seen = new Set<string>();
  const out = items.filter(item => item.eligible || interests.some(i => i.orderId === item.orderId && i.productId === item.productId)).map(item => {
    const interest = interests.find(i => i.orderId === item.orderId && i.productId === item.productId);
    if (interest) seen.add(interest.id);
    const { username: _private, ...safe } = item;
    const eligible = item.eligible && (!interest || interest.supplierId === item.supplierId);
    return { ...safe, eligible, interestId: interest?.id ?? null, groupId: interest?.groupId ?? null,
      assignmentNote: interest?.assignmentNote ?? null,
      state: !eligible ? "retained_ineligible" : interest?.groupId ? "assigned" : interest ? "awaiting_batch" : "eligible" };
  });
  for (const interest of interests.filter(i => !seen.has(i.id))) out.push({
    orderId: interest.orderId, orderCode: interest.orderCode, orderType: null, productId: interest.productId,
    productName: interest.productName, supplierId: interest.supplierId, supplierName: interest.supplierName,
    quantity: 0, eligible: false, interestId: interest.id, groupId: interest.groupId,
    assignmentNote: interest.assignmentNote, state: "retained_ineligible",
  });
  res.set("Cache-Control", "no-store").json({ items: out, groups });
});

router.post("/account/supplier-testing/join", requireAccount, async (req, res) => {
  const username = req.account!.telegramUsername;
  const orderId = text(req.body?.orderId, 100), productId = text(req.body?.productId, 100);
  if (!orderId || !productId) { res.status(400).json({ error: "Choose a placed order and product." }); return; }
  const vendors = await getVendors();
  const result = await db.transaction(async tx => {
    // Serialize cancellation/refund/payment changes and duplicate joins on this source.
    const [order] = await tx.select().from(ordersTable).where(and(eq(ordersTable.id, orderId),
      sql`lower(ltrim(${ordersTable.telegramUsername}, '@')) = ${testingUsername(username)}`)).for("update");
    if (!order) return null;
    const item = (await loadSupplierTestingItems(tx, vendors, username, orderId)).find(i => i.productId === productId);
    if (!item?.eligible) return null;
    const [account] = await tx.select({ username: accountsTable.telegramUsername }).from(accountsTable)
      .where(sql`lower(ltrim(${accountsTable.telegramUsername}, '@')) = ${testingUsername(username)}`);
    if (!account) return null;
    const sourceKey = supplierTestingIdentity(orderId, productId);
    await tx.insert(supplierTestingInterestsTable).values({
      id: randomUUID(), sourceKey, accountUsername: account.username, orderId, productId,
      orderCode: item.orderCode, productName: item.productName, supplierId: item.supplierId, supplierName: item.supplierName,
    }).onConflictDoNothing({ target: supplierTestingInterestsTable.sourceKey });
    const [interest] = await tx.select().from(supplierTestingInterestsTable).where(and(eq(supplierTestingInterestsTable.sourceKey, sourceKey), own(username)));
    return interest?.supplierId === item.supplierId ? interest : null;
  });
  if (!result) { res.status(409).json({ error: "This product is not eligible on your placed order." }); return; }
  res.json({ interestId: result.id, groupId: result.groupId, state: result.groupId ? "assigned" : "awaiting_batch" });
});

router.get("/admin/supplier-testing", adminAccess, async (_req, res) => {
  const vendors = await getVendors();
  const suppliers = vendors.filter(isJbgSupplier).map(v => ({ id: v.id, name: v.name }));
  const [catalogue, gbProducts, interests, items, groups, pools] = await Promise.all([
    db.select().from(productsTable),
    db.select({ product: productsTable, supplier: groupBuysTable.labTestSupplier }).from(groupBuyProductsTable)
      .innerJoin(productsTable, eq(productsTable.id, groupBuyProductsTable.productId))
      .innerJoin(groupBuysTable, eq(groupBuysTable.id, groupBuyProductsTable.groupBuyId)),
    db.select().from(supplierTestingInterestsTable),
    loadSupplierTestingItems(db, vendors), loadSupplierTestingGroups(db),
    db.select({ id: testingPoolsTable.id, title: testingPoolsTable.title, status: testingPoolsTable.status, batchNumber: testingPoolsTable.batchNumber, leaderUsername: testingPoolsTable.leaderUsername }).from(testingPoolsTable),
  ]);
  const products = new Map<string, { id: string; name: string; supplierId: string }>();
  for (const p of catalogue) {
    const supplier = resolveTestingSupplier({ productVendorId: p.wholesaleVendorId, productVendor: p.vendor }, vendors);
    if (supplier) products.set(`${supplier.id}:${p.id}`, { id: p.id, name: p.name, supplierId: supplier.id });
  }
  for (const row of gbProducts) {
    const supplier = resolveTestingSupplier({ groupSupplier: row.supplier, productVendorId: row.product.wholesaleVendorId, productVendor: row.product.vendor }, vendors);
    if (supplier) products.set(`${supplier.id}:${row.product.id}`, { id: row.product.id, name: row.product.name, supplierId: supplier.id });
  }
  res.set("Cache-Control", "no-store").json({ suppliers, products: [...products.values()], groups, pools,
    interests: interests.map(i => ({ id: i.id, username: i.accountUsername, orderId: i.orderId, orderCode: i.orderCode,
      productId: i.productId, productName: i.productName, supplierId: i.supplierId, supplierName: i.supplierName,
      groupId: i.groupId, assignmentNote: i.assignmentNote,
      eligible: items.some(item => item.orderId === i.orderId && item.productId === i.productId &&
        item.supplierId === i.supplierId && item.eligible && testingUsername(item.username) === testingUsername(i.accountUsername)),
    })) });
});

router.post("/admin/supplier-testing/groups", adminAccess, async (req, res) => {
  const poolId = text(req.body?.poolId, 100), productId = text(req.body?.productId, 100);
  const supplierId = text(req.body?.supplierId, 100), batchNumber = text(req.body?.batchNumber, 100);
  const vendors = await getVendors(), supplier = vendors.find(v => v.id === supplierId && isJbgSupplier(v));
  if (!supplier || !poolId || !productId || !batchNumber) { res.status(400).json({ error: "Choose a JBG supplier, product, draft pool and physical batch code." }); return; }
  const result = await db.transaction(async tx => {
    const [pool] = await tx.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, poolId)).for("update");
    if (!pool || pool.status !== "draft") return { error: "Link a draft testing pool before opening it for contributions." };
    if (pool.leaderUsername !== "__admin__") return { error: "Only Admin-owned testing pools can be linked to supplier batches. Create a draft pool in Admin, without assigning a member leader." };
    if (pool.resultPostedAt || pool.resultPdfUrl || pool.resultNotes) return { error: "A pool with existing results cannot be assigned to a different physical batch." };
    const contributions = await tx.select({ id: poolParticipantsTable.id }).from(poolParticipantsTable).where(eq(poolParticipantsTable.poolId, poolId)).limit(1);
    if (contributions.length) return { error: "A pool with contribution history cannot be linked to a new supplier batch." };
    const [product] = await tx.select().from(productsTable).where(eq(productsTable.id, productId));
    if (!product) return { error: "Product not found." };
    let productSupplier = resolveTestingSupplier({ productVendorId: product.wholesaleVendorId, productVendor: product.vendor }, vendors);
    if (productSupplier?.id !== supplierId) {
      const linked = await tx.select({ supplier: groupBuysTable.labTestSupplier }).from(groupBuyProductsTable)
        .innerJoin(groupBuysTable, eq(groupBuysTable.id, groupBuyProductsTable.groupBuyId)).where(eq(groupBuyProductsTable.productId, productId));
      productSupplier = linked.map(g => resolveTestingSupplier({ groupSupplier: g.supplier }, vendors)).find(v => v?.id === supplierId) ?? null;
    }
    if (productSupplier?.id !== supplierId) return { error: "This product does not belong to the selected supplier." };
    const identityKey = supplierTestingIdentity(supplierId, productId, batchNumber);
    const [group] = await tx.insert(supplierTestingGroupsTable).values({
      id: randomUUID(), identityKey, poolId, supplierId, supplierName: supplier.name,
      productId, productName: product.name, batchNumber,
    }).onConflictDoNothing().returning();
    if (!group) return { error: "This product batch or testing pool is already linked." };
    await tx.update(testingPoolsTable).set({
      batchNumber, compoundName: product.name, manufacturer: supplier.name, mgSize: product.mgSize ?? null,
    }).where(eq(testingPoolsTable.id, poolId));
    return { id: group.id };
  });
  if ("error" in result) { res.status(409).json(result); return; }
  await writeLog("order", "info", "supplier_testing_group_created", "JBG testing batch configured", { ...result, poolId, productId, supplierId, batchNumber }, req.ip);
  res.status(201).json(result);
});

router.put("/admin/supplier-testing/interests/:id/assign", adminAccess, async (req, res) => {
  const groupId = text(req.body?.groupId, 100), note = text(req.body?.note, 1000);
  if (!groupId || !note) { res.status(400).json({ error: "Choose a batch group and record why it matches the purchased product batch." }); return; }
  const vendors = await getVendors();
  const result = await db.transaction(async tx => {
    // Order first, then interest: same order as joining, no inverted lock ordering.
    const [candidate] = await tx.select().from(supplierTestingInterestsTable).where(eq(supplierTestingInterestsTable.id, String(req.params.id)));
    if (!candidate) return { error: "Interest not found." };
    await tx.select({ id: ordersTable.id }).from(ordersTable).where(eq(ordersTable.id, candidate.orderId)).for("update");
    const [interest] = await tx.select().from(supplierTestingInterestsTable).where(eq(supplierTestingInterestsTable.id, candidate.id)).for("update");
    if (!interest) return { error: "Interest not found." };
    if (interest.groupId) return interest.groupId === groupId ? { id: interest.id } : { error: "An assigned batch cannot be silently changed. Retain the existing testing history." };
    const item = (await loadSupplierTestingItems(tx, vendors, interest.accountUsername, interest.orderId))
      .find(i => i.productId === interest.productId && i.supplierId === interest.supplierId && i.eligible);
    if (!item) return { error: "The source order or item is no longer eligible." };
    const [group] = await tx.select().from(supplierTestingGroupsTable).where(eq(supplierTestingGroupsTable.id, groupId));
    if (!group || group.supplierId !== interest.supplierId || group.productId !== interest.productId) return { error: "The batch must match the supplier and exact product ordered." };
    const [pool] = await tx.select().from(testingPoolsTable).where(eq(testingPoolsTable.id, group.poolId)).for("update");
    if (!pool || pool.status === "cancelled") return { error: "This testing group is unavailable." };
    await tx.insert(supplierTestingMembershipsTable).values({
      id: randomUUID(), groupId, accountUsername: interest.accountUsername,
    }).onConflictDoNothing({ target: [supplierTestingMembershipsTable.groupId, supplierTestingMembershipsTable.accountUsername] });
    await tx.update(supplierTestingInterestsTable).set({
      groupId, assignmentNote: note, assignedAt: new Date(), assignedBy: getAdminUsername(res) || "admin",
    }).where(eq(supplierTestingInterestsTable.id, interest.id));
    return { id: interest.id };
  });
  if ("error" in result) { res.status(409).json(result); return; }
  await writeLog("order", "info", "supplier_testing_batch_assigned", "JBG testing interest assigned to physical batch", { ...result, groupId, note }, req.ip);
  res.json(result);
});

export default router;
