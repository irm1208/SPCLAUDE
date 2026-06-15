/**
 * Qiyunle inventory sync — fetches live stock from web3.qiyunle.com
 * and updates matched products in the Peps database.
 *
 * Auth strategy (priority order):
 *  1. Credential-based session — username + password stored in DB, auto-login
 *     refreshes the PHP session cookie automatically. No manual daily token updates.
 *  2. Share-token fallback — legacy ?token= param, still supported if no
 *     credentials are configured.
 */
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendAdminMessage } from "./telegram";
import { GoogleGenAI } from "./google-genai";
import { randomUUID } from "crypto";
import { registerScheduler } from "./scheduler-registry";

const QIYUNLE_BASE = "https://web3.qiyunle.com";
const SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
// Sessions last ~24 h on Qiyunle; we refresh every 20 h to stay ahead of expiry
const SESSION_TTL_MS = 20 * 60 * 60 * 1000;

export interface QiyunleItem {
  id: number;
  goods: number;
  warehouse: number;
  nums: string;
  goodsinfo: {
    id: number;
    name: string;
    code: string;
    spec: string;
    stocktip: string;
    number: string;
  };
}

// ─── Credential helpers ───────────────────────────────────────────────────────

export async function getQiyunleCredentials(): Promise<{ username: string; password: string } | null> {
  try {
    const result = await db.execute(sql`
      SELECT key, value FROM site_config
      WHERE key IN ('qiyunleUsername', 'qiyunlePassword')
    `);
    const rows = result.rows as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    if (map.qiyunleUsername && map.qiyunlePassword) {
      return { username: map.qiyunleUsername, password: map.qiyunlePassword };
    }
  } catch {}
  return null;
}

export async function saveQiyunleCredentials(username: string, password: string): Promise<void> {
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunleUsername', ${username})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunlePassword', ${password})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  // Clear any cached session so we re-login with new creds
  await db.execute(sql`
    DELETE FROM site_config WHERE key IN ('qiyunleSession', 'qiyunleBaseUrl', 'qiyunleSessionAt')
  `).catch(() => {});
}

export async function clearQiyunleCredentials(): Promise<void> {
  await db.execute(sql`
    DELETE FROM site_config
    WHERE key IN ('qiyunleUsername','qiyunlePassword','qiyunleSession','qiyunleBaseUrl','qiyunleSessionAt')
  `).catch(() => {});
}

// ─── Session helpers ──────────────────────────────────────────────────────────

interface StoredSession {
  cookie: string;
  baseUrl: string;
  savedAt: number;
}

async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const result = await db.execute(sql`
      SELECT key, value FROM site_config
      WHERE key IN ('qiyunleSession', 'qiyunleBaseUrl', 'qiyunleSessionAt')
    `);
    const rows = result.rows as { key: string; value: string }[];
    const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
    // Require session + a timestamp; no time-based expiry — we use the session
    // until Qiyunle's server rejects it (AUTH_EXPIRED), then re-login on demand.
    if (!map.qiyunleSession || !map.qiyunleBaseUrl || !map.qiyunleSessionAt) return null;
    const savedAt = parseInt(map.qiyunleSessionAt, 10);
    if (isNaN(savedAt)) return null;
    return { cookie: map.qiyunleSession, baseUrl: map.qiyunleBaseUrl, savedAt };
  } catch {}
  return null;
}

async function storeSession(cookie: string, baseUrl: string): Promise<void> {
  const now = String(Date.now());
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunleSession', ${cookie})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunleBaseUrl', ${baseUrl})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunleSessionAt', ${now})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Extract name=value pairs from an array of raw Set-Cookie header strings and
 * build a single Cookie header value (e.g. "PHPSESSID=abc; Nod_User_Token=xyz").
 *
 * The check_user endpoint sets several cookies that are ALL required for API
 * access: PHPSESSID, Nod_User_Token, adm_name, Nod_User_Id, etc.
 */
function buildCookieHeader(setCookieHeaders: string[]): string {
  const pairs = new Map<string, string>();
  for (const header of setCookieHeaders) {
    // Each header may be a comma-separated list of set-cookie directives
    // Split on the outermost comma-before-cookie-name pattern
    const directives = header.split(/,\s*(?=[A-Za-z_][A-Za-z0-9_]+=)/);
    for (const directive of directives) {
      const nameValue = directive.trim().split(";")[0].trim();
      const eqIdx = nameValue.indexOf("=");
      if (eqIdx > 0) {
        const name  = nameValue.slice(0, eqIdx).trim();
        const value = nameValue.slice(eqIdx + 1).trim();
        // Skip tracking/infra cookies that aren't needed for auth
        if (!name.startsWith("__jsl")) pairs.set(name, value);
      }
    }
  }
  return [...pairs.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

export async function loginToQiyunle(
  username: string,
  password: string
): Promise<{ cookie: string; baseUrl: string }> {
  // The check_user endpoint validates credentials AND sets all auth cookies in
  // a single response: PHPSESSID, Nod_User_Token, adm_name, Nod_User_Id, etc.
  // No further login steps (openLogin.html) are needed.
  const checkRes = await fetch(`${QIYUNLE_BASE}/index/index/check_user`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: new URLSearchParams({ user: username, pwd: password, rememberpassword: "1" }).toString(),
    signal: AbortSignal.timeout(15000),
    redirect: "follow",
  });

  const text = await checkRes.text();
  let parsed: { state?: string; info?: string } = {};
  try { parsed = JSON.parse(text); } catch { /* non-JSON response */ }

  if (parsed.state !== "success") {
    throw new Error(parsed.info ?? "Login failed — check your Qiyunle username and password");
  }

  // Collect all Set-Cookie headers from the login response
  const rawCookies: string[] = [];
  const rawHeader = checkRes.headers.get("set-cookie");
  if (rawHeader) rawCookies.push(rawHeader);
  // In some Node.js environments, getSetCookie() returns individual headers
  if (typeof (checkRes.headers as any).getSetCookie === "function") {
    rawCookies.push(...(checkRes.headers as any).getSetCookie());
  }

  const cookie = buildCookieHeader(rawCookies);
  if (!cookie) {
    throw new Error("Login succeeded but no auth cookies were returned — verify credentials");
  }

  console.log(`[qiyunle-login] Captured cookies: ${cookie.replace(/Token=[^;]+/, "Token=***")}`);

  return { cookie, baseUrl: QIYUNLE_BASE };
}

export async function getOrRefreshSession(): Promise<{ cookie: string; baseUrl: string } | null> {
  const stored = await getStoredSession();
  if (stored) return { cookie: stored.cookie, baseUrl: stored.baseUrl };

  const creds = await getQiyunleCredentials();
  if (!creds) return null;

  const session = await loginToQiyunle(creds.username, creds.password);
  await storeSession(session.cookie, session.baseUrl);
  return session;
}

// ─── Legacy token helper ──────────────────────────────────────────────────────

export async function getQiyunleToken(): Promise<string | null> {
  try {
    const result = await db.execute(sql`SELECT value FROM site_config WHERE key = 'qiyunleToken'`);
    const row = result.rows?.[0] as { value: string } | undefined;
    if (row?.value) return row.value;
  } catch {}
  return process.env.QIYUNLE_TOKEN || null;
}

// ─── Inventory fetch ──────────────────────────────────────────────────────────

async function fetchInventoryPage(
  baseUrl: string,
  authHeaders: Record<string, string>,
  page: number,
  limit: number
): Promise<{ data: QiyunleItem[]; count: number; code: number; msg: string }> {
  const body = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    showzero: "0", // 0 = show all products; 1 = only non-zero stock (hides OOS items)
    wpd: "0",
    name: "",
    class: "",
    spec: "",
    number: "",
    code: "",
    batch: "",
    data: "",
    attrStr: "",
    order: "",
    orderType: "",
  });

  const res = await fetch(`${baseUrl}/index/room/lists?isLb=1`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeaders,
    },
    body: body.toString(),
    signal: AbortSignal.timeout(20000),
  });

  if (res.status === 401 || res.status === 403) throw new Error("AUTH_EXPIRED");
  if (!res.ok) throw new Error(`Qiyunle API HTTP ${res.status}`);

  // If the server returned an HTML page (e.g. login redirect), the session
  // cookie is invalid — trigger a fresh login rather than crashing on JSON parse.
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/html")) throw new Error("AUTH_EXPIRED");

  return res.json() as Promise<{ data: QiyunleItem[]; count: number; code: number; msg: string }>;
}

async function fetchAllInventoryWithSession(cookie: string, baseUrl: string): Promise<QiyunleItem[]> {
  const items: QiyunleItem[] = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const data = await fetchInventoryPage(baseUrl, { Cookie: cookie }, page, limit);

    if (data.code !== 0) {
      const rawMsg = data.msg != null ? String(data.msg) : `code ${data.code}`;
      const lowerMsg = rawMsg.toLowerCase();
      // Detect auth/session expiry — Qiyunle may respond in English or Chinese
      const isAuthErr = lowerMsg.includes("login") || lowerMsg.includes("token")
        || rawMsg.includes("登录") || rawMsg.includes("请先") || rawMsg.includes("session")
        || data.code === 401 || data.code === 403 || data.code === -1;
      if (isAuthErr) throw new Error("AUTH_EXPIRED");
      throw new Error(`Qiyunle API error: ${rawMsg}`);
    }

    const pageItems = data.data ?? [];
    items.push(...pageItems);
    if (items.length >= data.count || pageItems.length < limit) break;
    page++;
  }

  return items;
}

export async function fetchAllInventory(token: string): Promise<QiyunleItem[]> {
  const items: QiyunleItem[] = [];
  let page = 1;
  const limit = 50;

  while (true) {
    const body = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      showzero: "0", // 0 = show all products; 1 = only non-zero stock (hides OOS items)
      wpd: "0",
      name: "",
      class: "",
      spec: "",
      number: "",
      code: "",
      batch: "",
      data: "",
      attrStr: "",
      order: "",
      orderType: "",
    });

    const res = await fetch(`${QIYUNLE_BASE}/index/room/lists?token=${token}&isLb=1`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
      signal: AbortSignal.timeout(20000),
    });

    if (res.status === 401 || res.status === 403) throw new Error("TOKEN_EXPIRED");
    if (!res.ok) throw new Error(`Qiyunle API HTTP ${res.status}`);

    const data = await res.json() as { code: number; msg: string; count: number; data: QiyunleItem[] };

    if (data.code !== 0) {
      const rawMsg = data.msg != null ? String(data.msg) : `code ${data.code}`;
      if (rawMsg.toLowerCase().includes("login") || rawMsg.toLowerCase().includes("token")) {
        throw new Error("TOKEN_EXPIRED");
      }
      throw new Error(`Qiyunle API error: ${rawMsg}`);
    }

    const pageItems = data.data ?? [];
    items.push(...pageItems);
    if (items.length >= data.count || pageItems.length < limit) break;
    page++;
  }

  return items;
}

// ─── Inventory items (no DB write) ───────────────────────────────────────────

export async function fetchInventoryItems(): Promise<QiyunleItem[]> {
  return getInventoryItems(true);
}

// ─── Sync core ────────────────────────────────────────────────────────────────

/**
 * @param allowRelogin  true  = re-login automatically if session is rejected
 *                             and stored credentials are available.
 *                      false = fail with AUTH_EXPIRED immediately (e.g. for
 *                             callers that handle re-auth themselves).
 */
async function getInventoryItems(allowRelogin = false): Promise<QiyunleItem[]> {
  const session = await getOrRefreshSession();
  if (session) {
    try {
      return await fetchAllInventoryWithSession(session.cookie, session.baseUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg === "AUTH_EXPIRED") {
        // Always clear the stale session
        await db.execute(sql`
          DELETE FROM site_config WHERE key IN ('qiyunleSession','qiyunleBaseUrl','qiyunleSessionAt')
        `).catch(() => {});

        if (allowRelogin) {
          // Re-login once with stored credentials and retry
          const creds = await getQiyunleCredentials();
          if (creds) {
            const fresh = await loginToQiyunle(creds.username, creds.password);
            await storeSession(fresh.cookie, fresh.baseUrl);
            return await fetchAllInventoryWithSession(fresh.cookie, fresh.baseUrl);
          }
        }
        // No credentials available — surface the error so admin is notified
      }
      throw e;
    }
  }

  const token = await getQiyunleToken();
  if (!token) throw new Error("No Qiyunle credentials or token configured");
  return await fetchAllInventory(token);
}

// ─── Auto-mapping (high-confidence AI batch matching) ─────────────────────────

interface AutoMapResult {
  qiyunleCode: string;
  qiyunleGoodsId: number | null;
  qiyunleName: string;
  productId: string;
  productName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

/**
 * Calls Gemini AI to match unmapped Qiyunle batch items to Peps products.
 * Only inserts mappings where confidence === "high".
 * Returns the list of auto-mapped entries.
 */
async function autoMapHighConfidence(unmapped: QiyunleItem[]): Promise<AutoMapResult[]> {
  if (!unmapped.length) return [];

  const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("[qiyunle-automap] No Gemini API key — skipping auto-map");
    return [];
  }

  const productsResult = await db.execute(sql`
    SELECT id, name, mg_size, category, vendor FROM products
    WHERE active = true AND source_group_buy_id IS NULL
    ORDER BY name ASC
  `);
  const products = productsResult.rows as { id: string; name: string; mg_size: string | null; category: string | null; vendor: string | null }[];
  if (!products.length) return [];

  const items = unmapped.map(i => ({
    code: i.goodsinfo?.code ?? "",
    goodsId: i.goodsinfo?.id ?? null,
    name: i.goodsinfo?.name ?? "",
  })).filter(i => i.code);

  const prompt = `You are matching Qiyunle ERP inventory batch codes to peptide products in a group-buy store.

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
Batch codes often have a date suffix after a hyphen, e.g. "BP10-0429" = base "BP10" with batch date 04/29.
Always strip any "-MMDD" or "-MMDDYY" suffix before interpreting the base code.
Examples: MT110-0429 → MT110 = Melanotan 1 10mg | TE20-0429 → TE20 = Tesamorelin 20mg

DOSE RULE:
Numbers after the abbreviation = mg dose (e.g. BP10 = BPC-157 10mg, ZE60 = Tirzepatide 60mg).
For combos: T/B1010 = BPC-157 10mg / TB-500 10mg.

QIYUNLE ITEMS TO MATCH (unmapped):
${items.map(i => `  code="${i.code}" goodsId=${i.goodsId ?? "?"} name="${i.name}"`).join("\n")}

PEPS PRODUCTS AVAILABLE:
${products.map(p => `  id="${p.id}" name="${p.name}"${p.mg_size ? ` mg="${p.mg_size}"` : ""}${p.vendor ? ` vendor="${p.vendor}"` : ""}`).join("\n")}

INSTRUCTIONS:
- Strip any date suffix, then decode the base code using the scheme above.
- Also use the Qiyunle item name (may be Chinese or English) as a secondary signal.
- Match each item to the best Peps product by compound name AND dose.
- confidence "high" = unambiguous match (clear code decode + exact product match).
- confidence "medium" = probable. confidence "low" = uncertain.
- Omit items you cannot confidently decode rather than guessing.
- Return ONLY valid JSON, no markdown fences.

OUTPUT FORMAT:
{
  "suggestions": [
    { "qiyunleCode": "...", "qiyunleGoodsId": <number or null>, "qiyunleName": "...", "productId": "...", "productName": "...", "confidence": "high|medium|low", "reasoning": "brief" }
  ]
}`;

  try {
    const gemini = new GoogleGenAI({
      apiKey,
      httpOptions: { apiVersion: "", baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL },
    });

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { temperature: 0.1, thinkingConfig: { thinkingBudget: 0 } },
    });

    const raw = response.text ?? "";
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(cleaned) as { suggestions: AutoMapResult[] };
    const highConfidence = (parsed.suggestions ?? []).filter(s => s.confidence === "high");

    // Get already-mapped codes to avoid duplicate inserts
    const mappedResult = await db.execute(sql`SELECT qiyunle_code FROM qiyunle_mappings`);
    const mappedCodes = new Set((mappedResult.rows as { qiyunle_code: string }[]).map(r => r.qiyunle_code));

    const inserted: AutoMapResult[] = [];
    for (const s of highConfidence) {
      if (!s.qiyunleCode || !s.productId || mappedCodes.has(s.qiyunleCode)) continue;
      try {
        await db.execute(sql`
          INSERT INTO qiyunle_mappings (id, product_id, qiyunle_code, qiyunle_goods_id, qiyunle_name, manufacturer)
          VALUES (
            ${randomUUID()},
            ${s.productId},
            ${s.qiyunleCode},
            ${s.qiyunleGoodsId ?? null},
            ${s.qiyunleName ?? null},
            'Uther'
          )
          ON CONFLICT (qiyunle_code) DO NOTHING
        `);
        mappedCodes.add(s.qiyunleCode);
        inserted.push(s);
        console.log(`[qiyunle-automap] ✓ ${s.qiyunleCode} → ${s.productName} (${s.reasoning})`);
      } catch (e) {
        console.warn(`[qiyunle-automap] Failed to insert mapping for ${s.qiyunleCode}:`, e);
      }
    }

    console.log(`[qiyunle-automap] ${inserted.length} high-confidence mappings applied (${highConfidence.length - inserted.length} skipped/conflict)`);
    return inserted;
  } catch (e) {
    console.warn("[qiyunle-automap] Error during auto-mapping:", e instanceof Error ? e.message : String(e));
    return [];
  }
}

export async function runQiyunleSync(allowRelogin = false): Promise<{ updated: number; skipped: number; autoMapped: number; autoMappedItems: AutoMapResult[]; remainingUnmapped: { code: string; name: string }[]; errors: string[]; items: QiyunleItem[] }> {
  const items = await getInventoryItems(allowRelogin);

  const mappingResult = await db.execute(sql`
    SELECT m.product_id, m.qiyunle_code, m.qiyunle_name, m.batch_stock AS current_batch_stock, p.name AS product_name
    FROM qiyunle_mappings m
    LEFT JOIN products p ON p.id = m.product_id
  `);
  const mappings = mappingResult.rows as { product_id: string; qiyunle_code: string; qiyunle_name: string | null; current_batch_stock: number | null; product_name: string | null }[];
  const codeToMapping = new Map(mappings.map(m => [m.qiyunle_code, m]));

  let updated = 0;
  let skipped = 0;
  let autoMapped = 0;
  let autoMappedItems: AutoMapResult[] = [];
  const errors: string[] = [];

  const productStockMap = new Map<string, number>();
  const batchStockMap   = new Map<string, number>();

  // Collect unmapped items so we can auto-map them after the main sync loop
  const unmappedItems: QiyunleItem[] = [];

  for (const item of items) {
    const code = item.goodsinfo?.code;
    if (!code) continue;
    const mapping = codeToMapping.get(code);
    if (!mapping) { skipped++; unmappedItems.push(item); continue; }
    const stock = parseInt(item.nums, 10);
    if (isNaN(stock)) { errors.push(`${code}: invalid stock value "${item.nums}"`); continue; }
    productStockMap.set(mapping.product_id, (productStockMap.get(mapping.product_id) ?? 0) + stock);
    batchStockMap.set(code, stock);
  }

  // Auto-map high-confidence unmapped items via Gemini AI
  const autoMappedCodes = new Set<string>();
  if (unmappedItems.length > 0) {
    const newMappings = await autoMapHighConfidence(unmappedItems);
    autoMapped = newMappings.length;
    autoMappedItems = newMappings;

    // Apply stock updates for newly mapped items
    for (const mapping of newMappings) {
      autoMappedCodes.add(mapping.qiyunleCode);
      const item = unmappedItems.find(i => i.goodsinfo?.code === mapping.qiyunleCode);
      if (!item) continue;
      const stock = parseInt(item.nums, 10);
      if (isNaN(stock)) continue;
      productStockMap.set(mapping.productId, (productStockMap.get(mapping.productId) ?? 0) + stock);
      batchStockMap.set(mapping.qiyunleCode, stock);
      skipped = Math.max(0, skipped - 1);
    }
  }

  // Build the list of items still unmapped after auto-mapping
  const remainingUnmapped = unmappedItems
    .filter(i => i.goodsinfo?.code && !autoMappedCodes.has(i.goodsinfo.code))
    .map(i => ({ code: i.goodsinfo!.code!, name: i.goodsinfo?.name ?? "" }));

  for (const [productId, totalStock] of productStockMap) {
    try {
      await db.execute(sql`UPDATE products SET stock = ${totalStock} WHERE id = ${productId}`);
      updated++;
    } catch (e: unknown) {
      errors.push(`${productId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Turnover tracking: detect OOS → restocked and in-stock → OOS transitions
  const syncTime = new Date();
  for (const [code, newStock] of batchStockMap) {
    const mapping = codeToMapping.get(code);
    if (!mapping) continue;
    const prevStock = mapping.current_batch_stock ?? null;

    if ((prevStock === null || prevStock > 0) && newStock === 0) {
      // Went out of stock — open a new turnover record
      await db.execute(sql`
        INSERT INTO inventory_turnover_log (qiyunle_code, product_id, product_name, went_oos_at, prev_stock)
        VALUES (${code}, ${mapping.product_id}, ${mapping.product_name ?? mapping.qiyunle_name ?? null}, ${syncTime.toISOString()}, ${prevStock ?? null})
      `).catch(() => {});
    } else if ((prevStock === null || prevStock === 0) && newStock > 0) {
      // Back in stock — close the most recent open record for this code
      const openRow = await db.execute(sql`
        SELECT id, went_oos_at FROM inventory_turnover_log
        WHERE qiyunle_code = ${code} AND restocked_at IS NULL
        ORDER BY went_oos_at DESC LIMIT 1
      `).catch(() => ({ rows: [] }));
      const row = (openRow as { rows: { id: number; went_oos_at: string }[] }).rows[0];
      if (row) {
        const wentOosAt = new Date(row.went_oos_at);
        const turnaroundDays = (syncTime.getTime() - wentOosAt.getTime()) / (1000 * 60 * 60 * 24);
        await db.execute(sql`
          UPDATE inventory_turnover_log
          SET restocked_at = ${syncTime.toISOString()},
              turnaround_days = ${turnaroundDays.toFixed(2)},
              restocked_to = ${newStock}
          WHERE id = ${row.id}
        `).catch(() => {});
      }
    }
  }

  for (const [code, batchStock] of batchStockMap) {
    await db.execute(sql`
      UPDATE qiyunle_mappings SET batch_stock = ${batchStock} WHERE qiyunle_code = ${code}
    `).catch(() => {});
  }

  const now = new Date().toISOString();
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunleLastSync', ${now})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  await db.execute(sql`
    INSERT INTO site_config (key, value) VALUES ('qiyunleLastSyncCount', ${String(updated)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `);
  if (errors.length > 0) {
    await db.execute(sql`
      INSERT INTO site_config (key, value) VALUES ('qiyunleLastError', ${errors.join("; ")})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
    `);
  } else {
    await db.execute(sql`DELETE FROM site_config WHERE key = 'qiyunleLastError'`);
  }
  await db.execute(sql`
    DELETE FROM site_config WHERE key = 'qiyunleTokenExpiredNotified'
  `).catch(() => {});

  return { updated, skipped, autoMapped, autoMappedItems, remainingUnmapped, errors, items };
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

export function startQiyunleSync(): void {
  const run = async () => {
    const hasCreds = !!(await getQiyunleCredentials());
    const hasToken = !!(await getQiyunleToken());
    if (!hasCreds && !hasToken) return;

    // Guard against multiple Autoscale instances all running the scheduler
    // independently. If another instance already ran a sync recently (within
    // 80% of the configured interval), skip this run entirely.
    try {
      const lastSyncRow = await db.execute(sql`SELECT value FROM site_config WHERE key = 'qiyunleLastSync'`);
      const lastSyncAt = (lastSyncRow.rows?.[0] as { value?: string } | undefined)?.value;
      if (lastSyncAt) {
        const elapsed = Date.now() - new Date(lastSyncAt).getTime();
        if (elapsed < SYNC_INTERVAL_MS * 0.8) {
          console.log(`[qiyunle-sync] Skipping — last sync was ${Math.round(elapsed / 60_000)} min ago (threshold ${Math.round(SYNC_INTERVAL_MS * 0.8 / 60_000)} min)`);
          return;
        }
      }
    } catch { /* non-fatal — proceed with sync if check fails */ }

    try {
      // allowRelogin=true: if the session cookie has expired, re-login automatically
      // with stored credentials and carry on — no manual intervention needed.
      const result = await runQiyunleSync(true);
      console.log(`[qiyunle-sync] Done — ${result.updated} updated, ${result.skipped} unmapped${result.autoMapped ? `, ${result.autoMapped} auto-mapped` : ""}${result.errors.length ? `, ${result.errors.length} errors` : ""}`);

      // Build sync summary notification
      const now = new Date().toLocaleString("en-GB", { timeZone: "Europe/London", hour12: false });
      const errorLine = result.errors.length ? `\n⚠️ <b>Errors:</b> ${result.errors.length}` : "";
      const syncMsg = `✅ <b>Inventory sync complete</b> — ${now}\n\n📦 <b>Updated:</b> ${result.updated} product(s)\n🔍 <b>Unmapped:</b> ${result.skipped} batch(es)${result.autoMapped ? `\n🤖 <b>Auto-mapped:</b> ${result.autoMapped} batch(es)` : ""}${errorLine}`;
      await sendAdminMessage(syncMsg).catch(() => {});

      // If any batches were auto-mapped, send a separate detailed notification
      if (result.autoMappedItems && result.autoMappedItems.length > 0) {
        const lines = result.autoMappedItems.map(m => `  • <code>${m.qiyunleCode}</code> → ${m.productName}`).join("\n");
        const mapMsg = `🤖 <b>Auto-mapped batches</b>\n\nThe following new batch codes were automatically matched to products:\n\n${lines}\n\n<i>These mappings were applied with high confidence. Review them in Admin → Inventory Sync if needed.</i>`;
        await sendAdminMessage(mapMsg).catch(() => {});
      }

      // Notify about NEW unmapped batch codes (not seen in the previous sync)
      if (result.remainingUnmapped.length > 0) {
        const prevRaw = await db.execute(sql`SELECT value FROM site_config WHERE key = 'qiyunleKnownUnmapped'`)
          .then((r: { rows?: unknown[] }) => (r.rows?.[0] as { value?: string } | undefined)?.value ?? "[]")
          .catch(() => "[]");
        let prevCodes: string[] = [];
        try { prevCodes = JSON.parse(prevRaw) as string[]; } catch { prevCodes = []; }
        const prevSet = new Set(prevCodes);
        const newCodes = result.remainingUnmapped.filter(u => !prevSet.has(u.code));
        if (newCodes.length > 0) {
          const lines = newCodes.map(u => `  • <code>${u.code}</code>${u.name ? ` — ${u.name}` : ""}`).join("\n");
          const unmapMsg = `🔍 <b>New unmapped batches</b>\n\n${newCodes.length} batch code(s) appeared in inventory that couldn't be auto-matched:\n\n${lines}\n\n<i>Go to Admin → Inventory Sync to map them manually.</i>`;
          await sendAdminMessage(unmapMsg).catch(() => {});
        }
        // Update the known unmapped set to the current full set
        const currentCodes = result.remainingUnmapped.map(u => u.code);
        await db.execute(sql`
          INSERT INTO site_config (key, value) VALUES ('qiyunleKnownUnmapped', ${JSON.stringify(currentCodes)})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        `).catch(() => {});
      } else {
        // All batches are now mapped — clear the known unmapped store
        await db.execute(sql`DELETE FROM site_config WHERE key = 'qiyunleKnownUnmapped'`).catch(() => {});
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isAuthErr = msg === "TOKEN_EXPIRED" || msg === "AUTH_EXPIRED";
      console.warn(`[qiyunle-sync] ${isAuthErr ? "Session expired" : "Error"}: ${msg}`);

      const errorLabel = msg === "AUTH_EXPIRED"
        ? "Session expired and no credentials saved — go to Admin → Inventory Sync and set credentials to resume auto-sync"
        : msg;

      await db.execute(sql`
        INSERT INTO site_config (key, value) VALUES ('qiyunleLastError', ${errorLabel})
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `).catch(() => {});

      if (isAuthErr) {
        const alreadyNotified = await db.execute(sql`
          SELECT value FROM site_config WHERE key = 'qiyunleTokenExpiredNotified'
        `).then((r: { rows?: unknown[] }) => !!(r.rows?.[0] as { value?: unknown })?.value).catch(() => false);

        if (!alreadyNotified) {
          const notifyMsg = msg === "AUTH_EXPIRED"
            ? "⚠️ <b>Qiyunle session expired (no credentials)</b>\n\nThe automatic inventory sync could not re-login because no credentials are saved.\n\nPlease go to <b>Admin → Inventory Sync</b> and set your Qiyunle username and password. Once saved, the sync will re-login automatically."
            : "⚠️ <b>Qiyunle token expired</b>\n\nThe inventory sync could not connect to Qiyunle — your share token is no longer valid.\n\nPlease go to <b>Admin → Inventory Sync</b> and update your credentials or token.";
          await sendAdminMessage(notifyMsg).catch(() => {});
          await db.execute(sql`
            INSERT INTO site_config (key, value) VALUES ('qiyunleTokenExpiredNotified', 'true')
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
          `).catch(() => {});
        }
      }
    }
  };

  registerScheduler({
    name: "qiyunle-sync",
    label: "Qiyunle inventory sync",
    description: "Pulls live stock from Qiyunle and updates matched products.",
    defaultIntervalMs: SYNC_INTERVAL_MS,
    minIntervalMs: 5 * 60 * 1000,
    maxIntervalMs: 24 * 60 * 60 * 1000,
    initialDelayMs: 30_000,
    run,
  });
}
