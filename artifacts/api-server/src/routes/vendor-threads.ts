import { Router, type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { requireVendorAccount, vendorSameOrigin } from "../middleware/vendor-auth";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import { getVendors } from "./config";
import { createAlert } from "../lib/create-alert";
import { sendAdminMessage } from "../lib/telegram";
import { storePageUpdateImage, downloadWholesaleUpdateImage, deleteWholesaleUpdateImage } from "../lib/wholesale-update-images";
import { WholesaleUpdateValidationError } from "../lib/wholesale-updates";
import {
  threadInput, messageInput, publicThread, publicMessage, listVendorThreads, unreadForVendor, adminThreads, loadThread, threadMessages,
  markRead, openThread, postMessage, setThreadStatus, findMessage, mirrorToVendorTelegram, type ThreadImage,
} from "../lib/vendor-threads";

/* Vendor <-> Admin conversations. Text with an optional photo per message. */
const router = Router();
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      console.error("[vendor-threads]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the request. Please try again." });
    }
  };
}
const access = (req: Request, lock = false, tx: any = db) => vendorAccess(tx, req.vendor!.username, lock, req.vendor!.tokenHash);
const noStore = (res: Response) => res.set("Cache-Control", "no-store");
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 6 } }).single("image");
/** Parses multipart only when the client sent it; JSON bodies pass straight through. */
function optionalImage(req: Request, res: Response, next: NextFunction) {
  if (!req.is("multipart/form-data")) { next(); return; }
  upload(req, res, err => { if (err) res.status(400).json({ error: "Attach one image, 5 MB or smaller." }); else next(); });
}
async function storeImage(req: Request): Promise<ThreadImage | null> {
  if (!req.file) return null;
  try {
    const path = await storePageUpdateImage(req.file.buffer, "vendor-dispatch");
    return { path, name: req.file.originalname.replace(/[^\w .()-]/g, "_").slice(0, 120) || "Photo" };
  } catch (error) {
    if (error instanceof WholesaleUpdateValidationError) throw new VendorPortalError(error.message);
    throw error;
  }
}
const vendorName = async (vendorId: string) => (await getVendors()).find(v => v.id === vendorId)?.name ?? vendorId;
function alertAdmin(kind: "new" | "reply", vendor: string, thread: any, message: any) {
  const excerpt = (message.body || "📷 Photo").slice(0, 300);
  createAlert("order", "medium", kind === "new" ? "Vendor message" : "Vendor replied", `${vendor} · ${thread.subject}${thread.reference ? ` (#${thread.reference})` : ""}: ${excerpt}`, { linkUrl: "#vendor-portal", relatedEntityId: thread.id }).catch(() => {});
  sendAdminMessage(`💬 <b>${kind === "new" ? "New message from" : "Reply from"} ${vendor}</b>\n${thread.subject}${thread.reference ? ` · #${thread.reference}` : ""}\n\n${excerpt}\n\nReply under Admin → Vendor portal → Messages.`).catch(() => undefined);
}

/* ---- Vendor ----------------------------------------------------------------- */
router.get("/vendor/threads", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  const [threads, unread] = await Promise.all([listVendorThreads(db, me.vendorId), unreadForVendor(db, me.vendorId)]);
  noStore(res).json({ threads, unread });
}));
router.post("/vendor/threads", requireVendorAccount, vendorSameOrigin, optionalImage, handled(async (req, res) => {
  const input = threadInput(req.body, !!req.file);
  const me = await access(req);
  const image = await storeImage(req);
  try {
    const { thread, message } = await db.transaction(tx => openThread(tx, { ...input, vendorId: me.vendorId, authorRole: "vendor", authorName: me.username, image }));
    const [loaded] = [await loadThread(db, thread.id, me.vendorId)];
    alertAdmin("new", me.vendorName, loaded, message);
    res.status(201).json({ thread: publicThread(loaded), message: publicMessage(message, "/api/vendor/threads") });
  } catch (error) { if (image) await deleteWholesaleUpdateImage(image.path).catch(() => {}); throw error; }
}));
router.get("/vendor/threads/:id", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  const thread = await loadThread(db, String(req.params.id), me.vendorId);
  const messages = await threadMessages(db, thread.id);
  if (thread.vendorUnread) await markRead(db, thread.id, "vendor");
  noStore(res).json({ thread: publicThread({ ...thread, vendorUnread: 0 }), messages: messages.map((m: any) => publicMessage(m, "/api/vendor/threads")) });
}));
router.post("/vendor/threads/:id/messages", requireVendorAccount, vendorSameOrigin, optionalImage, handled(async (req, res) => {
  const input = messageInput(req.body, !!req.file);
  const me = await access(req);
  const image = await storeImage(req);
  try {
    const { thread, message } = await db.transaction(tx => postMessage(tx, { threadId: String(req.params.id), vendorId: me.vendorId, authorRole: "vendor", authorName: me.username, body: input.body, image }));
    alertAdmin("reply", me.vendorName, thread, message);
    res.status(201).json({ message: publicMessage(message, "/api/vendor/threads") });
  } catch (error) { if (image) await deleteWholesaleUpdateImage(image.path).catch(() => {}); throw error; }
}));
router.get("/vendor/threads/:id/attachments/:messageId", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  const row = await findMessage(db, String(req.params.id), String(req.params.messageId), me.vendorId);
  res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }).send(await downloadWholesaleUpdateImage(row.imagePath));
}));

/* ---- Admin ------------------------------------------------------------------ */
router.get("/admin/vendor-threads", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const vendorId = typeof req.query.vendorId === "string" ? req.query.vendorId : undefined;
  noStore(res).json({ threads: await adminThreads(db, { status, vendorId }) });
}));
router.post("/admin/vendor-threads", optionalImage, handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const input = threadInput(req.body, !!req.file);
  const vendorId = typeof req.body?.vendorId === "string" ? req.body.vendorId : "";
  if (!vendorId) throw new VendorPortalError("Choose a vendor.");
  const image = await storeImage(req);
  try {
    const actor = getAdminUsername(res);
    const { thread, message } = await db.transaction(tx => openThread(tx, { ...input, vendorId, authorRole: "admin", authorName: actor, image }));
    const loaded = await loadThread(db, thread.id);
    const delivered = await mirrorToVendorTelegram(loaded, message).catch(() => 0);
    res.status(201).json({ thread: publicThread(loaded, { vendorName: await vendorName(vendorId) }), message: publicMessage(message, "/api/admin/vendor-threads"), telegramDelivered: delivered });
  } catch (error) { if (image) await deleteWholesaleUpdateImage(image.path).catch(() => {}); throw error; }
}));
router.get("/admin/vendor-threads/:id", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const thread = await loadThread(db, String(req.params.id));
  const messages = await threadMessages(db, thread.id);
  if (thread.adminUnread) await markRead(db, thread.id, "admin");
  noStore(res).json({ thread: publicThread({ ...thread, adminUnread: 0 }, { vendorName: await vendorName(thread.vendorId) }), messages: messages.map((m: any) => publicMessage(m, "/api/admin/vendor-threads")) });
}));
router.post("/admin/vendor-threads/:id/messages", optionalImage, handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const input = messageInput(req.body, !!req.file);
  const image = await storeImage(req);
  try {
    const actor = getAdminUsername(res);
    const { thread, message } = await db.transaction(tx => postMessage(tx, { threadId: String(req.params.id), authorRole: "admin", authorName: actor, body: input.body, image }));
    const delivered = await mirrorToVendorTelegram(thread, message).catch(() => 0);
    res.status(201).json({ message: publicMessage(message, "/api/admin/vendor-threads"), telegramDelivered: delivered });
  } catch (error) { if (image) await deleteWholesaleUpdateImage(image.path).catch(() => {}); throw error; }
}));
router.put("/admin/vendor-threads/:id/status", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const thread = await db.transaction(tx => setThreadStatus(tx, String(req.params.id), req.body?.status, getAdminUsername(res)));
  res.json({ thread: publicThread(thread, { vendorName: await vendorName(thread.vendorId) }) });
}));
router.get("/admin/vendor-threads/:id/attachments/:messageId", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = await findMessage(db, String(req.params.id), String(req.params.messageId));
  res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" }).send(await downloadWholesaleUpdateImage(row.imagePath));
}));

export default router;
