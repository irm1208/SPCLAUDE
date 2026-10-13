import { Router, type Request, type Response, type NextFunction } from "express";
import { requireAccount } from "../middleware/account-auth";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireAdmin } from "../middleware/require-admin";
import { listHalfKits, saveHalfKit, claimHalfKit, releaseHalfKit, type HalfKitActor } from "../lib/half-kit-offers";
import { HalfKitError } from "../lib/half-kit-rules";
import { refundMutationConflictResponse } from "../lib/refund-mutation-guard";
import { writeLog } from "../lib/audit-log";
import { halfKitAvailability } from "../lib/half-kit-availability";

const router = Router();
const management = ["/organiser/group-buys/:id/half-kit-offers", "/admin/group-buys/:id/half-kit-offers"];
const parameter = (req: Request, key: string) => String(req.params[key] ?? "");
async function managementAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path.startsWith("/admin/")) { if (requireAdmin(req, res)) next(); return; }
  await requireOrganiser(req, res, next);
}
function actor(req: Request, manage = false): HalfKitActor {
  if (manage && req.path.startsWith("/admin/")) return { username: "admin", admin: true };
  if (manage) return { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId };
  return { username: req.account!.telegramUsername };
}
function fail(res: Response, error: unknown) {
  const refund = refundMutationConflictResponse(error);
  if (refund) { res.status(refund.status).json(refund.body); return; }
  if (error instanceof HalfKitError) { res.status(error.status).json({ error: error.message }); return; }
  console.error("[half-kits]", error);
  res.status(500).json({ error: "Half-kit operation failed. No partial changes were saved. Please try again." });
}
router.get(management, managementAuth, async (req, res) => {
  try { res.json(await listHalfKits(parameter(req, "id"), actor(req, true), true)); } catch (error) { fail(res, error); }
});
router.post(management.map(path => `${path}/:productId`), managementAuth, async (req, res) => {
  try {
    const offer = await saveHalfKit(parameter(req, "id"), parameter(req, "productId"), actor(req, true), req.body);
    await writeLog("order", "info", "half_kit_offer_saved", "Group-buy half-kit offer updated", {
      groupBuyId: parameter(req, "id"), offerId: offer.id, published: offer.published, actor: actor(req, true).username,
    }, req.ip).catch(error => console.error("[half-kits:audit]", error));
    res.json(offer);
  } catch (error) { fail(res, error); }
});
router.post(management.map(path => `${path}/claims/:claimId/release`), managementAuth, async (req, res) => {
  try {
    const result = await releaseHalfKit(parameter(req, "id"), parameter(req, "claimId"), actor(req, true));
    await writeLog("order", "info", "half_kit_claim_released", "Unpaid half-kit claim released", {
      ...result, groupBuyId: parameter(req, "id"), actor: actor(req, true).username,
    }, req.ip).catch(error => console.error("[half-kits:audit]", error));
    res.json(result);
  } catch (error) { fail(res, error); }
});
router.get("/group-buys/half-kit-availability/counts", requireAccount, async (req, res) => {
  try { res.json(await halfKitAvailability(actor(req).username)); } catch (error) { fail(res, error); }
});
router.get("/group-buys/:id/half-kit-offers", requireAccount, async (req, res) => {
  try { res.json(await listHalfKits(parameter(req, "id"), actor(req), false)); } catch (error) { fail(res, error); }
});
router.post("/group-buys/:id/half-kit-offers/:offerId/claim", requireAccount, async (req, res) => {
  try {
    const result = await claimHalfKit(parameter(req, "id"), parameter(req, "offerId"), actor(req), req.body);
    await writeLog("order", "info", "half_kit_claimed", "Half kit added to existing order", {
      ...result, groupBuyId: parameter(req, "id"), username: actor(req).username,
    }, req.ip).catch(error => console.error("[half-kits:audit]", error));
    res.json(result);
  } catch (error) { fail(res, error); }
});
export default router;
