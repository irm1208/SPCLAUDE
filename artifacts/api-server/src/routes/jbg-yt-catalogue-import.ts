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
      if (existing.some(row => ids.includes(row.id) && (row.wholesaleVendorId !== vendorId || row.sourceGroupBuyId !== null))) {
        throw new VendorPortalError("An imported product identity is assigned elsewhere. No changes were saved.", 409);
      }
      const products = JBG_YT_CATALOGUE.map(row => {
        const exact = existing.find(p => p.id === jbgYtProductId(vendorId, row.sku));
        const matches = exact ? [exact] : existing.filter(p => p.name.trim().toLowerCase() === row.name.toLowerCase());
        if (matches.length > 1) throw new VendorPortalError(`More than one JBG/YT product matches ${row.name}. Review duplicates before importing.`, 409);
        const current = matches[0];
        return {
          ...row, id: current?.id ?? jbgYtProductId(vendorId, row.sku), exists: !!current,
          stock: current ? current.stock : row.stock,
          previousCost: current?.wholesaleCost ?? null, previousPrice: current?.wholesalePrice ?? null,
          needsUpdate: !!current && (Number(current.wholesaleCost ?? NaN) !== Number(row.wholesaleCost) ||
            Number(current.wholesalePrice ?? NaN) !== Number(row.wholesalePrice) || Number(current.price) !== Number(row.wholesalePrice)),
        };
      });
      const token = createHash("sha256").update(JSON.stringify({ vendorId, products, existing })).digest("hex");
      if (apply && previewToken !== token) {
        throw new VendorPortalError("The catalogue changed since review. Review the products again before importing.", 409);
      }
      const missing = products.filter(row => !row.exists);
      const corrections = products.filter(row => row.needsUpdate);
      let created = 0;
      let updated = 0;
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
      }
      if (apply) {
        for (const row of corrections) {
          await tx.update(productsTable).set({
            wholesaleCost: row.wholesaleCost, wholesalePrice: row.wholesalePrice, price: row.wholesalePrice,
          }).where(eq(productsTable.id, row.id));
          updated++;
        }
      }
      if (apply && (created || updated)) {
        await tx.insert(auditLogsTable).values({
          type: "change", level: "info", action: "jbg_yt_catalogue_import",
          message: `Added ${created} and corrected ${updated} JBG/YT wholesale products`,
          metadata: { vendorId, addedSkus: missing.map(row => row.sku),
            priceChanges: corrections.map(row => ({ sku: row.sku, previousCost: row.previousCost, previousPrice: row.previousPrice, cost: row.wholesaleCost, price: row.wholesalePrice })),
            adminUsername: res.locals["adminUser"]?.username ?? null },
          ip: req.ip,
        });
      }
      return { products, previewToken: token, applied: apply, created, updated, preserved: products.length - missing.length - corrections.length };
    });
    res.json(result);
  } catch (error) {
    if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[jbg-yt-catalogue-import]", error);
    res.status(500).json({ error: "Could not import the products. No changes were saved." });
  }
});
export default router;
