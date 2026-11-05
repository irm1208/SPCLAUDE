import { Router, type Request, type Response } from "express";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { COA_PDF_LIMIT } from "../lib/coa-certificates";
import { requireAccount } from "../middleware/account-auth";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import {
  getMemberCoa, saveMemberCoa, availableCoaRails, saveCoaSettings, inviteCoa, coaPaymentInstructions,
  submitCoaPayment, withdrawCoa, manageCoa, adminCoaList,
  attachCoaCertificate, downloadCoaCertificate,
} from "../lib/group-buy-coa";
import { CoaError, csvCell } from "../lib/coa-rules";

const router = Router();
const pdfUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: COA_PDF_LIMIT, files: 1, fields: 0 } }).single("certificate");
router.get("/orders/:orderId/coa/certificate", requireAccount, async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  try {
    const bytes = await downloadCoaCertificate(String(req.params.orderId), req.account!.telegramUsername);
    res.type("application/pdf").attachment("certificate-of-analysis.pdf").send(bytes);
  } catch (error) { fail(res, error); }
});
router.post("/admin/coa/:id/certificate", (req, res, next) => {
  if (requireAdmin(req, res)) next();
}, (req, res, next) => {
  pdfUpload(req, res, error => {
    if (error) { res.status(400).json({ error: "Choose one PDF certificate of 10 MB or smaller." }); return; }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) throw new CoaError("Choose a PDF certificate.");
    res.json(await attachCoaCertificate(String(req.params.id), getAdminUsername(res), req.file));
  } catch (error) { fail(res, error); }
});
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
router.get("/admin/coa/export.txt", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.setHeader("Cache-Control", "private, no-store");
  try {
    // Payment-confirmed requests remain paid after processing/completion. The
    // TXT action is paid-only regardless of the queue's status dropdown.
    const result = await adminCoaList({ ...filters(req), status: undefined });
    const paid = result.requests.filter(r => ["paid", "processing", "completed"].includes(r.status));
    if (!paid.length) throw new CoaError("No paid COA requests match these filters.", 404);
    const line = (value: unknown) => String(value ?? "").replace(/[\r\n\u2028\u2029]+/g, " ").trim();
    const text = paid.map((r, i) => [
      `COA ${i + 1}`, `@${line(r.member).replace(/^@+/, "")}`,
      `Client: ${line(r.client)}`, `Sample: ${line(r.sample)}`,
      `Manufacturer: ${line(r.manufacturer)}`, `Batch: ${line(r.batch)}`,
    ].join("\n")).join("\n\n") + "\n";
    res.type("text/plain").attachment("coa-paid.txt").send(text);
  } catch (error) { fail(res, error); }
});
router.get("/admin/coa", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try { res.json(await adminCoaList(filters(req))); } catch (error) { fail(res, error); }
});
router.put("/admin/group-buys/:id/coa/settings", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
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
