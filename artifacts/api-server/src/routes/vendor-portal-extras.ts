import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { requireVendorAccount, vendorSameOrigin } from "../middleware/vendor-auth";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { getVendors } from "./config";
import { vendorAccess } from "../lib/vendor-portal-service";
import { VendorPortalError } from "../lib/vendor-portal-model";
import {
  settingsInput, publicSettings, vendorSettings, saveVendorSettings, allVendorSettings,
  issueInput, publicIssue, reportOrderIssue, resolveOrderIssue, vendorIssues, adminIssues, ISSUE_TYPES,
} from "../lib/vendor-portal-extras";
import { createAlert } from "../lib/create-alert";
import { sendAdminMessage } from "../lib/telegram";
import { notifyVendor, formatEvent, portalOrderUrl } from "../lib/vendor-telegram";
import { pushVendorNotification } from "../lib/vendor-notifications";
import { vendorSubmissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/* Vendor settings (holiday mode, fulfilment defaults) and order problem reports. */
const router = Router();
type Handler = (req: Request, res: Response) => Promise<void>;
function handled(handler: Handler): Handler {
  return async (req, res) => {
    try { await handler(req, res); } catch (error) {
      if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
      console.error("[vendor-portal-extras]", error instanceof Error ? error.message : "Request failed");
      res.status(500).json({ error: "Could not complete the vendor request. Please try again." });
    }
  };
}
const access = (req: Request, lock = false, tx: any = db) => vendorAccess(tx, req.vendor!.username, lock, req.vendor!.tokenHash);
const noStore = (res: Response) => res.set("Cache-Control", "no-store");

router.get("/vendor/settings", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  noStore(res).json({ settings: publicSettings(await vendorSettings(db, me.vendorId), me.vendorId) });
}));
router.put("/vendor/settings", requireVendorAccount, vendorSameOrigin, handled(async (req, res) => {
  const input = settingsInput(req.body);
  const { me, row, wasClosed } = await db.transaction(async tx => {
    const me = await access(req, true, tx);
    const before = await vendorSettings(tx, me.vendorId);
    return { me, row: await saveVendorSettings(tx, me.vendorId, me.username, input), wasClosed: !!before?.closedUntil };
  });
  if (input.closedUntil && !wasClosed) {
    const until = input.closedUntil.toISOString().slice(0, 10);
    createAlert("order", "medium", "Vendor paused new orders", `${me.vendorName} is closed until ${until}. Paid orders for them wait until they reopen.`, { linkUrl: "#vendor-portal", relatedEntityId: me.vendorId }).catch(() => {});
    sendAdminMessage(`⏸ ${me.vendorName} set holiday mode until ${until}${input.closedNote ? ` — ${input.closedNote}` : ""}. Their paid orders are held until then.`).catch(() => undefined);
  }
  noStore(res).json({ settings: publicSettings(row, me.vendorId) });
}));

router.get("/vendor/issues", requireVendorAccount, handled(async (req, res) => {
  const me = await access(req);
  noStore(res).json({ issues: await vendorIssues(db, me.vendorId), types: ISSUE_TYPES });
}));
router.post("/vendor/orders/:id/issues", requireVendorAccount, vendorSameOrigin, handled(async (req, res) => {
  const input = issueInput(req.body);
  const { me, row } = await db.transaction(async tx => {
    const me = await access(req, true, tx);
    return { me, row: await reportOrderIssue(tx, me, String(req.params.id), input) };
  });
  const issue = publicIssue(row);
  createAlert("order", "high", "Vendor reported a problem", `${me.vendorName} flagged order ${issue.reference}: ${issue.label}${issue.note ? ` — ${issue.note}` : ""}`, { linkUrl: "#vendor-portal", relatedEntityId: row.submissionId }).catch(() => {});
  sendAdminMessage(`⚠️ ${me.vendorName} reported a problem on order ${issue.reference}: ${issue.label}${issue.note ? `\n${issue.note}` : ""}\nReview it under Admin → Vendor portal.`).catch(() => undefined);
  res.status(201).json({ issue });
}));

router.get("/admin/vendor-portal/issues", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  noStore(res).json({ issues: await adminIssues(db), settings: await allVendorSettings(db), types: ISSUE_TYPES });
}));
router.post("/admin/vendor-portal/issues/:id/resolve", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const row = await db.transaction(tx => resolveOrderIssue(tx, getAdminUsername(res), String(req.params.id), req.body?.resolution));
  const issue = publicIssue(row);
  pushVendorNotification(db, { vendorId: row.vendorId, kind: "issue_resolved", title: `Problem report answered${issue.reference ? ` · #${issue.reference}` : ""}`, body: issue.resolution || "Marked as resolved by Peps Anonymous.", link: `?order=${encodeURIComponent(row.submissionId)}`, submissionId: row.submissionId }).catch(() => null);
  db.select().from(vendorSubmissionsTable).where(eq(vendorSubmissionsTable.id, row.submissionId)).then(([submission]: any[]) => submission
    ? notifyVendor(row.vendorId, "issue_resolved", formatEvent("issue_resolved", submission, { label: issue.label, note: issue.resolution }), portalOrderUrl(submission.id)) : 0)
    .catch(() => undefined);
  res.json({ issue });
}));
router.put("/admin/vendor-portal/settings/:vendorId", handled(async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const vendorId = String(req.params.vendorId);
  if (!(await getVendors()).some(v => v.id === vendorId)) throw new VendorPortalError("Vendor not found.", 404);
  const input = settingsInput(req.body);
  const row = await db.transaction(tx => saveVendorSettings(tx, vendorId, getAdminUsername(res), input));
  pushVendorNotification(db, { vendorId, kind: "settings", title: input.closedUntil ? `Peps Anonymous paused your new orders until ${input.closedUntil.toISOString().slice(0, 10)}` : "Peps Anonymous reopened your order routing", body: input.closedNote ?? null, link: "settings" }).catch(() => null);
  res.json({ settings: publicSettings(row, vendorId) });
}));

export default router;
