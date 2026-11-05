import { Router, type Request, type Response } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import { requireOrganiser } from "../middleware/require-organiser";
import { COA_PDF_LIMIT } from "../lib/coa-certificates";
import { CoaError, csvCell } from "../lib/coa-rules";
import { paidCoaTxt } from "../lib/coa-export";
import {
  assertCoaOrganiserAccess, organiserCoaList, saveCoaSettings, inviteCoa, manageCoa,
  attachCoaCertificate, type CoaOrganiserAccess,
} from "../lib/group-buy-coa";

const router = Router();
const root = "/organiser/group-buys/:groupBuyId/coa";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: COA_PDF_LIMIT, files: 1, fields: 0 } }).single("certificate");
const access = (res: Response) => res.locals.coaAccess as CoaOrganiserAccess;
function fail(res: Response, error: unknown) {
  if (error instanceof CoaError) { res.status(error.status).json({ error: error.message }); return; }
  console.error("[organiser:COA]", error instanceof Error ? error.message : "Unknown failure");
  res.status(503).json({ error: "COA requests are temporarily unavailable." });
}
const filters = (req: Request) => ({
  search: typeof req.query.search === "string" ? req.query.search.slice(0, 300) : undefined,
  batch: typeof req.query.batch === "string" ? req.query.batch.slice(0, 300) : undefined,
  status: typeof req.query.status === "string" ? req.query.status.slice(0, 50) : undefined,
});
router.use(root, requireOrganiser, async (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  const principal = req.organiser!;
  res.locals.coaAccess = { groupBuyId: String(req.params.groupBuyId), username: principal.telegramUsername,
    ...(principal.isAdmin ? { adminGbId: principal.adminGbId ?? "__invalid_admin_scope__" } : {}) };
  try { await assertCoaOrganiserAccess(access(res)); next(); }
  catch (error) { fail(res, error); }
});
router.get(root, async (req, res) => {
  try { res.json(await organiserCoaList(access(res), filters(req))); } catch (error) { fail(res, error); }
});
router.put(`${root}/settings`, async (req, res) => {
  try { res.json(await saveCoaSettings(access(res).groupBuyId, access(res).username, req.body, db, access(res))); }
  catch (error) { fail(res, error); }
});
router.post(`${root}/invite`, async (req, res) => {
  try { res.json(await inviteCoa(access(res).groupBuyId, access(res).username, req.body, db, access(res))); }
  catch (error) { fail(res, error); }
});
router.get(`${root}/export.txt`, async (req, res) => {
  try {
    const result = await organiserCoaList(access(res), { ...filters(req), status: undefined });
    res.type("text/plain").attachment("coa-paid.txt").send(paidCoaTxt(result.requests));
  } catch (error) { fail(res, error); }
});
router.get(`${root}/export.csv`, async (req, res) => {
  try {
    const result = await organiserCoaList(access(res), filters(req));
    const keys = ["groupName", "orderCode", "member", "source", "status", "client", "sample", "manufacturer",
      "batch", "fee", "currency", "txHash", "reference", "verificationMessage"] as const;
    const csv = [keys.map(csvCell).join(","), ...result.requests.map(r => keys.map(k => csvCell(r[k])).join(","))].join("\r\n");
    res.type("text/csv").attachment("coa-requests.csv").send(csv);
  } catch (error) { fail(res, error); }
});
router.patch(`${root}/requests/:id`, async (req, res) => {
  try { res.json(await manageCoa(String(req.params.id), access(res).username, req.body, db, access(res))); }
  catch (error) { fail(res, error); }
});
router.post(`${root}/requests/:id/certificate`, (req, res, next) => {
  upload(req, res, error => {
    if (error) { res.status(400).json({ error: "Choose one PDF certificate of 10 MB or smaller." }); return; }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) throw new CoaError("Choose a PDF certificate.");
    res.json(await attachCoaCertificate(String(req.params.id), access(res).username, req.file, db, undefined, access(res)));
  } catch (error) { fail(res, error); }
});
export default router;
