import { Router, type Response, type Request } from "express";
import { requireAccount } from "../middleware/account-auth";
import { requireOrganiser } from "../middleware/require-organiser";
import { organiserRevisionList, setRevisionEnabled, createOrderRevisions, withdrawOrderRevision,
  memberOrderRevisions, memberPendingRevisions, decideOrderRevision } from "../lib/group-buy-order-revisions";
import { RevisionError } from "../lib/group-buy-order-revisions-rules";
import { refundMutationErrorOrderId } from "../lib/refund-mutation-guard";
import { writeLog } from "../lib/audit-log";

const router = Router();
function actor(req: Request) {
  return { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId };
}
function fail(res: Response, error: unknown) {
  if (error instanceof RevisionError) { res.status(error.status).json({ error: error.message }); return; }
  if (refundMutationErrorOrderId(error)) { res.status(409).json({ error: "This order has an active refund. No changes were made." }); return; }
  console.error("[order-revisions]", error);
  res.status(503).json({ error: "Order changes are temporarily unavailable. No order changes were applied." });
}
const base = "/organiser/group-buys/:id/order-revisions";
router.get(base, requireOrganiser, async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  try { res.json(await organiserRevisionList(String(req.params.id), actor(req))); } catch (e) { fail(res, e); }
});
router.put(base, requireOrganiser, async (req, res) => {
  try {
    const result = await setRevisionEnabled(String(req.params.id), actor(req), req.body?.enabled);
    void writeLog("change", "info", "gb_order_revision_settings", "Organiser changed optional own-stock order revisions",
      { groupBuyId: req.params.id, actor: actor(req).username, enabled: result.enabled }).catch(() => {});
    res.json(result);
  } catch (e) { fail(res, e); }
});
router.post(base, requireOrganiser, async (req, res) => {
  try {
    const result = await createOrderRevisions(String(req.params.id), actor(req), req.body);
    // Committed proposals are always accessible on the order, even if an optional transport fails.
    void import("../lib/telegram").then(({ notifyUser }) => {
      for (const item of result.notifications) {
        const escape = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
        void notifyUser(item.username, "status",
          `Your organiser has proposed changes to order <b>${escape(item.code)}</b>. Open the order in your account to review the original and revised items and total, then accept or decline. Your order is unchanged until you accept.`).catch(() => {});
      }
    }).catch(error => console.error("[order-revisions notification]", error));
    void writeLog("change", "info", "gb_order_revision_requested", "Organiser requested member acceptance of own-stock changes",
      { groupBuyId: req.params.id, actor: actor(req).username, created: result.created }).catch(() => {});
    res.json({ created: result.created });
  } catch (e) { fail(res, e); }
});
router.delete(`${base}/:revisionId`, requireOrganiser, async (req, res) => {
  try { res.json(await withdrawOrderRevision(String(req.params.id), String(req.params.revisionId), actor(req))); }
  catch (e) { fail(res, e); }
});
router.get("/account/order-revisions", requireAccount, async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  try { res.json(await memberPendingRevisions(req.account!.telegramUsername)); } catch (e) { fail(res, e); }
});
router.get("/orders/:id/order-revisions", requireAccount, async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  try { res.json(await memberOrderRevisions(String(req.params.id), req.account!.telegramUsername)); }
  catch (e) { fail(res, e); }
});
router.post("/orders/:id/order-revisions/:revisionId/decision", requireAccount, async (req, res) => {
  try {
    const result = await decideOrderRevision(String(req.params.id), String(req.params.revisionId),
      req.account!.telegramUsername, req.body?.decision);
    void writeLog("change", "info", "gb_order_revision_decision", "Member answered an order change request",
      { orderId: req.params.id, revisionId: req.params.revisionId, member: req.account!.telegramUsername, status: result.status, cancelled: result.cancelled === true }).catch(() => {});
    res.status(result.status === "stale" ? 409 : 200).json(result);
  } catch (e) { fail(res, e); }
});
export default router;
