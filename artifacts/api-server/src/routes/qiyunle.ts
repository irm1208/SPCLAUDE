import { Router } from "express";
import { requireAdmin } from "../middleware/require-admin";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import {
  getQiyunleToken,
  fetchAllInventory,
  fetchInventoryItems,
  runQiyunleSync,
  getQiyunleCredentials,
  saveQiyunleCredentials,
  clearQiyunleCredentials,
  loginToQiyunle,
} from "../lib/qiyunle-sync";
import { GoogleGenAI } from "../lib/google-genai";

const router = Router();

// GET /api/admin/qiyunle/status
router.get("/admin/qiyunle/status", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const [token, creds] = await Promise.all([getQiyunleToken(), getQiyunleCredentials()]);
    const rows = (await db.execute(sql`
      SELECT key, value FROM site_config
      WHERE key IN ('qiyunleLastSync', 'qiyunleLastError', 'qiyunleLastSyncCount', 'qiyunleSessionAt', 'qiyunleUsername')
    `)).rows as { key: string; value: string }[];
    const cfg = Object.fromEntries(rows.map(r => [r.key, r.value]));
    const sessionAt = cfg.qiyunleSessionAt ? parseInt(cfg.qiyunleSessionAt, 10) : null;
    // Active = a session exists in DB. Cleared automatically on AUTH_EXPIRED.
    const sessionActive = !!sessionAt && !isNaN(sessionAt);
    res.json({
      hasToken: !!token,
      hasCredentials: !!creds,
      credentialUsername: cfg.qiyunleUsername ?? null,
      sessionActive,
      lastSync: cfg.qiyunleLastSync ?? null,
      lastSyncCount: cfg.qiyunleLastSyncCount ?? null,
      lastError: cfg.qiyunleLastError ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// GET /api/admin/qiyunle/credentials
router.get("/admin/qiyunle/credentials", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const creds = await getQiyunleCredentials();
  res.json({ hasCredentials: !!creds, username: creds?.username ?? null });
});

// POST /api/admin/qiyunle/credentials — save username+password and test login
router.post("/admin/qiyunle/credentials", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { username, password } = req.body as { username?: string; password?: string };
  if (!username?.trim() || !password?.trim()) {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  try {
    const session = await loginToQiyunle(username.trim(), password.trim());
    await saveQiyunleCredentials(username.trim(), password.trim());
    const now = String(Date.now());
    await db.execute(sql`INSERT INTO site_config (key, value) VALUES ('qiyunleSession', ${session.cookie}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    await db.execute(sql`INSERT INTO site_config (key, value) VALUES ('qiyunleBaseUrl', ${session.baseUrl}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    await db.execute(sql`INSERT INTO site_config (key, value) VALUES ('qiyunleSessionAt', ${now}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`);
    res.json({ success: true, message: "Credentials saved and login verified" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(400).json({ error: msg });
  }
});

// DELETE /api/admin/qiyunle/credentials
router.delete("/admin/qiyunle/credentials", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  await clearQiyunleCredentials();
  res.json({ success: true });
});

// GET /api/admin/qiyunle/inventory — fetch live data from qiyunle (no DB write)
router.get("/admin/qiyunle/inventory", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const items = await fetchInventoryItems();
    res.json(items);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: msg });
  }
});

// POST /api/admin/qiyunle/sync — manual sync trigger (re-login allowed)
router.post("/admin/qiyunle/sync", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await runQiyunleSync(true); // allowRelogin=true for admin-triggered syncs
    res.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(502).json({ error: msg });
  }
});

// GET /api/admin/qiyunle/mappings
router.get("/admin/qiyunle/mappings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await db.execute(sql`
      SELECT m.id, m.product_id, m.qiyunle_code, m.qiyunle_goods_id, m.qiyunle_name, m.manufacturer, m.batch_stock, m.created_at,
             p.name AS product_name, p.stock AS current_stock
      FROM qiyunle_mappings m
      LEFT JOIN products p ON p.id = m.product_id
      ORDER BY p.name ASC, m.qiyunle_code ASC
    `);
    res.json(result.rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// POST /api/admin/qiyunle/mappings — create or update mapping
router.post("/admin/qiyunle/mappings", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { productId, qiyunleCode, qiyunleGoodsId, qiyunleName, manufacturer } = req.body as {
    productId: string; qiyunleCode: string; qiyunleGoodsId?: number; qiyunleName?: string; manufacturer?: string;
  };
  if (!productId || !qiyunleCode) { res.status(400).json({ error: "productId and qiyunleCode required" }); return; }
  try {
    const id = crypto.randomUUID();
    const mfr = manufacturer?.trim() || "Uther";
    await db.execute(sql`
      INSERT INTO qiyunle_mappings (id, product_id, qiyunle_code, qiyunle_goods_id, qiyunle_name, manufacturer)
      VALUES (${id}, ${productId}, ${qiyunleCode}, ${qiyunleGoodsId ?? null}, ${qiyunleName ?? null}, ${mfr})
      ON CONFLICT (qiyunle_code) DO UPDATE
        SET product_id = EXCLUDED.product_id,
            qiyunle_name = EXCLUDED.qiyunle_name,
            qiyunle_goods_id = EXCLUDED.qiyunle_goods_id,
            manufacturer = EXCLUDED.manufacturer
    `);
    res.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/admin/qiyunle/mappings/:id
router.delete("/admin/qiyunle/mappings/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    await db.execute(sql`DELETE FROM qiyunle_mappings WHERE id = ${req.params.id}`);
    res.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// POST /api/admin/qiyunle/token — update the API token
router.post("/admin/qiyunle/token", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { token } = req.body as { token: string };
  if (!token?.trim()) { res.status(400).json({ error: "token required" }); return; }
  try {
    await db.execute(sql`
      INSERT INTO site_config (key, value) VALUES ('qiyunleToken', ${token.trim()})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
    // Clear error state and "already notified" flag so a future expiry will alert again
    await db.execute(sql`DELETE FROM site_config WHERE key IN ('qiyunleLastError', 'qiyunleTokenExpiredNotified')`);
    res.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// GET /api/admin/products/list — lightweight product list for mapping UI
router.get("/admin/products/list", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const result = await db.execute(sql`
      SELECT id, name, mg_size, category, stock, vendor
      FROM products
      WHERE active = true
      ORDER BY name ASC
    `);
    res.json(result.rows);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// POST /api/admin/qiyunle/auto-map — AI-powered batch code matching
router.post("/admin/qiyunle/auto-map", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  try {
    const { items, manufacturer: reqManufacturer } = req.body as {
      items: { code: string; goodsId?: number; name?: string }[];
      manufacturer?: string;
    };
    if (!items?.length) { res.status(400).json({ error: "items required" }); return; }

    const manufacturer = reqManufacturer?.trim() || "Uther";

    // Load Peps products — filter to the specified manufacturer/vendor for a tighter match
    const productsResult = await db.execute(sql`
      SELECT id, name, mg_size, category, vendor FROM products
      WHERE active = true
        AND LOWER(vendor) = LOWER(${manufacturer})
      ORDER BY name ASC
    `);
    let products = productsResult.rows as { id: string; name: string; mg_size: string | null; category: string | null; vendor: string | null }[];

    // Fall back to all active products if vendor filter returns nothing
    if (!products.length) {
      const allResult = await db.execute(sql`
        SELECT id, name, mg_size, category, vendor FROM products
        WHERE active = true
        ORDER BY name ASC
      `);
      products = allResult.rows as { id: string; name: string; mg_size: string | null; category: string | null; vendor: string | null }[];
    }

    // Load already-mapped codes to skip them
    const mappedResult = await db.execute(sql`SELECT qiyunle_code FROM qiyunle_mappings`);
    const mappedCodes = new Set((mappedResult.rows as { qiyunle_code: string }[]).map(r => r.qiyunle_code));

    const unmapped = items.filter(i => !mappedCodes.has(i.code));
    if (!unmapped.length) { res.json({ suggestions: [], message: "All items are already mapped" }); return; }

    const gemini = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
    });

    const prompt = `You are matching Qiyunle ERP inventory batch codes to peptide products in a group-buy store (manufacturer: ${manufacturer}).

BATCH CODE SCHEME:
- BP = BPC-157 | TB4 = TB-500 | TE = Tesamorelin | ZE = Tirzepatide
- RE = Retatrutide | HK = GHK-Cu | OZ = Semaglutide | IP = Ipamorelin
- IG = IGF-1 LR3 | G2 = GHRP-2 | G6 = GHRP-6 | A0 = AOD-9604
- MT1 = Melanotan 1 | MT2 = Melanotan 2 | MO = MOTS-C | TA1 = Thymosin Alpha-1
- EP = Epithalon | SK = Selank | NASK = N-Acetyl Selank | CJD = CJC-1295 DAC
- CI = CJC DAC/Ipamorelin combo | T/B = BPC-157/TB-500 combo | SS = Elamipretide (SS-31)
- SR = Sermorelin | DS = DSIP | NA = NAD+ | KP = KPV | ARA = ARA-290
- CAG = Cagrilintide | SUR = Survotide | 51Q = 5-Amino-1-methylquinolinium
- T/15 = Tesamorelin/Ipamorelin combo | HK/KP = GHK-Cu/KPV blend

DATE SUFFIX RULE (IMPORTANT):
Batch codes often have a date suffix appended after a hyphen, e.g. "BP10-0429" means base code "BP10" with batch date 04/29.
Always strip any "-MMDD" or "-MMDDYY" suffix before interpreting the base code.
Examples: MT110-0429 → base MT110 = Melanotan 1 10mg | TE20-0429 → base TE20 = Tesamorelin 20mg

DOSE RULE:
Numbers after the abbreviation = mg dose (e.g. BP10 = BPC-157 10mg, ZE60 = Tirzepatide 60mg).
For combos: T/B1010 = BPC-157 10mg / TB-500 10mg.

QIYUNLE ITEMS TO MATCH (unmapped):
${unmapped.map(i => `  code="${i.code}" goodsId=${i.goodsId ?? "?"} name="${i.name ?? ""}"`).join("\n")}

PEPS PRODUCTS AVAILABLE (vendor: ${manufacturer}):
${products.map(p => `  id="${p.id}" name="${p.name}"${p.mg_size ? ` mg="${p.mg_size}"` : ""}`).join("\n")}

INSTRUCTIONS:
- Strip any date suffix from each code, then apply the batch code scheme to decode the base code.
- Also consider the Qiyunle item name (may be in Chinese or English) as a secondary signal.
- Match each decoded item to the best Peps product by compound name AND dose.
- Confidence: "high" = clear match, "medium" = probable, "low" = uncertain.
- Omit items you cannot confidently match rather than forcing wrong matches.
- Return ONLY valid JSON with no markdown fences.

OUTPUT FORMAT:
{
  "suggestions": [
    { "qiyunleCode": "...", "qiyunleGoodsId": <number or null>, "qiyunleName": "...", "productId": "...", "productName": "...", "confidence": "high|medium|low", "reasoning": "brief explanation" }
  ]
}`;

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
    });

    const raw = response.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { suggestions: unknown[] };
    // Attach the manufacturer to each suggestion so the frontend can persist it
    const suggestions = (parsed.suggestions ?? []).map((s: any) => ({ ...s, manufacturer }));
    res.json({ suggestions });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ error: msg });
  }
});

// ── Inventory modal toggle (admin) ─────────────────────────────────────────

// GET /api/admin/inventory/modal-enabled
router.get("/admin/inventory/modal-enabled", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const r = await db.execute(sql`SELECT value FROM site_config WHERE key = 'inventoryModalEnabled'`);
    const val = (r.rows?.[0] as any)?.value;
    res.json({ enabled: val === "true" });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// POST /api/admin/inventory/modal-enabled
router.post("/admin/inventory/modal-enabled", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { enabled } = req.body as { enabled: boolean };
  try {
    await db.execute(sql`
      INSERT INTO site_config (key, value) VALUES ('inventoryModalEnabled', ${enabled ? "true" : "false"})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
    res.json({ ok: true, enabled });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/admin/inventory/stock — admin view (always returns data regardless of toggle)
router.get("/admin/inventory/stock", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db.execute(sql`
      SELECT
        m.qiyunle_code,
        m.qiyunle_name,
        m.product_id,
        m.batch_stock,
        p.name  AS product_name,
        p.stock AS stock
      FROM qiyunle_mappings m
      LEFT JOIN products p ON p.id = m.product_id
      ORDER BY p.name, m.qiyunle_code
    `);
    const items = (rows.rows as any[]).map(r => ({
      qiyunleCode:  r.qiyunle_code,
      qiyunleName:  r.qiyunle_name,
      productId:    r.product_id,
      productName:  r.product_name ?? r.qiyunle_name,
      stock:        typeof r.stock === "number" ? r.stock : parseInt(r.stock ?? "0", 10) || 0,
      batchStock:   r.batch_stock != null ? (typeof r.batch_stock === "number" ? r.batch_stock : parseInt(r.batch_stock, 10)) : null,
    }));
    res.json({ items });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/admin/inventory/gb-comparison
// Returns every active group buy product with its live stock data and total ordered qty.
router.get("/admin/inventory/gb-comparison", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db.execute(sql`
      SELECT
        gb.id          AS gb_id,
        gb.name        AS gb_name,
        gb.status      AS gb_status,
        p.id           AS product_id,
        p.name         AS product_name,
        p.stock        AS total_stock,
        COUNT(DISTINCT m.id)                              AS mapping_count,
        COALESCE(SUM(oli.quantity::numeric), 0)           AS ordered_qty
      FROM group_buy_products gbp
      JOIN group_buys gb   ON gb.id  = gbp.group_buy_id
      JOIN products   p    ON p.id   = gbp.product_id
      LEFT JOIN qiyunle_mappings m ON m.product_id = p.id
      LEFT JOIN order_line_items oli ON oli.product_id = p.id
      LEFT JOIN orders o ON o.id = oli.order_id
                         AND o.group_buy_id = gb.id
                         AND o.status NOT IN ('Cancelled', 'Draft')
      WHERE gbp.active = true
      GROUP BY gb.id, gb.name, gb.status, p.id, p.name, p.stock
      ORDER BY gb.name, p.name
    `);
    const items = (rows.rows as any[]).map(r => ({
      gbId:         r.gb_id,
      gbName:       r.gb_name,
      gbStatus:     r.gb_status,
      productId:    r.product_id,
      productName:  r.product_name,
      stock:        r.total_stock != null ? (typeof r.total_stock === "number" ? r.total_stock : parseInt(r.total_stock, 10)) : null,
      mappingCount: parseInt(r.mapping_count ?? "0", 10),
      orderedQty:   parseFloat(r.ordered_qty ?? "0") || 0,
    }));
    res.json({ items });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// ── Public inventory stock endpoint (used by customer-facing modal) ─────────

// GET /api/inventory/uther-stock
// Returns stock levels for all mapped products when modal is enabled.
// If disabled, returns { enabled: false }.
router.get("/inventory/uther-stock", async (_req, res): Promise<void> => {
  try {
    // Check if the feature is enabled
    const cfgRow = await db.execute(sql`SELECT value FROM site_config WHERE key = 'inventoryModalEnabled'`);
    const enabled = (cfgRow.rows?.[0] as any)?.value === "true";
    if (!enabled) { res.json({ enabled: false, items: [] }); return; }

    // Join mappings → products to get name + stock
    const rows = await db.execute(sql`
      SELECT
        m.qiyunle_code,
        m.qiyunle_name,
        m.product_id,
        p.name  AS product_name,
        p.stock AS stock
      FROM qiyunle_mappings m
      LEFT JOIN products p ON p.id = m.product_id
      ORDER BY p.name
    `);

    const items = (rows.rows as any[]).map(r => ({
      qiyunleCode:  r.qiyunle_code,
      qiyunleName:  r.qiyunle_name,
      productId:    r.product_id,
      productName:  r.product_name ?? r.qiyunle_name,
      stock:        typeof r.stock === "number" ? r.stock : parseInt(r.stock ?? "0", 10) || 0,
    }));

    res.json({ enabled: true, items });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// GET /api/admin/qiyunle/turnover-log
// Returns all turnover events + per-product average turnaround
router.get("/admin/qiyunle/turnover-log", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = (await db.execute(sql`
      SELECT
        l.id,
        l.qiyunle_code,
        l.product_id,
        l.product_name,
        l.went_oos_at,
        l.restocked_at,
        l.turnaround_days,
        l.prev_stock,
        l.restocked_to,
        l.created_at
      FROM inventory_turnover_log l
      ORDER BY l.went_oos_at DESC
      LIMIT 500
    `)).rows as {
      id: number;
      qiyunle_code: string;
      product_id: string | null;
      product_name: string | null;
      went_oos_at: string;
      restocked_at: string | null;
      turnaround_days: string | null;
      prev_stock: number | null;
      restocked_to: number | null;
      created_at: string;
    }[];

    // Per-product averages (only completed events)
    const avgRows = (await db.execute(sql`
      SELECT
        product_id,
        product_name,
        COUNT(*) FILTER (WHERE restocked_at IS NOT NULL) AS completed_events,
        COUNT(*) FILTER (WHERE restocked_at IS NULL)    AS open_events,
        ROUND(AVG(turnaround_days) FILTER (WHERE restocked_at IS NOT NULL), 1) AS avg_days,
        ROUND(MIN(turnaround_days) FILTER (WHERE restocked_at IS NOT NULL), 1) AS min_days,
        ROUND(MAX(turnaround_days) FILTER (WHERE restocked_at IS NOT NULL), 1) AS max_days
      FROM inventory_turnover_log
      GROUP BY product_id, product_name
      ORDER BY avg_days DESC NULLS LAST
    `)).rows as {
      product_id: string | null;
      product_name: string | null;
      completed_events: string;
      open_events: string;
      avg_days: string | null;
      min_days: string | null;
      max_days: string | null;
    }[];

    res.json({ events: rows, averages: avgRows });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

// DELETE /api/admin/qiyunle/turnover-log/:id — remove a single log entry (for corrections)
router.delete("/admin/qiyunle/turnover-log/:id", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
    await db.execute(sql`DELETE FROM inventory_turnover_log WHERE id = ${id}`);
    res.json({ ok: true });
  } catch (e: unknown) {
    res.status(500).json({ error: String(e) });
  }
});

export default router;

