import { Router } from "express";
import {
  invoiceDocumentSchema,
} from "../lib/invoice";
import { buildInvoicePdf } from "../lib/invoice-pdf";
import { invoiceFilename, loadOrSeedInvoice, saveInvoice } from "../lib/invoice-service";
import { requireAdmin } from "../middleware/require-admin";

const router = Router();

router.get("/admin/orders/:id/invoice", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const invoice = await loadOrSeedInvoice(req.params.id);
    if (!invoice) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(invoice);
  } catch (error) {
    console.error("[admin] invoice load failed", error);
    res.status(500).json({ error: "Failed to load invoice" });
  }
});

router.put("/admin/orders/:id/invoice", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const parsed = invoiceDocumentSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid invoice" }); return; }
  try {
    const result = await saveInvoice(req.params.id, parsed.data);
    if (!result) { res.status(404).json({ error: "Order not found" }); return; }
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save invoice";
    const status = /refund/i.test(message) ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

router.get("/admin/orders/:id/invoice-pdf", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const invoice = await loadOrSeedInvoice(req.params.id);
    if (!invoice) { res.status(404).json({ error: "Order not found" }); return; }
    const filename = invoiceFilename(invoice.invoiceNumber);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${filename}.pdf"`);
    res.send(buildInvoicePdf(invoice));
  } catch (error) {
    console.error("[admin] invoice PDF failed", error);
    res.status(500).json({ error: "Failed to generate invoice PDF" });
  }
});

export default router;
