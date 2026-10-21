import { Router, type Request, type Response, type NextFunction } from "express";
import { getAdminUsername, requireAdmin } from "../middleware/require-admin";
import { requireReshipper } from "../middleware/require-reshipper";
import { PayoutError } from "../lib/reshipper-payout-rules";
import { checkReshipperCollectionWallets, saveCollectionWallet, saveReshipperPayoutWallet } from "../lib/reshipper-payouts";
import { listReshipperPayoutGroups, readReshipperPayouts, recordReshipperPayout, reviewReshipperFees, voidReshipperPayout } from "../lib/reshipper-payouts";
import { prepareReshipperChainPayment, approveReshipperChainPayment, submitReshipperChainPayment, checkReshipperChainPayment, cancelReshipperChainPayment } from "../lib/reshipper-chain-payments";

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
      res.status(503).json({ error: "Payout records are temporarily unavailable. Check existing pending payments before retrying. Do not send another transfer." });
    }
  };
}
router.get("/admin/reshippers/:username/payouts/groups", adminOnly, handle(req => listReshipperPayoutGroups(param(req, "username"))));
router.get(admin, adminOnly, handle(req => readReshipperPayouts(param(req, "username"), param(req, "gbId"), true)));
router.post(`${admin}/payout-wallet`, adminOnly, handle((req, res) =>
  saveReshipperPayoutWallet(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(`${admin}/chain/prepare`, adminOnly, handle((req, res) =>
  prepareReshipperChainPayment(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(`${admin}/chain/:paymentId/approve`, adminOnly, handle((req, res) =>
  approveReshipperChainPayment(param(req, "username"), param(req, "gbId"), param(req, "paymentId"), getAdminUsername(res))));
router.post(`${admin}/chain/:paymentId/submit`, adminOnly, handle((req, res) =>
  submitReshipperChainPayment(param(req, "username"), param(req, "gbId"), param(req, "paymentId"), req.body, getAdminUsername(res))));
router.post(`${admin}/chain/:paymentId/check`, adminOnly, handle((req, res) =>
  checkReshipperChainPayment(param(req, "username"), param(req, "gbId"), param(req, "paymentId"), getAdminUsername(res))));
router.post(`${admin}/chain/:paymentId/cancel`, adminOnly, handle((req, res) =>
  cancelReshipperChainPayment(param(req, "username"), param(req, "gbId"), param(req, "paymentId"), getAdminUsername(res))));
router.post(`${admin}/review`, adminOnly, handle((req, res) => reviewReshipperFees(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(`${admin}/wallets`, adminOnly, handle((req, res) =>
  saveCollectionWallet(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(`${admin}/wallets/remove`, adminOnly, handle((req, res) =>
  saveCollectionWallet(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res), true)));
router.post(`${admin}/check-wallets`, adminOnly, handle((req, res) =>
  checkReshipperCollectionWallets(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(admin, adminOnly, handle((req, res) => recordReshipperPayout(param(req, "username"), param(req, "gbId"), req.body, getAdminUsername(res))));
router.post(`${admin}/:payoutId/void`, adminOnly, handle((req, res) =>
  voidReshipperPayout(param(req, "username"), param(req, "gbId"), param(req, "payoutId"), req.body?.reason, getAdminUsername(res))));
router.get("/reshipper/gb/:gbId/payouts", requireReshipper, handle(req => readReshipperPayouts(req.reshipper!.telegramUsername, param(req, "gbId"))));
router.post("/reshipper/gb/:gbId/payouts/payout-wallet", requireReshipper, handle(req => {
  const username = req.reshipper!.telegramUsername;
  return saveReshipperPayoutWallet(username, param(req, "gbId"), req.body, `reshipper:${username}`, false);
}));
export default router;
