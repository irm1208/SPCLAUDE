import { Router } from "express";
import { db, pool } from "@workspace/db";
import { intlParcelSizesTable, intlShippingRatesTable } from "@workspace/db/schema";
import { requireAdmin } from "../middleware/require-admin";
import { getJwtSecret } from "../middleware/account-auth";
import { eq, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import type { Request, Response } from "express";
import { GoogleGenAI } from "../lib/google-genai";

const router = Router();

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// ─── Auth helper: admin secret OR approved organiser session ──────────────────

async function checkAuth(req: Request, res: Response, groupBuyId?: string): Promise<boolean> {
  if (req.headers["x-admin-secret"]) {
    return requireAdmin(req, res);
  }
  const token = req.cookies?.account_session as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  let payload: { telegramUsername: string; jti: string };
  try {
    payload = jwt.verify(token, getJwtSecret()) as { telegramUsername: string; jti: string };
  } catch {
    res.status(401).json({ error: "Session expired or invalid" });
    return false;
  }
  const accountRes = await pool.query<{ organiser_status: string | null }>(
    "SELECT organiser_status FROM accounts WHERE telegram_username = $1 LIMIT 1",
    [payload.telegramUsername]
  );
  const account = accountRes.rows[0];
  if (!account || account.organiser_status !== "approved") {
    res.status(403).json({ error: "Organiser access required" });
    return false;
  }
  if (groupBuyId) {
    const gbRes = await pool.query(
      "SELECT id FROM group_buys WHERE id = $1 AND organiser_id = $2 LIMIT 1",
      [groupBuyId, payload.telegramUsername]
    );
    if (!gbRes.rows[0]) {
      res.status(403).json({ error: "You do not own this group buy" });
      return false;
    }
  }
  return true;
}

async function checkAuthForSize(req: Request, res: Response, sizeId: string): Promise<boolean> {
  if (req.headers["x-admin-secret"]) return requireAdmin(req, res);
  const res2 = await pool.query<{ group_buy_id: string | null }>(
    "SELECT group_buy_id FROM intl_parcel_sizes WHERE id = $1 LIMIT 1",
    [sizeId]
  );
  const gbId = res2.rows[0]?.group_buy_id;
  if (!gbId) {
    res.status(404).json({ error: "Parcel size not found" });
    return false;
  }
  return checkAuth(req, res, gbId);
}

async function checkAuthForRate(req: Request, res: Response, rateId: string): Promise<boolean> {
  if (req.headers["x-admin-secret"]) return requireAdmin(req, res);
  const res2 = await pool.query<{ group_buy_id: string | null }>(
    "SELECT group_buy_id FROM intl_shipping_rates WHERE id = $1 LIMIT 1",
    [rateId]
  );
  const gbId = res2.rows[0]?.group_buy_id;
  if (!gbId) {
    res.status(404).json({ error: "Shipping rate not found" });
    return false;
  }
  return checkAuth(req, res, gbId);
}

// ─── Parcel Sizes ─────────────────────────────────────────────────────────────

router.get("/intl-shipping/parcel-sizes", async (req, res): Promise<void> => {
  const { groupBuyId } = req.query as Record<string, string>;
  try {
    const rows = await db
      .select()
      .from(intlParcelSizesTable)
      .where(groupBuyId ? eq(intlParcelSizesTable.groupBuyId, groupBuyId) : isNull(intlParcelSizesTable.groupBuyId))
      .orderBy(intlParcelSizesTable.sortOrder);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch parcel sizes" });
  }
});

router.post("/intl-shipping/parcel-sizes", async (req, res): Promise<void> => {
  const { groupBuyId, name, weightKg, lengthCm, widthCm, heightCm, qtyLabel, notes, sortOrder, maxKitsPerPackage } = req.body;
  if (!groupBuyId) { res.status(400).json({ error: "groupBuyId required" }); return; }
  if (!await checkAuth(req, res, groupBuyId)) return;
  try {
    const [row] = await db
      .insert(intlParcelSizesTable)
      .values({
        id: randomUUID(),
        groupBuyId,
        name,
        weightKg: String(weightKg ?? "0"),
        lengthCm: Number(lengthCm ?? 0),
        widthCm: Number(widthCm ?? 0),
        heightCm: Number(heightCm ?? 0),
        qtyLabel: qtyLabel || null,
        notes: notes || null,
        maxKitsPerPackage: maxKitsPerPackage != null ? Number(maxKitsPerPackage) : null,
        sortOrder: Number(sortOrder ?? 0),
      })
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to create parcel size" });
  }
});

router.patch("/intl-shipping/parcel-sizes/:id", async (req, res): Promise<void> => {
  if (!await checkAuthForSize(req, res, req.params.id)) return;
  try {
    const { name, weightKg, lengthCm, widthCm, heightCm, qtyLabel, notes, sortOrder, active, maxKitsPerPackage } = req.body;
    const updateFields: Record<string, unknown> = {};
    if (name !== undefined) updateFields.name = name;
    if (weightKg !== undefined) updateFields.weightKg = String(weightKg);
    if (lengthCm !== undefined) updateFields.lengthCm = Number(lengthCm);
    if (widthCm !== undefined) updateFields.widthCm = Number(widthCm);
    if (heightCm !== undefined) updateFields.heightCm = Number(heightCm);
    if (qtyLabel !== undefined) updateFields.qtyLabel = qtyLabel ?? null;
    if (notes !== undefined) updateFields.notes = notes || null;
    if (sortOrder !== undefined) updateFields.sortOrder = Number(sortOrder);
    if (active !== undefined) updateFields.active = Boolean(active);
    if (maxKitsPerPackage !== undefined) updateFields.maxKitsPerPackage = maxKitsPerPackage != null ? Number(maxKitsPerPackage) : null;
    const [row] = await db
      .update(intlParcelSizesTable)
      .set(updateFields)
      .where(eq(intlParcelSizesTable.id, req.params.id))
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update parcel size" });
  }
});

router.delete("/intl-shipping/parcel-sizes/:id", async (req, res): Promise<void> => {
  if (!await checkAuthForSize(req, res, req.params.id)) return;
  try {
    await db.delete(intlShippingRatesTable).where(eq(intlShippingRatesTable.parcelSizeId, req.params.id));
    await db.delete(intlParcelSizesTable).where(eq(intlParcelSizesTable.id, req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete parcel size" });
  }
});

// ─── Shipping Rates ──────────────────────────────────────────────────────────

router.get("/intl-shipping/rates", async (req, res): Promise<void> => {
  const { groupBuyId } = req.query as Record<string, string>;
  try {
    const rows = await db
      .select()
      .from(intlShippingRatesTable)
      .where(groupBuyId ? eq(intlShippingRatesTable.groupBuyId, groupBuyId) : isNull(intlShippingRatesTable.groupBuyId))
      .orderBy(intlShippingRatesTable.sortOrder);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch shipping rates" });
  }
});

router.post("/intl-shipping/rates", async (req, res): Promise<void> => {
  const { groupBuyId, parcelSizeId, country, region, carrier, priceGbp, priceUsd, priceEur, sortOrder } = req.body;
  if (!groupBuyId) { res.status(400).json({ error: "groupBuyId required" }); return; }
  if (!await checkAuth(req, res, groupBuyId)) return;
  try {
    const [row] = await db
      .insert(intlShippingRatesTable)
      .values({ id: randomUUID(), groupBuyId, parcelSizeId, country, region: region || null, carrier, priceGbp: String(priceGbp), priceUsd: String(priceUsd), priceEur: String(priceEur), sortOrder: Number(sortOrder ?? 0) })
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to create shipping rate" });
  }
});

router.patch("/intl-shipping/rates/:id", async (req, res): Promise<void> => {
  if (!await checkAuthForRate(req, res, req.params.id)) return;
  try {
    const { parcelSizeId, country, region, carrier, priceGbp, priceUsd, priceEur, sortOrder, active } = req.body;
    const [row] = await db
      .update(intlShippingRatesTable)
      .set({ parcelSizeId, country, region: region ?? null, carrier, priceGbp: String(priceGbp), priceUsd: String(priceUsd), priceEur: String(priceEur), sortOrder: Number(sortOrder), active: Boolean(active) })
      .where(eq(intlShippingRatesTable.id, req.params.id))
      .returning();
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update shipping rate" });
  }
});

router.delete("/intl-shipping/rates/:id", async (req, res): Promise<void> => {
  if (!await checkAuthForRate(req, res, req.params.id)) return;
  try {
    await db.delete(intlShippingRatesTable).where(eq(intlShippingRatesTable.id, req.params.id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete shipping rate" });
  }
});

// ─── AI-assisted shipping config generation ───────────────────────────────────

router.post("/intl-shipping/ai-generate", async (req, res): Promise<void> => {
  const { groupBuyId, description } = req.body;
  if (!groupBuyId) { res.status(400).json({ error: "groupBuyId required" }); return; }
  if (!description) { res.status(400).json({ error: "description required" }); return; }
  if (!await checkAuth(req, res, groupBuyId)) return;

  try {
    const prompt = `You are a shipping configuration assistant for a peptide group buy platform.

Based on the following description, generate a JSON shipping configuration with tiers (parcel sizes) and per-country rates.

Description: "${description}"

Return ONLY valid JSON in this exact format (no markdown, no code blocks, just raw JSON):
{
  "tiers": [
    {
      "name": "string — short tier name e.g. 'Standard' or 'Small (1-8 kits)'",
      "qtyLabel": "string — quantity range this tier covers e.g. '1-8 kits'",
      "notes": "string — 2-4 sentence customer-friendly description of what to expect: delivery time, carrier, tracking, any customs info relevant to international shipments",
      "countries": [
        {
          "country": "full country name e.g. Germany",
          "carrier": "carrier name e.g. UPS or DHL or ParcelForce",
          "priceGbp": "numeric string e.g. 16.00",
          "priceUsd": "numeric string e.g. 21.64",
          "priceEur": "numeric string e.g. 18.38"
        }
      ]
    }
  ]
}

Rules:
- Use realistic shipping prices (GBP as base, convert USD ~1.35x GBP, EUR ~1.15x GBP)
- Include all countries mentioned, or infer from regions (e.g. "EU" = all 27 EU member states)
- Generate sensible customer-facing notes explaining delivery timeframes, carrier, and tracking
- If multiple tiers are implied (e.g. small/large), generate both
- Keep carrier names consistent and realistic (UPS, DHL, ParcelForce, FedEx, Royal Mail)`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const raw = response.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: { tiers: Array<{ name: string; qtyLabel: string; notes: string; countries: Array<{ country: string; carrier: string; priceGbp: string; priceUsd: string; priceEur: string }> }> };
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      res.status(500).json({ error: "AI returned invalid JSON. Try rephrasing your description." });
      return;
    }

    if (!Array.isArray(parsed?.tiers)) {
      res.status(500).json({ error: "AI response missing tiers array." });
      return;
    }

    res.json(parsed);
  } catch (err) {
    console.error("[intl-shipping] ai-generate failed:", err);
    res.status(500).json({ error: "AI generation failed. Check that the AI integration is configured." });
  }
});

// ─── Seed EU template for a specific group buy ───────────────────────────────

router.post("/intl-shipping/seed-template", async (req, res): Promise<void> => {
  const { groupBuyId } = req.body;
  if (!groupBuyId) { res.status(400).json({ error: "groupBuyId required" }); return; }
  if (!await checkAuth(req, res, groupBuyId)) return;

  try {
    const existingSizes = await db
      .select()
      .from(intlParcelSizesTable)
      .where(eq(intlParcelSizesTable.groupBuyId, groupBuyId));
    if (existingSizes.length > 0) {
      res.status(409).json({ error: "This group buy already has parcel sizes. Delete them first." });
      return;
    }

    const smallId = randomUUID();
    const largeId = randomUUID();

    const smallNotes = "Shipped via UPS Express. Estimated delivery 3–5 working days after dispatch. Full tracking provided. Your order will be discreetly packaged with no product description on the outer label.";
    const largeNotes = "Shipped via UPS Express. Estimated delivery 3–5 working days after dispatch. Full tracking provided. Your order will be discreetly packaged with no product description on the outer label.";

    await db.insert(intlParcelSizesTable).values([
      { id: smallId, groupBuyId, name: "Small (3kg)", weightKg: "3.00", lengthCm: 30, widthCm: 20, heightCm: 20, qtyLabel: "1–8 kits", notes: smallNotes, sortOrder: 0 },
      { id: largeId, groupBuyId, name: "Large (4kg)", weightKg: "4.00", lengthCm: 40, widthCm: 30, heightCm: 30, qtyLabel: "9+ kits", notes: largeNotes, sortOrder: 1 },
    ]);

    const smallRates = [
      { country: "Austria",     region: null,            carrier: "UPS",         priceGbp: "17.00", priceUsd: "22.99", priceEur: "19.53" },
      { country: "Belgium",     region: null,            carrier: "UPS",         priceGbp: "16.00", priceUsd: "21.64", priceEur: "18.38" },
      { country: "Bulgaria",    region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Croatia",     region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Cyprus",      region: null,            carrier: "UPS",         priceGbp: "46.00", priceUsd: "62.21", priceEur: "52.84" },
      { country: "Czech Republic", region: null,         carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Denmark",     region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Estonia",     region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Finland",     region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "France",      region: null,            carrier: "UPS",         priceGbp: "16.00", priceUsd: "21.64", priceEur: "18.38" },
      { country: "Germany",     region: null,            carrier: "UPS",         priceGbp: "16.00", priceUsd: "21.64", priceEur: "18.38" },
      { country: "Greece",      region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Hungary",     region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Ireland",     region: null,            carrier: "UPS",         priceGbp: "16.00", priceUsd: "21.64", priceEur: "18.38" },
      { country: "Italy",       region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Italy",       region: "Sardinia",      carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Italy",       region: "Sicilia",       carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Latvia",      region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Lithuania",   region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Luxembourg",  region: null,            carrier: "UPS",         priceGbp: "16.00", priceUsd: "21.64", priceEur: "18.38" },
      { country: "Malta",       region: null,            carrier: "UPS",         priceGbp: "46.00", priceUsd: "62.21", priceEur: "52.84" },
      { country: "Netherlands", region: null,            carrier: "UPS",         priceGbp: "16.00", priceUsd: "21.64", priceEur: "18.38" },
      { country: "Poland",      region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Portugal",    region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Romania",     region: null,            carrier: "UPS",         priceGbp: "23.00", priceUsd: "31.11", priceEur: "26.42" },
      { country: "Slovakia",    region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Slovenia",    region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Spain",       region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Spain",       region: "Fuerteventura", carrier: "ParcelForce", priceGbp: "29.00", priceUsd: "39.22", priceEur: "33.32" },
      { country: "Spain",       region: "Gran Canaria",  carrier: "ParcelForce", priceGbp: "20.00", priceUsd: "27.05", priceEur: "22.98" },
      { country: "Spain",       region: "Ibiza",         carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "La Palma",      carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Lanzarote",     carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Majorca",       carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Menorca",       carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Tenerife",      carrier: "UPS",         priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Sweden",      region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
    ];

    const largeRates = [
      { country: "Austria",     region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Belgium",     region: null,            carrier: "UPS",         priceGbp: "20.00", priceUsd: "27.05", priceEur: "22.98" },
      { country: "Bulgaria",    region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Croatia",     region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Cyprus",      region: null,            carrier: "UPS",         priceGbp: "58.00", priceUsd: "78.44", priceEur: "66.63" },
      { country: "Czech Republic", region: null,         carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Denmark",     region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Estonia",     region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Finland",     region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "France",      region: null,            carrier: "UPS",         priceGbp: "20.00", priceUsd: "27.05", priceEur: "22.98" },
      { country: "Germany",     region: null,            carrier: "UPS",         priceGbp: "20.00", priceUsd: "27.05", priceEur: "22.98" },
      { country: "Greece",      region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Hungary",     region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Ireland",     region: null,            carrier: "UPS",         priceGbp: "20.00", priceUsd: "27.05", priceEur: "22.98" },
      { country: "Italy",       region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Italy",       region: "Sardinia",      carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Italy",       region: "Sicilia",       carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Latvia",      region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Lithuania",   region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Luxembourg",  region: null,            carrier: "UPS",         priceGbp: "20.00", priceUsd: "27.05", priceEur: "22.98" },
      { country: "Malta",       region: null,            carrier: "UPS",         priceGbp: "58.00", priceUsd: "78.44", priceEur: "66.63" },
      { country: "Netherlands", region: null,            carrier: "UPS",         priceGbp: "18.00", priceUsd: "24.34", priceEur: "20.68" },
      { country: "Poland",      region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Portugal",    region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Romania",     region: null,            carrier: "UPS",         priceGbp: "24.00", priceUsd: "32.46", priceEur: "27.57" },
      { country: "Slovakia",    region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Slovenia",    region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Spain",       region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
      { country: "Spain",       region: "Fuerteventura", carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Gran Canaria",  carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Ibiza",         carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "La Palma",      carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Lanzarote",     carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Majorca",       carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Menorca",       carrier: "ParcelForce", priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Spain",       region: "Tenerife",      carrier: "UPS",         priceGbp: "43.00", priceUsd: "58.15", priceEur: "49.40" },
      { country: "Sweden",      region: null,            carrier: "UPS",         priceGbp: "21.00", priceUsd: "28.40", priceEur: "24.12" },
    ];

    const allRates = [
      ...smallRates.map((r, i) => ({ id: randomUUID(), groupBuyId, parcelSizeId: smallId, sortOrder: i, ...r })),
      ...largeRates.map((r, i) => ({ id: randomUUID(), groupBuyId, parcelSizeId: largeId, sortOrder: i, ...r })),
    ];
    await db.insert(intlShippingRatesTable).values(allRates);
    res.json({ ok: true, parcelSizes: 2, rates: allRates.length });
  } catch (err) {
    console.error("[intl-shipping] seed-template failed:", err);
    res.status(500).json({ error: "Seed failed" });
  }
});

export default router;
