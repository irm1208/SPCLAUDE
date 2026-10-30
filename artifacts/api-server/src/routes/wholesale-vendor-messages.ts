import { Router } from "express";
import { db, siteConfigTable, auditLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { wholesaleVendorMessageKey } from "../lib/wholesale-vendor-messages";
import { VendorPortalError } from "../lib/vendor-portal-model";

const router = Router();
router.patch("/admin/wholesale-vendors/:id/message", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { message } = req.body ?? {};
  if (typeof message !== "string" || message.length > 2000) {
    res.status(400).json({ error: "Supplier message must be text of up to 2,000 characters." }); return;
  }
  const vendorId = String(req.params.id);
  try {
    await db.transaction(async tx => {
      const [config] = await tx.select().from(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_vendors")).for("share");
      const vendors = config?.value ? JSON.parse(config.value) : [];
      if (!Array.isArray(vendors) || !vendors.some(v => v.id === vendorId)) {
        throw new VendorPortalError("Supplier not found.", 404);
      }
      await tx.insert(siteConfigTable).values({ key: wholesaleVendorMessageKey(vendorId), value: message.trim() })
        .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: message.trim() } });
      await tx.insert(auditLogsTable).values({
        type: "change", level: "info", action: "wholesale_vendor_message_update",
        message: message.trim() ? "Updated supplier wholesale message" : "Cleared supplier wholesale message",
        metadata: { vendorId, adminUsername: res.locals["adminUser"]?.username ?? null }, ip: req.ip,
      });
    });
    res.json({ vendorId, message: message.trim() });
  } catch (error) {
    if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[wholesale-vendor-message]", error);
    res.status(500).json({ error: "Could not save the supplier message. Please retry." });
  }
});
export default router;
