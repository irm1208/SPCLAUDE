import { Router } from "express";
import { db, productsTable, fs3CostsTable, auditLogsTable } from "@workspace/db";
import { and, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { getVendors } from "./config";
import { planFs3CostImport } from "../lib/fs3-cost-import";
import { VendorPortalError } from "../lib/vendor-portal-model";

const router = Router();
router.post("/admin/wholesale-products/import-fs3-costs", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, apply, previewToken } = req.body ?? {};
  if (typeof vendorId !== "string" || typeof apply !== "boolean" ||
      (apply && (typeof previewToken !== "string" || !/^[a-f0-9]{64}$/.test(previewToken)))) {
    res.status(400).json({ error: "Choose a vendor and review the FS3 costs before applying." }); return;
  }
  try {
    const vendors = await getVendors();
    const vendor = vendors.find(v => v.id === vendorId);
    if (!vendor || vendor.legacyCatalogueVendor?.trim().toLowerCase() !== "uther") {
      throw new VendorPortalError("FS3 legacy cost import is available only for UR / Uther.");
    }
    const names = [...new Set([vendor.id, vendor.name, vendor.legacyCatalogueVendor].map(v => v!.trim().toLowerCase()))];
    const scope = and(
      eq(productsTable.active, true), isNull(productsTable.sourceGroupBuyId),
      or(eq(productsTable.wholesaleVendorId, vendorId), and(
        isNull(productsTable.wholesaleVendorId),
        inArray(sql`lower(trim(${productsTable.vendor}))`, names),
      )),
    );
    const result = await db.transaction(async tx => {
      const query = tx.select().from(productsTable).where(scope);
      const products = await (apply ? query.for("update") : query);
      const costs = await tx.select().from(fs3CostsTable);
      const plan = planFs3CostImport(products, vendors, vendorId, costs);
      if (!apply) return { ...plan, updated: 0, applied: false };
      if (plan.previewToken !== previewToken) {
        throw new VendorPortalError("Products or FS3 prices changed since your review. Review the import again before applying.", 409);
      }
      let updated = 0;
      for (const match of plan.matches) {
        const rows = await tx.update(productsTable).set({ wholesaleCost: match.cost })
          .where(and(eq(productsTable.id, match.id), isNull(productsTable.wholesaleCost), scope))
          .returning({ id: productsTable.id });
        updated += rows.length;
      }
      if (updated !== plan.matches.length) {
        throw new VendorPortalError("The catalogue changed during import. Nothing was saved; review the import again.", 409);
      }
      if (updated) await tx.insert(auditLogsTable).values({
        type: "change", level: "info", action: "wholesale_fs3_cost_import",
        message: `Imported ${updated} missing UR supplier costs from FS3`,
        metadata: { vendorId, products: plan.matches, adminUsername: res.locals["adminUser"]?.username ?? null },
        ip: req.ip,
      });
      return { ...plan, updated, applied: true };
    });
    res.json(result);
  } catch (error) {
    if (error instanceof VendorPortalError) { res.status(error.status).json({ error: error.message }); return; }
    console.error("[fs3-cost-import] Failed:", error);
    res.status(500).json({ error: "Could not import FS3 costs. No changes were saved." });
  }
});
export default router;
