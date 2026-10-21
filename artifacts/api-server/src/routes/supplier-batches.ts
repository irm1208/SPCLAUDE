import { Router, type Request, type Response, type NextFunction, type ErrorRequestHandler } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { requireOrganiser } from "../middleware/require-organiser";
import { requireAccount } from "../middleware/account-auth";
import { memberSupplierBatches } from "../lib/member-supplier-batches";
import { SupplierBatchError } from "../lib/supplier-batches-model";
import { type UpdateActor } from "../lib/group-buy-updates-model";
import { supplierData, saveSupplierConfig, confirmSupplierBatch, orderSupplierBatch, releaseSupplierBatch, reviewHistoricalSupplierOrder, exportSupplierBatch, supplierDirectOrders, exportSupplierTxt } from "../lib/supplier-batches";

const router = Router();
const roots = ["/admin/group-buys/:id/supplier-batches", "/organiser/group-buys/:id/supplier-batches"];
const param = (req: Request, k: string) => String(req.params[k] ?? "");
const actor = (req: Request): UpdateActor => req.path.startsWith("/admin/")
  ? { username: "admin", admin: true }
  : { username: req.organiser!.telegramUsername, admin: req.organiser!.isAdmin, adminGbId: req.organiser!.adminGbId };
async function auth(req: Request, res: Response, next: NextFunction) {
  // router.use temporarily strips the matched path from req.path.
  if (/^(?:\/api)?\/admin\//.test(req.originalUrl)) { if (requireAdmin(req, res)) next(); }
  else await requireOrganiser(req, res, next);
}
const paths = (suffix = "") => roots.map(r => r + suffix);
router.get("/group-buys/:id/supplier-batches", (_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); },
  requireAccount, async (req, res) => {
    try { res.json(await memberSupplierBatches(param(req, "id"), req.account!.telegramUsername)); }
    catch (error) { errors(error, req, res, () => {}); }
  });
router.use(roots, auth, (_req, res, next) => { res.setHeader("Cache-Control", "private, no-store"); next(); });
router.get(paths(), async (req, res) => { res.json(await supplierData(param(req, "id"), actor(req))); });
router.get(paths("/direct-orders"), async (req, res) => {
  res.json(await supplierDirectOrders(param(req, "id"), actor(req)));
});
router.post(paths("/direct-export-txt"), async (req, res) => {
  const text = await exportSupplierTxt(param(req, "id"), actor(req), { orderIds: req.body.orderIds });
  res.setHeader("Content-Disposition", 'attachment; filename="supplier-direct-orders.txt"');
  res.type("text/plain").send(text);
});
router.get(paths("/:batchId/export-txt"), async (req, res) => {
  const text = await exportSupplierTxt(param(req, "id"), actor(req), { batchId: param(req, "batchId") });
  res.setHeader("Content-Disposition", 'attachment; filename="supplier-batch.txt"');
  res.type("text/plain").send(text);
});
router.put(paths("/config"), async (req, res) => { res.json(await saveSupplierConfig(param(req, "id"), actor(req), req.body)); });
router.post(paths("/confirm"), async (req, res) => { res.json(await confirmSupplierBatch(param(req, "id"), actor(req), req.body)); });
router.post(paths("/review/:orderId"), async (req, res) => { res.json(await reviewHistoricalSupplierOrder(param(req, "id"), param(req, "orderId"), actor(req), req.body)); });
router.post(paths("/:batchId/ordered"), async (req, res) => { res.json(await orderSupplierBatch(param(req, "id"), param(req, "batchId"), actor(req), req.body)); });
router.post(paths("/:batchId/release"), async (req, res) => { res.json(await releaseSupplierBatch(param(req, "id"), param(req, "batchId"), actor(req), req.body)); });
router.get(paths("/:batchId/export"), async (req, res) => {
  const result = await exportSupplierBatch(param(req, "id"), param(req, "batchId"), actor(req));
  res.setHeader("Content-Disposition", `attachment; filename="supplier-batch-${param(req, "batchId").replace(/[^a-zA-Z0-9-]/g, "")}.csv"`);
  res.type("text/csv").send(result.csv);
});
const errors: ErrorRequestHandler = (error, _req, res, _next) => {
  if (!(error instanceof SupplierBatchError)) console.error("[supplier-batches]", error);
  res.status(error instanceof SupplierBatchError ? error.status : 500).json({ error: error instanceof SupplierBatchError ? error.message : "Supplier batch request failed. Please reload and retry." });
};
router.use(roots, errors);
export default router;
