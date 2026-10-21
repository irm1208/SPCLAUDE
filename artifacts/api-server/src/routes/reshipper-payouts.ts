import { Router, type Request, type Response, type NextFunction } from "express";
import { getAdminUsername, requireAdmin } from "../middleware/require-admin";
import { requireReshipper } from "../middleware/require-reshipper";
import { PayoutError } from "../lib/reshipper-payout-rules";
import { listReshipperPayoutGroups, readReshipperPayouts, recordReshipperPayout, reviewReshipperFees, voidReshipperPayout } from "../lib/reshipper-payouts";

const router = Router();
const admin = "/admin/reshippers/:username/gb/:gbId/payouts";
const param = (req: Request, name: string) => String(req.params[name] ?? "");
function adminOnly(req: Request, res: Response, next: NextFunction) {
  if (requireAdmin(req, res)) next();
}
function handle(fn: (req: Request, res: Response) => Promise<unknown>) {
  return async (req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    try { res.json(await fn(req, res)); }
    catch (error) {
      if (error instanceof PayoutError) { res.status(error.status).json({ error: error.message }); return; }
      // PostgreSQL retries/deadlock victims are rolled back, never partially settled.
      const code = (error as { code?: string; cause?: { code?: string } })?.code || (error as { cause?: { code?: string } })?.cause?.code;
      if (code === "40001" || code === "40P01") { res.status(409).json({ error: "Another fee update occurred. Refresh and retry; no partial payout was recorded." }); return; }
      console.error("[reshipper-payouts]", error);
      res.status(503).json({ error: "Payout records are temporarily unavailable. Your payment has not been sent by this website. Refresh before recording again." });
    }
  };
}
router.get("/admin/reshippers/:username/payouts/groups", adminOnly, handle(req => listReshipperPayoutGroups(param(req, "username"))));
router.get(admin, adminOnly, handle(req => readReshipperPayouts(param(req, "username"), param(req, "gbId"), true)));
router.post(`${admin}/review`, adminOnly, handle((req, res) => reviewReshipperFees(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(admin, adminOnly, handle((req, res) => recordReshipperPayout(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(`${admin}/:payoutId/void`, adminOnly, handle((req, res) =>
  voidReshipperPayout(param(req, "username"), param(req, "gbId"), param(req, "payoutId"), req.body?.reason, getAdminUsername(res))));
router.get("/reshipper/gb/:gbId/payouts", requireReshipper, handle(req => readReshipperPayouts(req.reshipper!.telegramUsername, param(req, "gbId"))));
export default router;
