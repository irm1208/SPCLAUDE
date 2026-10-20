import { Router, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireReshipper } from "../middleware/require-reshipper";
import { SupplierBatchError } from "../lib/supplier-batches-model";
import {
  supplierFulfilmentOverview, supplierFulfilmentDetail, createSupplierShipment, changeSupplierShipment,
  supplierPackingManifest, type FulfilmentActor,
} from "../lib/supplier-fulfilment";
import { refreshSupplierShipment } from "../lib/supplier-shipment-tracking";

const router = Router();
const roots = ["/admin/group-buys/:id/supplier-fulfilment", "/organiser/group-buys/:id/supplier-fulfilment", "/reshipper/gb/:id/supplier-fulfilment"];
const paths = (suffix = "") => roots.map(r => r + suffix);
const p = (req: Request, key: string) => String(req.params[key] ?? "");
const actor = (req: Request): FulfilmentActor => /^(?:\/api)?\/admin\//.test(req.originalUrl)
  ? { username: "admin", admin: true }
  : /^(?:\/api)?\/reshipper\//.test(req.originalUrl)
    ? { username: req.reshipper!.telegramUsername, reshipper: true }
    : { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId };
async function auth(req: Request, res: Response, next: NextFunction) {
  res.setHeader("Cache-Control", "no-store");
  if (/^(?:\/api)?\/admin\//.test(req.originalUrl)) { if (requireAdmin(req, res)) next(); }
  else if (/^(?:\/api)?\/reshipper\//.test(req.originalUrl)) await requireReshipper(req, res, next);
  else await requireOrganiser(req, res, next);
}
router.use(roots, auth);
router.use(roots, (req, res, next) => {
  if (req.method === "POST" && (!req.body || typeof req.body !== "object" || Array.isArray(req.body))) {
    res.status(400).json({ error: "Provide a JSON object for this shipment action." }); return;
  }
  next();
});
router.get(paths(), async (req, res) => {
  const cursor = Number(req.query.cursor ?? 0);
  if (!Number.isSafeInteger(cursor) || cursor < 0) { res.status(400).json({ error: "Invalid batch page." }); return; }
  res.json(await supplierFulfilmentOverview(p(req, "id"), actor(req), cursor));
});
router.get(paths("/:batchId"), async (req, res) => { res.json(await supplierFulfilmentDetail(p(req, "id"), p(req, "batchId"), actor(req))); });
router.get(paths("/:batchId/manifest"), async (req, res) => {
  const manifest = await supplierPackingManifest(p(req, "id"), p(req, "batchId"), actor(req));
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="supplier-batch-packing.csv"');
  res.send(manifest);
});
router.post(paths("/:batchId/shipments"), async (req, res) => {
  res.json(await createSupplierShipment(p(req, "id"), p(req, "batchId"), actor(req), req.body));
});
for (const action of ["receive", "update", "cancel"] as const) {
  router.post(paths(`/:batchId/shipments/:shipmentId/${action}`), async (req, res) => {
    res.json(await changeSupplierShipment(p(req, "id"), p(req, "batchId"), p(req, "shipmentId"), actor(req), action, req.body));
  });
}
router.post(paths("/:batchId/shipments/:shipmentId/refresh"), async (req, res) => {
  res.json(await refreshSupplierShipment(p(req, "id"), p(req, "batchId"), p(req, "shipmentId"), actor(req), req.body));
});
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof SupplierBatchError) { res.status(error.status).json({ error: error.message }); return; }
  console.error("[supplier-fulfilment]", error);
  res.status(500).json({ error: "Could not complete supplier shipment action. Refresh and try again." });
};
router.use(roots, errors);
export default router;
