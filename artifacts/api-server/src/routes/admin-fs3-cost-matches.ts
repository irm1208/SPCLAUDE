import { Router } from "express";
import { db, fs3CostsTable, siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, setAdminMutationSummary } from "../middleware/require-admin";
import { getVendors } from "./config";
import { fs3MatchKey, loadFs3CostMatches } from "../lib/fs3-cost-matches";
import { normaliseFs3Name, resolveFs3Cost, type Fs3CostMatch } from "@workspace/api-zod/fs3-costs";

const router = Router();
router.get("/admin/fs3-cost-matches", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.set("Cache-Control", "no-store");
  res.json((await loadFs3CostMatches()).filter(m => m.active));
});

router.post("/admin/fs3-cost-matches", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { productName, costName, vendorId, reviewNote, reviewed } = req.body ?? {};
  if (reviewed !== true || ![productName, costName, reviewNote].every(v =>
    typeof v === "string" && v.trim().length > 0 && v.length <= 500 && !/[\u0000-\u001f\u007f]/.test(v)) ||
    !(vendorId === null || (typeof vendorId === "string" && vendorId.length > 0 && vendorId.length <= 200))) {
    res.status(400).json({ error: "Choose a supplier scope, both names, and explicitly confirm your review with a note." }); return;
  }
  if (vendorId !== null && !(await getVendors()).some(v => v.id === vendorId)) {
    res.status(400).json({ error: "Unknown supplier." }); return;
  }
  const costs = await db.select().from(fs3CostsTable);
  if (resolveFs3Cost(costs, [], costName) == null) {
    res.status(400).json({ error: "The target must be an existing, unambiguous saved My Prices cost." }); return;
  }
  if (normaliseFs3Name(productName) === normaliseFs3Name(costName)) {
    res.status(400).json({ error: "Identical names do not need a product name match." }); return;
  }
  const match: Fs3CostMatch = {
    vendorId, productName: productName.trim(), costName: costName.trim(),
    reviewNote: reviewNote.trim(), reviewedAt: new Date().toISOString(),
    reviewedBy: String(res.locals.adminUsername ?? "Admin"), active: true,
  };
  setAdminMutationSummary(res, "fs3_cost_match", ["vendorId", "productName", "costName", "reviewNote"], "reviewed");
  await db.insert(siteConfigTable).values({
    key: fs3MatchKey(vendorId, productName), value: JSON.stringify(match),
  }).onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(match) } });
  res.json(match);
});

router.delete("/admin/fs3-cost-matches", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { vendorId, productName } = req.body ?? {};
  if (typeof productName !== "string" || !productName.trim() ||
    !(vendorId === null || typeof vendorId === "string")) {
    res.status(400).json({ error: "Supplier scope and product name required." }); return;
  }
  const key = fs3MatchKey(vendorId, productName);
  setAdminMutationSummary(res, "fs3_cost_match", ["active"], "revoked");
  await db.transaction(async tx => {
    const [row] = await tx.select().from(siteConfigTable).where(eq(siteConfigTable.key, key)).for("update");
    if (row?.value) await tx.update(siteConfigTable).set({
      value: JSON.stringify({ ...JSON.parse(row.value), active: false,
        revokedAt: new Date().toISOString(), revokedBy: res.locals.adminUsername ?? "Admin" }),
    }).where(eq(siteConfigTable.key, key));
  });
  res.json({ ok: true });
});
export default router;
