// ─── /api/shipping/* ─────────────────────────────────────────────────────────
// Shipping quote endpoint + admin package-sizes CRUD.

import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  packageSizesTable,
  productsTable,
  vialProductsTable,
  siteConfigTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { getCarrierProvider, computeWeightGrams } from "@workspace/shipping";

const router: IRouter = Router();

function requireAdmin(req: any, res: any): boolean {
  const secret = req.headers["x-admin-secret"];
  if (!secret || secret !== process.env["ADMIN_SECRET"]) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

async function getConfigValue(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, key));
  return row?.value ?? null;
}

async function setConfigValue(key: string, value: string) {
  await db
    .insert(siteConfigTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value } });
}

/** Load shipping settings from site_config */
async function getShippingSettings() {
  const [originPostcode, originCountry, defaultWeightG, liveRatesGb, liveRatesVial] =
    await Promise.all([
      getConfigValue("shipping_origin_postcode"),
      getConfigValue("shipping_origin_country"),
      getConfigValue("shipping_default_unit_weight_g"),
      getConfigValue("shipping_live_rates_gb"),
      getConfigValue("shipping_live_rates_vial"),
    ]);
  return {
    originPostcode: originPostcode ?? "",
    originCountry: originCountry ?? "GB",
    defaultUnitWeightG: defaultWeightG ? parseInt(defaultWeightG, 10) : 50,
    liveRatesGb: liveRatesGb !== "false",
    liveRatesVial: liveRatesVial !== "false",
  };
}

/** Choose the smallest package size where totalQty <= maxQuantity */
async function pickPackageSize(totalQty: number) {
  const sizes = await db
    .select()
    .from(packageSizesTable)
    .orderBy(packageSizesTable.sortOrder, packageSizesTable.maxQuantity);

  const active = sizes.filter(s => s.active);
  if (active.length === 0) {
    // Fallback defaults matching old tier system
    return totalQty <= 8
      ? { lengthCm: 30, widthCm: 20, heightCm: 20 }
      : { lengthCm: 40, widthCm: 30, heightCm: 30 };
  }
  const fit = active.find(s => totalQty <= s.maxQuantity);
  return fit ?? active[active.length - 1]!;
}

// ─── POST /api/shipping/quote ─────────────────────────────────────────────────
// Body: {
//   items: [{productId: string, quantity: number}],
//   destination: {countryCode: string, postcode?: string, city?: string},
//   type?: "gb" | "vial"   (default "gb")
// }
router.post("/shipping/quote", async (req, res): Promise<void> => {
  try {
    const { items, destination, type = "gb" } = req.body as {
      items?: Array<{ productId: string; quantity: number }>;
      destination?: { countryCode?: string; postcode?: string; city?: string };
      type?: "gb" | "vial";
    };

    if (!destination?.countryCode || typeof destination.countryCode !== "string") {
      res.status(400).json({ error: "destination.countryCode is required" });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "items array is required" });
      return;
    }

    const settings = await getShippingSettings();

    // ── Load product weights ─────────────────────────────────────────────────
    const productIds = items.map(i => i.productId);
    let weightItems: Array<{ quantity: number; weightGrams: number | null }>;

    if (type === "vial") {
      const prods = await db
        .select({ id: vialProductsTable.id, weightGrams: vialProductsTable.weightGrams })
        .from(vialProductsTable)
        .where(eq(vialProductsTable.id, productIds[0]!)); // start with first
      const weightMap = new Map(prods.map(p => [p.id, p.weightGrams]));
      // Fetch all in one batch using promise.all
      const allProds = await db.select({ id: vialProductsTable.id, weightGrams: vialProductsTable.weightGrams }).from(vialProductsTable);
      const allMap = new Map(allProds.map(p => [p.id, p.weightGrams]));
      weightItems = items.map(i => ({
        quantity: i.quantity,
        weightGrams: allMap.get(i.productId) ?? null,
      }));
    } else {
      const allProds = await db.select({ id: productsTable.id, weightGrams: productsTable.weightGrams }).from(productsTable);
      const allMap = new Map(allProds.map(p => [p.id, p.weightGrams]));
      weightItems = items.map(i => ({
        quantity: i.quantity,
        weightGrams: allMap.get(i.productId) ?? null,
      }));
    }

    const totalQty = items.reduce((s, i) => s + i.quantity, 0);
    const totalWeightGrams = computeWeightGrams(weightItems, settings.defaultUnitWeightG);
    const pkg = await pickPackageSize(totalQty);

    const provider = getCarrierProvider();

    const result = await provider.getQuotes({
      origin: {
        countryCode: settings.originCountry,
        postcode: settings.originPostcode,
      },
      destination: {
        countryCode: destination.countryCode,
        postcode: destination.postcode,
        city: destination.city,
      },
      packages: [
        {
          weightKg: totalWeightGrams / 1000,
          lengthCm: "lengthCm" in pkg ? pkg.lengthCm : 30,
          widthCm: "widthCm" in pkg ? pkg.widthCm : 20,
          heightCm: "heightCm" in pkg ? pkg.heightCm : 20,
        },
      ],
    });

    res.json({
      services: result.services,
      source: result.source,
      quotedWeightGrams: totalWeightGrams,
      totalQty,
    });
  } catch (err: any) {
    console.error("Shipping quote error:", err);
    res.status(500).json({ error: "Failed to get shipping quotes", detail: String(err?.message ?? err) });
  }
});

// ─── GET /api/admin/package-sizes ────────────────────────────────────────────
router.get("/admin/package-sizes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const sizes = await db
    .select()
    .from(packageSizesTable)
    .orderBy(packageSizesTable.sortOrder, packageSizesTable.maxQuantity);
  res.json(sizes);
});

// ─── POST /api/admin/package-sizes ───────────────────────────────────────────
router.post("/admin/package-sizes", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { name, lengthCm, widthCm, heightCm, maxQuantity, sortOrder = 0, active = true } = req.body;
  if (!name || !lengthCm || !widthCm || !heightCm || !maxQuantity) {
    res.status(400).json({ error: "name, lengthCm, widthCm, heightCm, maxQuantity are required" });
    return;
  }
  const [created] = await db.insert(packageSizesTable).values({
    id: randomUUID(),
    name: String(name),
    lengthCm: Number(lengthCm),
    widthCm: Number(widthCm),
    heightCm: Number(heightCm),
    maxQuantity: Number(maxQuantity),
    sortOrder: Number(sortOrder),
    active: Boolean(active),
  }).returning();
  res.status(201).json(created);
});

// ─── PATCH /api/admin/package-sizes/:id ──────────────────────────────────────
router.patch("/admin/package-sizes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  const { name, lengthCm, widthCm, heightCm, maxQuantity, sortOrder, active } = req.body;
  const update: Partial<typeof packageSizesTable.$inferInsert> = {};
  if (name !== undefined) update.name = String(name);
  if (lengthCm !== undefined) update.lengthCm = Number(lengthCm);
  if (widthCm !== undefined) update.widthCm = Number(widthCm);
  if (heightCm !== undefined) update.heightCm = Number(heightCm);
  if (maxQuantity !== undefined) update.maxQuantity = Number(maxQuantity);
  if (sortOrder !== undefined) update.sortOrder = Number(sortOrder);
  if (active !== undefined) update.active = Boolean(active);
  const [updated] = await db.update(packageSizesTable).set(update).where(eq(packageSizesTable.id, id!)).returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

// ─── DELETE /api/admin/package-sizes/:id ─────────────────────────────────────
router.delete("/admin/package-sizes/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { id } = req.params;
  await db.delete(packageSizesTable).where(eq(packageSizesTable.id, id!));
  res.json({ ok: true });
});

// ─── GET /api/admin/shipping-settings ────────────────────────────────────────
router.get("/admin/shipping-settings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const settings = await getShippingSettings();
  res.json(settings);
});

// ─── PATCH /api/admin/shipping-settings ──────────────────────────────────────
router.patch("/admin/shipping-settings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { originPostcode, originCountry, defaultUnitWeightG, liveRatesGb, liveRatesVial } = req.body as {
    originPostcode?: string;
    originCountry?: string;
    defaultUnitWeightG?: number;
    liveRatesGb?: boolean;
    liveRatesVial?: boolean;
  };

  const ops: Promise<void>[] = [];
  if (originPostcode !== undefined) ops.push(setConfigValue("shipping_origin_postcode", originPostcode.trim()));
  if (originCountry !== undefined) ops.push(setConfigValue("shipping_origin_country", originCountry.trim().toUpperCase()));
  if (defaultUnitWeightG !== undefined) ops.push(setConfigValue("shipping_default_unit_weight_g", String(Number(defaultUnitWeightG))));
  if (liveRatesGb !== undefined) ops.push(setConfigValue("shipping_live_rates_gb", liveRatesGb ? "true" : "false"));
  if (liveRatesVial !== undefined) ops.push(setConfigValue("shipping_live_rates_vial", liveRatesVial ? "true" : "false"));
  await Promise.all(ops);

  res.json(await getShippingSettings());
});

export default router;
