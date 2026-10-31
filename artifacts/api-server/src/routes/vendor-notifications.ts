import { Router, type Request, type Response } from "express";
import { requireVendorAccount, vendorSameOrigin } from "../middleware/vendor-auth";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import { db, listVendorNotifications, unreadCounts, markRead, markAllRead, broadcast, isPriority, PRIORITIES } from "../lib/vendor-notifications";
import { notifyVendor, esc } from "../lib/vendor-telegram";

/* Vendor notification feed (with priorities) and admin announcements. */
const router = Router();
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      console.error("[vendor-notifications]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the request. Please try again." });
    }
  };
}
const access = (req: Request) => vendorAccess(db, req.vendor!.username, false, req.vendor!.tokenHash);

router.get("/vendor/notifications", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  const unreadOnly = req.query.unread === "1";
  const limit = Number(req.query.limit) || 50;
  const [notifications, unread] = await Promise.all([listVendorNotifications(db, me.vendorId, { unreadOnly, limit }), unreadCounts(db, me.vendorId)]);
  res.set("Cache-Control", "no-store").json({ notifications, unread, priorities: PRIORITIES });
}));
router.post("/vendor/notifications/read", requireVendorAccount, vendorSameOrigin, handled(async (req, res) => {
  const me = await access(req);
  const updated = req.body?.all === true
    ? await markAllRead(db, me.vendorId, isPriority(req.body?.upToPriority) ? req.body.upToPriority : undefined)
    : await markRead(db, me.vendorId, req.body?.ids);
  res.json({ updated, unread: await unreadCounts(db, me.vendorId) });
}));

router.post("/admin/vendor-notifications/broadcast", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const result = await db.transaction(tx => broadcast(tx, { priority: req.body?.priority, title: req.body?.title, body: req.body?.body, vendorIds: req.body?.vendorIds, actor: getAdminUsername(res) }));
  // Critical and high announcements also go to the vendors' Telegram chats.
  if (req.body?.priority === "critical" || req.body?.priority === "high") {
    const icon = req.body.priority === "critical" ? "🚨" : "📣";
    const text = `${icon} <b>${esc(String(req.body.title).trim())}</b>${req.body.body ? `\n\n${esc(String(req.body.body).trim().slice(0, 1000))}` : ""}\n\n<i>From Peps Anonymous</i>`;
    for (const vendorId of result.vendorIds) notifyVendor(vendorId, "message", text).catch(() => undefined);
  }
  res.status(201).json(result);
}));

export default router;
