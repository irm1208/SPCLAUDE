import { Router, type Request, type Response } from "express";
import multer from "multer";
import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db, accountsTable, ordersTable, orderLineItemsTable, wholesaleSharesTable,
  vendorPortalAccessTable, vendorSubmissionsTable, vendorImagesTable,
} from "@workspace/db";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { getVendors } from "./config";
import { normalizeTg } from "../lib/normalize";
import {
  auditVendor, vendorAccess, prepareVendorShipments, vendorPreviewToken,
  submitVendorOrders, loadVendorSource, isVendorSubmissionStale,
} from "../lib/vendor-portal-service";
import { publicVendorOrder, VendorPortalError } from "../lib/vendor-portal-model";
import { vendorSupplierText, vendorSupplierCsv } from "../lib/vendor-supplier-export";
import { prepareTrackingWrite } from "../lib/tracking-write";
import { refreshWholesaleMainParcelForShare } from "../lib/tracking-auto-refresh";
import { notifyUser } from "../lib/telegram";
import { storePageUpdateImage, downloadWholesaleUpdateImage, deleteWholesaleUpdateImage } from "../lib/wholesale-update-images";
import { WholesaleUpdateValidationError } from "../lib/wholesale-updates";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 } }).single("file");
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      if ((error as any)?.name === "RefundMutationBlockedError") { res.status(409).json({ error: "This order has an active refund and cannot be fulfilled." }); return; }
      console.error("[vendor-portal]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the vendor request. Please try again." });
    }
  };
}
function sameOrigin(req: Request, res: Response, next: () => void) {
  if (["GET", "HEAD"].includes(req.method)) { next(); return; }
  const origin = req.get("origin");
  let foreign = req.get("sec-fetch-site") === "cross-site";
  if (origin) {
    try { foreign ||= new URL(origin).host !== (req.get("x-forwarded-host") ?? req.get("host")); }
    catch { foreign = true; }
  }
  if (foreign) { res.status(403).json({ error: "Cross-site requests are not permitted." }); return; }
  next();
}
const username = (req: Request) => normalizeTg(req.account!.telegramUsername);
async function imageList(row: any, prefix: "vendor" | "admin/vendor-portal" | "account", tx: any = db) {
  const images = await tx.select().from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id)).orderBy(desc(vendorImagesTable.createdAt));
  return images.map((image: any) => ({
    id: image.id, filename: image.filename, createdAt: image.createdAt,
    url: `/api/${prefix}/vendor-images/${image.id}`,
  }));
}
async function ownedSubmission(tx: any, id: string, vendorId: string, lock = false) {
  let query = tx.select().from(vendorSubmissionsTable).where(and(eq(vendorSubmissionsTable.id, id), eq(vendorSubmissionsTable.vendorId, vendorId)));
  if (lock) query = query.for("update");
  const [row] = await query;
  if (!row) throw new VendorPortalError("Order not found.", 404);
  return row;
}
async function memberMaySee(req: Request, row: any) {
  const member = username(req);
  const source = await loadVendorSource(db, row.sourceKey);
  if (source.fingerprint !== row.sourceFingerprint) throw new VendorPortalError("Images unavailable while the order is being reviewed.", 404);
  if (source.share) {
    // A combined shipment photo may contain the recipient's label. Never share it with other participants.
    if (normalizeTg(source.share.deliveryUsername ?? "") !== member) throw new VendorPortalError("Image not found.", 404);
  } else if (!source.orders.some(o => normalizeTg(o.telegramUsername) === member)) {
    throw new VendorPortalError("Image not found.", 404);
  }
}

router.get("/vendor/me", requireAccount, handled(async (req, res) => {
  res.json(await vendorAccess(db, username(req)));
}));
router.get("/vendor/orders", requireAccount, handled(async (req, res) => {
  const access = await vendorAccess(db, username(req));
  const rows = await db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.vendorId, access.vendorId)).orderBy(desc(vendorSubmissionsTable.submittedAt));
  const orders = [];
  for (const row of rows) orders.push(publicVendorOrder(row, await isVendorSubmissionStale(db, row), await imageList(row, "vendor")));
  res.set("Cache-Control", "no-store").json({ orders });
}));
router.patch("/vendor/orders/:id", requireAccount, sameOrigin, handled(async (req, res) => {
  const body = req.body ?? {};
  if (!["processing", "tracking"].includes(body.action) || Object.keys(body).some(k => !["action", "trackingNumber", "carrier"].includes(k))) {
    throw new VendorPortalError("Only processing and tracking updates are permitted.");
  }
  let refreshShare: string | null = null;
  const notifications: Array<{ username: string; code: string }> = [];
  await db.transaction(async tx => {
    const access = await vendorAccess(tx, username(req), true);
    // Parent and orders first, matching shared-order mutations; submission is locked last.
    const initial = await ownedSubmission(tx, String(req.params.id), access.vendorId);
    const source = await loadVendorSource(tx, initial.sourceKey, true);
    const row = await ownedSubmission(tx, initial.id, access.vendorId, true);
    if (source.fingerprint !== row.sourceFingerprint || source.vendorIds.some(id => id !== access.vendorId)) {
      throw new VendorPortalError("The order changed after submission. Ask Admin to review it before continuing.", 409);
    }
    if (source.orders.some(o => o.status === "Completed")) throw new VendorPortalError("Completed orders cannot be changed by the vendor.", 409);
    const now = new Date();
    if (body.action === "processing") {
      if (row.status === "Shipped" || source.orders.some(o => o.status === "Shipped")) throw new VendorPortalError("A shipped order cannot move back to processing.", 409);
      await tx.update(ordersTable).set({ status: "Processing", updatedAt: now }).where(and(inArray(ordersTable.id, row.orderIds), eq(ordersTable.status, "Submitted")));
      await tx.update(vendorSubmissionsTable).set({ status: "Processing", updatedAt: now }).where(eq(vendorSubmissionsTable.id, row.id));
    } else {
      if (typeof body.trackingNumber !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9 ._/-]{2,199}$/.test(body.trackingNumber.trim()) ||
          typeof body.carrier !== "string" || !body.carrier.trim() || body.carrier.length > 120) {
        throw new VendorPortalError("Enter a valid tracking number and carrier.");
      }
      const trackingNumber = body.trackingNumber.trim();
      const carrier = body.carrier.trim();
      const mixed = source.share && (source.share.vendorShippingBreakdown?.length ?? 0) > 1;
      const otherSubmissions = mixed ? await tx.select().from(vendorSubmissionsTable)
        .where(eq(vendorSubmissionsTable.sharedOrderId, row.sharedOrderId!)) : [];
      for (const order of source.orders) {
        if (mixed) {
          const lines = await tx.select({ vendorId: orderLineItemsTable.vendorId }).from(orderLineItemsTable)
            .where(eq(orderLineItemsTable.orderId, order.id));
          const expected = [...new Set(lines.map(l => l.vendorId ?? source.share.vendorId))];
          const allShipped = expected.every(id => id === row.vendorId || otherSubmissions.some(s => s.vendorId === id && s.status === "Shipped" && s.orderIds.includes(order.id)));
          await tx.update(ordersTable).set({status:allShipped ? "Shipped" : "Processing",updatedAt:now}).where(eq(ordersTable.id,order.id));
          if (allShipped && order.status !== "Shipped") notifications.push({username:order.telegramUsername,code:order.code});
          continue;
        }
        const changed = order.trackingNumber !== trackingNumber || order.shippingCarrier !== carrier || order.status !== "Shipped";
        if (!changed) continue;
        let tracking;
        try {
          tracking = prepareTrackingWrite(order, { trackingNumber, trackingNumbers: [trackingNumber] });
        } catch {
          throw new VendorPortalError("This order already uses multiple tracking packages. Ask Admin to update it in the package editor.", 409);
        }
        await tx.update(ordersTable).set({ ...tracking.updates, shippingCarrier: carrier, status: "Shipped", updatedAt: now })
          .where(eq(ordersTable.id, order.id));
        if (tracking.shouldNotify || order.status !== "Shipped") notifications.push({ username: order.telegramUsername, code: order.code });
      }
      await tx.update(vendorSubmissionsTable).set({ status: "Shipped", trackingNumber, carrier, updatedAt: now }).where(eq(vendorSubmissionsTable.id, row.id));
      if (row.sharedOrderId && !mixed) refreshShare = row.sharedOrderId;
    }
    await auditVendor(tx, username(req), body.action, row.id);
  });
  // Never publish a shared supplier tracking number in member notifications.
  for (const order of notifications) void notifyUser(order.username, "status",
    `Order #${order.code} has been shipped. View your order for tracking updates.`).catch(() => {});
  if (refreshShare) void refreshWholesaleMainParcelForShare(refreshShare).catch(() => {});
  res.json({ ok: true });
}));
router.post("/vendor/orders/:id/images", requireAccount, sameOrigin, (req, res, next) => {
  upload(req, res, err => {
    if (err) { res.status(400).json({ error: "Upload one image, 5 MB or smaller." }); return; }
    next();
  });
}, handled(async (req, res) => {
  if (!req.file) throw new VendorPortalError("Choose an image.");
  // Authorize and check freshness before any storage work.
  const access = await vendorAccess(db, username(req));
  const initial = await ownedSubmission(db, String(req.params.id), access.vendorId);
  if (await isVendorSubmissionStale(db, initial)) throw new VendorPortalError("Order changed. Ask Admin to review it.", 409);
  let path: string;
  try { path = await storePageUpdateImage(req.file.buffer, "vendor-dispatch"); }
  catch (error) {
    if (error instanceof WholesaleUpdateValidationError) throw new VendorPortalError(error.message);
    throw error;
  }
  try {
    await db.transaction(async tx => {
      const access = await vendorAccess(tx, username(req), true);
      const source = await loadVendorSource(tx, initial.sourceKey, true);
      const row = await ownedSubmission(tx, initial.id, access.vendorId, true);
      if (source.fingerprint !== row.sourceFingerprint) throw new VendorPortalError("Order changed during upload. Ask Admin to review it.", 409);
      const existing = await tx.select({ id: vendorImagesTable.id }).from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id));
      if (existing.length >= 30) throw new VendorPortalError("Maximum 30 photos per shipment.");
      await tx.insert(vendorImagesTable).values({
        id: randomUUID(), submissionId: row.id, objectPath: path,
        filename: req.file!.originalname.replace(/[^\w .()-]/g, "_").slice(0, 120) || "Dispatch photo",
        uploadedBy: username(req),
      });
      await auditVendor(tx, username(req), "image_uploaded", row.id);
    });
  } catch (error) { await deleteWholesaleUpdateImage(path).catch(() => {}); throw error; }
  res.status(201).json({ ok: true });
}));

router.get("/admin/vendor-portal", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(vendorSubmissionsTable).orderBy(desc(vendorSubmissionsTable.submittedAt));
  const submissions = [];
  for (const row of rows) submissions.push({
    id: row.id, reference: row.reference, vendorId: row.vendorId, status: row.status,
    submittedAt: row.submittedAt, stale: await isVendorSubmissionStale(db, row),
  });
  res.json({
    vendors: (await getVendors()).map(v => ({ id: v.id, name: v.name })),
    access: await db.select({ username: vendorPortalAccessTable.username, vendorId: vendorPortalAccessTable.vendorId }).from(vendorPortalAccessTable),
    submissions,
  });
}));
router.put("/admin/vendor-portal/access", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const user = typeof req.body?.username === "string" ? normalizeTg(req.body.username) : "";
  const vendorId = req.body?.vendorId;
  if (!user || (vendorId !== null && typeof vendorId !== "string")) throw new VendorPortalError("Provide an account username and vendor.");
  if (vendorId !== null && !(await getVendors()).some(v => v.id === vendorId)) throw new VendorPortalError("Vendor not found.");
  await db.transaction(async tx => {
    const [account] = await tx.select({ status: accountsTable.accountStatus }).from(accountsTable).where(eq(accountsTable.telegramUsername, user)).for("update");
    if (!account || (vendorId !== null && account.status !== "active")) throw new VendorPortalError("An active existing account is required.");
    const actor = getAdminUsername(res);
    if (vendorId === null) await tx.delete(vendorPortalAccessTable).where(eq(vendorPortalAccessTable.username, user));
    else await tx.insert(vendorPortalAccessTable).values({ username: user, vendorId, grantedBy: actor }).onConflictDoUpdate({
      target: vendorPortalAccessTable.username, set: { vendorId, grantedBy: actor, updatedAt: new Date() },
    });
    await auditVendor(tx, actor, vendorId === null ? "access_revoked" : "access_granted", null, { username: user, vendorId });
  });
  res.json({ ok: true });
}));
function submissionInput(req: Request) {
  const { vendorId, orderCodes } = req.body ?? {};
  if (typeof vendorId !== "string" || !Array.isArray(orderCodes) || orderCodes.some(c => typeof c !== "string")) throw new VendorPortalError("Choose a vendor and enter order numbers.");
  return { vendorId, orderCodes };
}
router.post("/admin/vendor-portal/preview", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, orderCodes } = submissionInput(req);
  const prepared = await db.transaction(tx => prepareVendorShipments(tx, vendorId, orderCodes));
  res.json({ shipments: prepared.map(p => publicVendorOrder(p, false, [])), previewToken: vendorPreviewToken(prepared) });
}));
router.post("/admin/vendor-portal/submit", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, orderCodes } = submissionInput(req);
  res.json(await submitVendorOrders(vendorId, orderCodes, req.body.previewToken, getAdminUsername(res)));
}));
router.get("/admin/vendor-portal/orders/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [row] = await db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, String(req.params.id)));
  if (!row) throw new VendorPortalError("Submission not found.", 404);
  res.json(publicVendorOrder(row, await isVendorSubmissionStale(db, row), await imageList(row, "admin/vendor-portal")));
}));
router.delete("/admin/vendor-portal/orders/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  await db.transaction(async tx => {
    const [row] = await tx.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, String(req.params.id))).for("update");
    if (!row) throw new VendorPortalError("Submission not found.", 404);
    if (row.status !== "Submitted") throw new VendorPortalError("Vendor has started this shipment. It cannot be recalled here; coordinate fulfilment before editing.", 409);
    const images = await tx.select({ id: vendorImagesTable.id }).from(vendorImagesTable).where(eq(vendorImagesTable.submissionId, row.id));
    if (images.length) throw new VendorPortalError("Vendor has uploaded photos. Coordinate with them before changing this shipment.", 409);
    await auditVendor(tx, getAdminUsername(res), "submission_recalled", row.id, { sourceKey: row.sourceKey, vendorId: row.vendorId });
    await tx.delete(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, row.id));
  });
  res.json({ ok: true });
}));
router.post("/admin/vendor-portal/export", handled(async (req,res) => {
  if (!requireAdmin(req,res)) return;
  const vendor = (await getVendors()).find(v=>v.id===req.body?.vendorId);
  const codes = req.body?.orderCodes;
  if (!vendor || !Array.isArray(codes) || codes.some(c=>typeof c !== "string")) throw new VendorPortalError("Choose a vendor and orders to export.");
  const shipments = await db.transaction(tx=>prepareVendorShipments(tx,vendor.id,codes));
  const csv=req.body?.format==="csv";
  res.set("Cache-Control","no-store").json({filename:`supplier-${vendor.id}.${csv?"csv":"txt"}`,text:csv?vendorSupplierCsv(shipments,vendor.name):vendorSupplierText(shipments,vendor.name)});
}));

router.get("/account/orders/:id/vendor-images", requireAccount, handled(async (req, res) => {
  const [order] = await db.select({ id: ordersTable.id, sharedOrderId: ordersTable.sharedOrderId, username: ordersTable.telegramUsername })
    .from(ordersTable).where(eq(ordersTable.id, String(req.params.id)));
  if (!order || normalizeTg(order.username) !== username(req)) throw new VendorPortalError("Order not found.", 404);
  const rows = await db.select().from(vendorSubmissionsTable).where(order.sharedOrderId
    ? eq(vendorSubmissionsTable.sharedOrderId,order.sharedOrderId)
    : eq(vendorSubmissionsTable.sourceKey,`order:${order.id}`));
  const images = [];
  for (const row of rows) {
    try { await memberMaySee(req,row); images.push(...await imageList(row,"account")); }
    catch (error) { if (!(error instanceof VendorPortalError)) throw error; }
  }
  res.set("Cache-Control", "no-store").json({ images });
}));

router.get("/account/orders/:id/vendor-shipments", requireAccount, handled(async (req, res) => {
  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, String(req.params.id)));
  if (!order || normalizeTg(order.telegramUsername) !== username(req)) throw new VendorPortalError("Order not found.",404);
  let recipient = !order.sharedOrderId;
  let expectedVendorIds: string[] = [];
  if (order.sharedOrderId) {
    const [share] = await db.select({recipient:wholesaleSharesTable.deliveryUsername,breakdown:wholesaleSharesTable.vendorShippingBreakdown}).from(wholesaleSharesTable).where(eq(wholesaleSharesTable.id,order.sharedOrderId));
    recipient = normalizeTg(share?.recipient ?? "") === username(req);
    if (recipient) expectedVendorIds=(share?.breakdown ?? []).map(p=>p.vendorId);
  }
  if (!expectedVendorIds.length) {
    const lines=await db.select({vendorId:orderLineItemsTable.vendorId}).from(orderLineItemsTable).where(eq(orderLineItemsTable.orderId,order.id));
    expectedVendorIds=[...new Set(lines.map(l=>l.vendorId).filter((id):id is string=>!!id))];
  }
  const rows = await db.select().from(vendorSubmissionsTable).where(order.sharedOrderId
    ? eq(vendorSubmissionsTable.sharedOrderId,order.sharedOrderId)
    : eq(vendorSubmissionsTable.sourceKey,`order:${order.id}`));
  const vendors = await getVendors();
  const shipments = [];
  const shown=new Set<string>();
  for (const row of rows) {
    if (!recipient && !row.orderIds.includes(order.id)) continue;
    if (await isVendorSubmissionStale(db,row)) continue;
    shown.add(row.vendorId);
    shipments.push({
      id:row.id, vendorName:vendors.find(v=>v.id===row.vendorId)?.name ?? "Vendor",
      status:row.status, trackingNumber:recipient ? row.trackingNumber : null,
      carrier:recipient ? row.carrier : null, trackingMasked:!recipient,
      images:recipient ? await imageList(row,"account") : [],
    });
  }
  for (const id of expectedVendorIds.filter(id=>!shown.has(id))) {
    shipments.push({id:`pending:${id}`,vendorName:vendors.find(v=>v.id===id)?.name ?? "Vendor",status:"Awaiting vendor processing",
      trackingNumber:null,carrier:null,trackingMasked:!recipient,images:[]});
  }
  res.set("Cache-Control","no-store").json({shipments});
}));

function imageHandler(mode: "vendor" | "admin" | "account"): Handler {
  return handled(async (req, res) => {
    if (mode === "admin" && !requireAdmin(req, res)) return;
    const [image] = await db.select().from(vendorImagesTable).where(eq(vendorImagesTable.id, String(req.params.id)));
    if (!image) throw new VendorPortalError("Image not found.", 404);
    const [row] = await db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, image.submissionId));
    if (!row) throw new VendorPortalError("Image not found.", 404);
    if (mode === "vendor") {
      const access = await vendorAccess(db, username(req));
      if (row.vendorId !== access.vendorId) throw new VendorPortalError("Image not found.", 404);
    } else if (mode === "account") await memberMaySee(req, row);
    const bytes = await downloadWholesaleUpdateImage(image.objectPath);
    res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }).send(bytes);
  });
}
router.get("/vendor/vendor-images/:id", requireAccount, imageHandler("vendor"));
router.get("/account/vendor-images/:id", requireAccount, imageHandler("account"));
router.get("/admin/vendor-portal/vendor-images/:id", imageHandler("admin"));
export default router;
