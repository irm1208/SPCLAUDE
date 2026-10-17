import { Router, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireReshipper } from "../middleware/require-reshipper";
import { GroupUpdateError, type UpdateActor } from "../lib/group-buy-updates-model";
import { OnwardDeliveryError } from "../lib/gb-onward-delivery-rules";
import { type OnwardOrderScope } from "../lib/gb-onward-delivery";
import { createOnwardPayment, listOnwardPayments, manageOnwardPayment, readOnwardPayment,
  saveOnwardPaymentSettings, submitOnwardPayment, verifyOnwardPayment } from "../lib/gb-onward-payments";

const router = Router();
const param = (req: Request, name: string) => String(req.params[name] ?? "");
const roots = ["/admin/group-buys/:id", "/organiser/group-buys/:id"];
const reshipperRoot = "/reshipper/gb/:id";
const memberRoot = "/orders/:orderId/onward-payments";
const managerOrders = [...roots, reshipperRoot].map(root => `${root}/orders/:orderId/onward-payments`);
const scope = (req: Request): OnwardOrderScope => req.path.startsWith("/admin/") ? "admin"
  : req.path.startsWith("/organiser/") ? "organiser" : req.path.startsWith("/reshipper/") ? "reshipper" : "member";
const actor = (req: Request): UpdateActor => scope(req) === "admin" ? { username: "admin", admin: true }
  : scope(req) === "organiser" ? { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId }
    : scope(req) === "reshipper" ? { username: req.reshipper!.telegramUsername } : { username: req.account!.telegramUsername };
async function managerAuth(req: Request, res: Response, next: NextFunction) {
  if (scope(req) === "reshipper") { await requireReshipper(req, res, next); return; }
  if (scope(req) === "admin") { if (requireAdmin(req, res)) next(); return; }
  await requireOrganiser(req, res, next);
}
const noCache = (_req: Request, res: Response, next: NextFunction) => { res.setHeader("Cache-Control", "private, no-store"); next(); };
router.get(`${reshipperRoot}/onward-payments`, requireReshipper, noCache, async (req, res) => {
  res.json(await listOnwardPayments(param(req, "id"), actor(req)));
});
router.put(`${reshipperRoot}/onward-payments/settings`, requireReshipper, noCache, async (req, res) => {
  res.json(await saveOnwardPaymentSettings(param(req, "id"), actor(req), req.body));
});
router.post(`${reshipperRoot}/orders/:orderId/onward-payments`, requireReshipper, noCache, async (req, res) => {
  res.json(await createOnwardPayment(param(req, "id"), param(req, "orderId"), actor(req), req.body ?? {}));
});
for (const action of ["confirm", "reject", "cancel"] as const) {
  router.post(`${reshipperRoot}/orders/:orderId/onward-payments/:requestId/${action}`, requireReshipper, noCache, async (req, res) => {
    res.json(await manageOnwardPayment(param(req, "id"), param(req, "orderId"), param(req, "requestId"), actor(req), action, req.body?.reason));
  });
}
router.get(managerOrders, managerAuth, noCache, async (req, res) => {
  res.json(await readOnwardPayment(param(req, "orderId"), actor(req), scope(req), param(req, "id")));
});
router.get(memberRoot, requireAccount, noCache, async (req, res) => {
  res.json(await readOnwardPayment(param(req, "orderId"), actor(req), "member"));
});
router.post(`${memberRoot}/:requestId/submit`, requireAccount, noCache, async (req, res) => {
  res.json(await submitOnwardPayment(param(req, "orderId"), param(req, "requestId"), actor(req), req.body?.txHash));
});
router.post(`${memberRoot}/:requestId/verify`, requireAccount, noCache, async (req, res) => {
  const current = await readOnwardPayment(param(req, "orderId"), actor(req), "member");
  if (current.request?.id !== param(req, "requestId")) throw new OnwardDeliveryError("This onward payment request has changed. Refresh the order.", 409);
  await verifyOnwardPayment(param(req, "orderId"), param(req, "requestId"));
  res.json(await readOnwardPayment(param(req, "orderId"), actor(req), "member"));
});
const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof OnwardDeliveryError || error instanceof GroupUpdateError) {
    res.status(error.status).json({ error: error.message }); return;
  }
  console.error("[gb-onward-payments]", error);
  res.status(500).json({ error: "Could not load or update the onward-delivery payment. Please retry." });
};
router.use([`${reshipperRoot}/onward-payments`, ...managerOrders, memberRoot], handleError);
export default router;
