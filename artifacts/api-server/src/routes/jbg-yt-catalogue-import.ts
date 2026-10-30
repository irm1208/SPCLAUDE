import { Router } from "express";
import { createHash } from "node:crypto";
import { db, productsTable, siteConfigTable, auditLogsTable } from "@workspace/db";
import { and, eq, isNull, or, sql, inArray } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { JBG_YT_CATALOGUE, isJbgYtVendor, jbgYtProductId } from "../lib/jbg-yt-catalogue";
import { VendorPortalError } from "../lib/vendor-portal-model";

const router = Router();
router.post("/admin/wholesale-products/import-jbg-yt", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, apply, previewToken } = req.body ?? {};
  if (typeof vendorId !== "string" || !vendorId.trim() || typeof apply !== "boolean" ||
    (apply && (typeof previewToken !== "string" || !/^[a-f0-9]{64}$/.test(previewToken)))) {
    res.status(400).json({ error: "Select JBG/YT and review the product list before importing." }); return;
  }
  try {
    const result = await db.transaction(async tx => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`jbg-yt-catalogue:${vendorId}`}))`);
      const [config] = await tx.select().from(siteConfigTable).where(eq(siteConfigTable.key, "wholesale_vendors")).for("share");
      const vendors = config?.value ? JSON.parse(config.value) : [];
      const vendor = Array.isArray(vendors) ? vendors.find(v => v.id === vendorId) : null;
      if (!vendor || !isJbgYtVendor(String(vendor.name))) {
        throw new VendorPortalError("This product list can only be imported into JBG/YT.", 400);
      }
      const ids = JBG_YT_CATALOGUE.map(row => jbgYtProductId(vendorId, row.sku));
      const existing = await tx.select().from(productsTable).where(or(
        inArray(productsTable.id, ids),
        and(isNull(productsTable.sourceGroupBuyId), or(
          eq(productsTable.wholesaleVendorId, vendorId),
          and(isNull(productsTable.wholesaleVendorId), sql`lower(trim(${productsTable.vendor})) = lower(trim(${vendor.name}))`),
        )),
      )).orderBy(productsTable.id).for("update");
      if (existing.some(row => ids.includes(row.id) && row.wholesaleVendorId !== vendorId)) {
        throw new VendorPortalError("An imported product identity is assigned elsewhere. No changes were saved.", 409);
      }
      const products = JBG_YT_CATALOGUE.map(row => ({
        ...row, id: jbgYtProductId(vendorId, row.sku),
        exists: existing.some(p => p.id === jbgYtProductId(vendorId, row.sku) || p.name.trim().toLowerCase() === row.name.toLowerCase()),
      }));
      const token = createHash("sha256").update(JSON.stringify({ vendorId, products, existing })).digest("hex");
      if (apply && previewToken !== token) {
        throw new VendorPortalError("The catalogue changed since review. Review the products again before importing.", 409);
      }
      const missing = products.filter(row => !row.exists);
      let created = 0;
      if (apply && missing.length) {
        const inserted = await tx.insert(productsTable).values(missing.map(row => ({
          id: row.id, name: row.name, vendor: vendor.name, wholesaleVendorId: vendorId,
          wholesaleCost: row.wholesaleCost, wholesalePrice: row.wholesalePrice,
          price: row.wholesalePrice, stock: row.stock, active: true, wholesaleEnabled: true,
          category: "Peptides", sourceGroupBuyId: null, organiserId: null,
        }))).onConflictDoNothing().returning({ id: productsTable.id });
        if (inserted.length !== missing.length) {
          throw new VendorPortalError("Products changed during import. Nothing was saved; review again.", 409);
        }
        created = inserted.length;
        await tx.insert(auditLogsTable).values({
          type: "change", level: "info", action: "jbg_yt_catalogue_import",
          message: `Imported ${created} JBG/YT wholesale products`,
          metadata: { vendorId, skus: missing.map(row => row.sku), adminUsername: res.locals["adminUser"]?.username ?? null },
          ip: req.ip,
        });
      }
      return { products, previewToken: token, applied: apply, created, preserved: products.length - missing.length };
    });
    res.json(result);
  } catch (error) {
    if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[jbg-yt-catalogue-import]", error);
    res.status(500).json({ error: "Could not import the products. No changes were saved." });
  }
});
export default router;
