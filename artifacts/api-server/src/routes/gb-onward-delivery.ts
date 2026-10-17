import { Router, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireReshipper } from "../middleware/require-reshipper";
import { GroupUpdateError, type UpdateActor } from "../lib/group-buy-updates-model";
import { EU_DESTINATIONS, ONWARD_CURRENCIES, OnwardDeliveryError, suppliedEuMatrix } from "../lib/gb-onward-delivery-rules";
import { onwardSettings, saveOnwardMatrix, memberOnwardPreview, onwardOrderEstimate, changeOnwardChoice, type OnwardOrderScope } from "../lib/gb-onward-delivery";
import { writeLog } from "../lib/audit-log";

const router = Router();
const roots = ["/admin/group-buys/:id", "/organiser/group-buys/:id"];
const p = (req: Request, key: string) => String(req.params[key] ?? "");
const scope = (req: Request): OnwardOrderScope => req.path.startsWith("/admin/") ? "admin"
  : req.path.startsWith("/organiser/") ? "organiser" : req.path.startsWith("/reshipper/") ? "reshipper" : "member";
const actor = (req: Request): UpdateActor => scope(req) === "admin" ? { username: "admin", admin: true }
  : scope(req) === "organiser" ? { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId }
  : scope(req) === "reshipper" ? { username: req.reshipper!.telegramUsername } : { username: req.account!.telegramUsername };
async function manageAuth(req: Request, res: Response, next: NextFunction) {
  if (scope(req) === "reshipper") { await requireReshipper(req, res, next); return; }
  if (scope(req) === "admin") { if (requireAdmin(req, res)) next(); return; }
  await requireOrganiser(req, res, next);
}
const noCache = (_req: Request, res: Response, next: NextFunction) => { res.setHeader("Cache-Control", "private, no-store"); next(); };
router.get([...roots, "/reshipper/gb/:id"].map(root => `${root}/onward-delivery`), manageAuth, noCache, async (req, res) => {
  res.json({ ...await onwardSettings(p(req, "id"), actor(req), scope(req) === "reshipper"), template: suppliedEuMatrix(),
    countries: EU_DESTINATIONS.map(([code, name]) => ({ code, name })), currencies: ONWARD_CURRENCIES });
});
router.put([...roots, "/reshipper/gb/:id"].map(root => `${root}/onward-delivery/:username`), manageAuth, noCache, async (req, res) => {
  const result = await saveOnwardMatrix(p(req, "id"), p(req, "username"), actor(req), req.body, scope(req) === "reshipper");
  await writeLog("change", "info", "gb_onward_matrix_updated", "Group-buy onward-delivery estimate rates updated", {
    groupBuyId: p(req, "id"), reshipper: p(req, "username"), actor: actor(req).username, enabled: result.matrix.enabled,
  }, req.ip).catch(error => console.error("[gb-onward-delivery:audit]", error));
  res.json(result);
});
router.post("/group-buys/:id/onward-delivery/estimate", requireAccount, noCache, async (req, res) => {
  res.json(await memberOnwardPreview(p(req, "id"), actor(req), req.body ?? {}));
});
router.get("/orders/:orderId/onward-delivery", requireAccount, noCache, async (req, res) => {
  res.json(await onwardOrderEstimate(p(req, "orderId"), actor(req), "member"));
});
router.put("/orders/:orderId/onward-delivery", requireAccount, noCache, async (req, res) => {
  if (!Object.hasOwn(req.body ?? {}, "method")) throw new OnwardDeliveryError("Choose a delivery method or clear the preference.");
  res.json(await changeOnwardChoice(p(req, "orderId"), actor(req), req.body.method));
});
router.get(roots.map(root => `${root}/orders/:orderId/onward-delivery`), manageAuth, noCache, async (req, res) => {
  res.json(await onwardOrderEstimate(p(req, "orderId"), actor(req), scope(req), p(req, "id")));
});
router.get("/reshipper/gb/:id/orders/:orderId/onward-delivery", requireReshipper, noCache, async (req, res) => {
  res.json(await onwardOrderEstimate(p(req, "orderId"), actor(req), "reshipper", p(req, "id")));
});
const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof OnwardDeliveryError || error instanceof GroupUpdateError) { res.status(error.status).json({ error: error.message }); return; }
  console.error("[gb-onward-delivery]", error);
  res.status(500).json({ error: "Could not load or save onward delivery. Please retry." });
};
router.use(["/group-buys/:id/onward-delivery", "/orders/:orderId/onward-delivery",
  "/reshipper/gb/:id/onward-delivery",
  ...roots.map(root => `${root}/onward-delivery`), ...roots.map(root => `${root}/orders/:orderId/onward-delivery`),
  "/reshipper/gb/:id/orders/:orderId/onward-delivery"], handleError);
export default router;
