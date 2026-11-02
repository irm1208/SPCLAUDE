import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin, getAdminUsername, requireAdminStepUp } from "../middleware/require-admin";
import { db, groupBuyCoaSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  getMemberCoa, saveMemberCoa, availableCoaRails, saveCoaSettings, inviteCoa, coaPaymentInstructions,
  submitCoaPayment, withdrawCoa, manageCoa, adminCoaList,
} from "../lib/group-buy-coa";
import { CoaError, csvCell } from "../lib/coa-rules";

const router = Router();
const paymentLimit = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many COA verification attempts. Wait one minute before retrying." } });
function fail(res: Response, error: unknown) {
  if (error instanceof CoaError) { res.status(error.status).json({ error: error.message }); return; }
  console.error("[COA]", error instanceof Error ? error.message : "Unknown failure");
  res.status(503).json({ error: "COA requests are temporarily unavailable. Your existing order has not changed." });
}
const filters = (req: Request) => ({
  groupBuyId: typeof req.query.groupBuyId === "string" ? req.query.groupBuyId.slice(0, 200) : undefined,
  search: typeof req.query.search === "string" ? req.query.search.slice(0, 300) : undefined,
  batch: typeof req.query.batch === "string" ? req.query.batch.slice(0, 300) : undefined,
  status: typeof req.query.status === "string" ? req.query.status.slice(0, 50) : undefined,
});
router.get("/orders/:orderId/coa", requireAccount, async (req, res) => {
  try { res.json(await getMemberCoa(String(req.params.orderId), req.account!.telegramUsername)); }
  catch (error) { fail(res, error); }
});
router.post("/orders/:orderId/coa", requireAccount, async (req, res) => {
  try { res.json(await saveMemberCoa(String(req.params.orderId), req.account!.telegramUsername, req.body)); }
  catch (error) { fail(res, error); }
});
router.post("/orders/:orderId/coa/payment-instructions", requireAccount, paymentLimit, async (req, res) => {
  try { res.json(await coaPaymentInstructions(String(req.params.orderId), req.account!.telegramUsername, req.body)); }
  catch (error) { fail(res, error); }
});
router.post("/orders/:orderId/coa/payment", requireAccount, paymentLimit, async (req, res) => {
  try { res.json(await submitCoaPayment(String(req.params.orderId), req.account!.telegramUsername, req.body)); }
  catch (error) { fail(res, error); }
});
router.post("/orders/:orderId/coa/withdraw", requireAccount, async (req, res) => {
  try { res.json(await withdrawCoa(String(req.params.orderId), req.account!.telegramUsername)); }
  catch (error) { fail(res, error); }
});
router.get("/admin/coa/rails", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try { res.json({ rails: await availableCoaRails() }); } catch (error) { fail(res, error); }
});
router.get("/admin/coa/export.csv", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await adminCoaList(filters(req));
    const keys = ["groupName", "orderCode", "member", "source", "status", "client", "sample", "manufacturer",
      "batch", "fee", "currency", "txHash", "reference", "verificationMessage", "internalNotes"] as const;
    const csv = [keys.map(csvCell).join(","), ...result.requests.map((r: any) => keys.map(k => csvCell(r[k])).join(","))].join("\r\n");
    res.setHeader("Cache-Control", "no-store");
    res.type("text/csv").attachment("group-buy-coa-requests.csv").send("\uFEFF" + csv);
  } catch (error) { fail(res, error); }
});
router.get("/admin/coa", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try { res.json(await adminCoaList(filters(req))); } catch (error) { fail(res, error); }
});
router.put("/admin/group-buys/:id/coa/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const [before] = await db.select().from(groupBuyCoaSettingsTable).where(eq(groupBuyCoaSettingsTable.groupBuyId, String(req.params.id)));
    const changedDestination = JSON.stringify(before?.rails ?? []) !== JSON.stringify(req.body?.rails ?? [])
      || (before?.manualInstructions ?? "") !== (req.body?.manualInstructions ?? "");
    if (changedDestination && !requireAdminStepUp(req, res)) return;
    res.json(await saveCoaSettings(String(req.params.id), getAdminUsername(res), req.body));
  }
  catch (error) { fail(res, error); }
});
router.post("/admin/group-buys/:id/coa/invite", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try { res.json(await inviteCoa(String(req.params.id), getAdminUsername(res), req.body)); }
  catch (error) { fail(res, error); }
});
router.patch("/admin/coa/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try { res.json(await manageCoa(String(req.params.id), getAdminUsername(res), req.body)); }
  catch (error) { fail(res, error); }
});
export default router;
