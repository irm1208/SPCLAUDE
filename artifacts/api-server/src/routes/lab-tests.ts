import { Router } from "express";
import multer from "multer";
import { db, labTestsTable } from "@workspace/db";
import { eq, or, desc, sql, and, isNull, asc, isNotNull } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import type { NewLabTest } from "@workspace/db";
import {
  extractCoADataFromAnyUrl,
  extractCoADataFromBuffer,
  isAdminBulkImportUrl,
  isBulkImportAllowedUrl,
  resolvePreviewInfo,
  downloadLabFile,
  batchJob,
  resetBatchJob,
  bulkImportJob,
  resetBulkImportJob,
  isUzorakUrl,
  resolveUzorakPreviewType,
  resolveUzorakPreviewBytes,
} from "../lib/gemini-lab-extract";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["application/pdf", "image/jpeg", "image/png", "image/webp"].includes(file.mimetype);
    cb(null, ok);
  },
});

const router = Router();

// ── Duplicate detection helper ────────────────────────────────────────────────
// Returns the existing record id if a duplicate is found, null otherwise.
// Matches on: (1) identical URL, OR (2) same batch code + test date + peptide name.
async function findLabTestDuplicate(
  url: string | null | undefined,
  batchCode: string | null | undefined,
  testDate: string | null | undefined,
  peptideName: string | null | undefined,
): Promise<number | null> {
  const conditions: ReturnType<typeof eq>[] = [];

  const trimmedUrl = url?.trim();
  if (trimmedUrl) {
    conditions.push(eq(labTestsTable.url, trimmedUrl));
  }

  const trimmedBatch = batchCode?.trim();
  const trimmedDate = testDate?.trim();
  const trimmedName = peptideName?.trim();
  if (trimmedBatch && trimmedDate && trimmedName) {
    conditions.push(
      and(
        isNotNull(labTestsTable.batchCode),
        eq(labTestsTable.batchCode, trimmedBatch),
        isNotNull(labTestsTable.testDate),
        eq(labTestsTable.testDate, trimmedDate),
        eq(labTestsTable.peptideName, trimmedName),
      ) as ReturnType<typeof eq>,
    );
  }

  if (conditions.length === 0) return null;

  const [found] = await db
    .select({ id: labTestsTable.id })
    .from(labTestsTable)
    .where(or(...conditions))
    .limit(1);

  return found?.id ?? null;
}

export const LAB_NAMES = ["Janoshik", "Uzorak", "Peptidetest", "Testides", "Chromate", "Analiza Bialek"] as const;
export const TEST_TYPES = ["mass_purity", "mass", "endotoxin", "sterility", "heavy_metals", "lcms"] as const;
export const PRODUCT_CATEGORIES = ["peptide", "pill", "aas", "other"] as const;

// ── Uther batch-code → canonical product name lookup ─────────────────────────
// The batch code (e.g. KLO80) determines the correct product title for Uther
// vials. The tested mass from the CoA is displayed separately and must NOT be
// embedded in the product name.
export const UTHER_BATCH_CODES: Record<string, string> = {
  "OZ5":    "Semaglutide - 5mg",
  "OZ10":   "Semaglutide - 10mg",
  "OZ20":   "Semaglutide - 20mg",
  "ZE10":   "Tirzepatide 10mg",
  "ZE20":   "Tirzepatide 20mg",
  "ZE30":   "Tirzepatide 30mg",
  "ZE45":   "Tirzepatide 45mg",
  "ZE60":   "Tirzepatide 60mg",
  "ZE100":  "Tirzepatide 100mg",
  "RE10":   "Retatrutide 10mg",
  "RE20":   "Retatrutide 20mg",
  "RE30":   "Retatrutide 30mg",
  "RE40":   "Retatrutide 40mg",
  "RE50":   "Retatrutide 50mg",
  "CAG5":   "Cagrilintide 5mg",
  "CAG10":  "Cagrilintide 10mg",
  "51Q50":  "5-Amino-1MQ 50mg",
  "51Q10":  "5-Amino-1MQ 10mg",
  "T/B55":  "BPC 5mg/TB4 5mg blend",
  "T/B1010":"BPC 10mg/TB4 10mg blend",
  "BP10":   "BPC 157 - 10mg",
  "BP20":   "BPC 157 - 20mg",
  "TB10":   "TB500 TB4 - 10mg",
  "TB20":   "TB500 TB4 - 20mg",
  "TBF10":  "TB500 Frag 10mg",
  "KLO80":  "KLOW",
  "GLO80":  "GLOW",
  "HK100":  "GHK-CU - 100mg",
  "HK50":   "GHK-CU - 50mg",
  "KP10":   "KPV - 10mg",
  "KP30":   "KPV - 30mg",
  "SS10":   "SS-31 - 10mg",
  "SS30":   "SS-31 - 30mg",
  "SS50":   "SS-31 - 50mg",
  "MO20":   "MOTS-C - 20mg",
  "MO10":   "MOTS-C - 10mg",
  "PE10":   "PE-22-28 - 10mg",
  "NASX10": "NA Semax 10mg",
  "NASX50": "NA Semax 50mg",
  "NASK50": "NA Selank 50mg",
  "NASK10": "NA Selank 10mg",
  "SK10":   "Selank - 10mg",
  "SX10":   "Semax - 10mg",
  "MT1":    "Melanotan I 10mg",
  "MT2":    "Melanotan II 10mg",
  "TA110":  "Thymosin Alpha-1 10mg",
  "CJND":   "CJC no dac/ipa 5/5mg",
  "TE10":   "Tesamorelin 10mg",
  "TE20":   "Tesamorelin 20mg",
  "H10":    "HGH 10iu",
  "PT10":   "Pt141 - 10mg",
  "SN10":   "Snap-8 - 10mg",
  "VIP":    "VIP - 10mg",
  "NA500":  "NAD+ 500mg",
  "FOX10":  "Fox04 - 10mg",
  "EP10":   "Epitalon - 10mg",
  "EP50":   "Epitalon - 50mg",
  "AR16":   "Ara-290 - 16mg",
  "DS5":    "DSIP - 5mg",
  "DS10":   "DSIP - 10mg",
};

/**
 * Resolves the canonical peptide name for a lab test.
 * For Uther products with a known batch code, always use the lookup table name
 * rather than whatever was AI-extracted.
 */
function resolveUtherName(supplier: string, batchCode: string | null | undefined, fallback: string): string {
  if (supplier.toLowerCase() === "uther" && batchCode) {
    const canonical = UTHER_BATCH_CODES[batchCode.trim().toUpperCase()];
    if (canonical) return canonical;
  }
  return fallback;
}

// ── Image/PDF fetching is handled by gemini-lab-extract lib ──────────────────
// fetchJanoshikImagesLib, resolvePreviewInfo, downloadLabFile are imported above.

// ── GET /api/lab-tests — list / search (public — excludes pending) ────────────
router.get("/lab-tests", async (req, res) => {
  try {
    const {
      q, peptide, supplier, labName, testType, productCategory,
      isThirdParty, mgAmount: mgAmountStr, limit: limitStr, offset: offsetStr
    } = req.query;

    const limit = Math.min(parseInt(String(limitStr ?? "100"), 10) || 100, 1000);
    const offset = parseInt(String(offsetStr ?? "0"), 10) || 0;

    const conditions: SQL<unknown>[] = [eq(labTestsTable.pending, false)];

    // Text search
    if (q && typeof q === "string" && q.trim()) {
      const norm = q.trim().replace(/[^a-z0-9]/gi, "").toLowerCase();
      conditions.push(or(
        sql`regexp_replace(lower(${labTestsTable.peptideName}), '[^a-z0-9]', '', 'g') like ${'%' + norm + '%'}`,
        sql`regexp_replace(lower(coalesce(${labTestsTable.batchCode}, '')), '[^a-z0-9]', '', 'g') like ${'%' + norm + '%'}`,
      ) as SQL<unknown>);
    } else if (peptide && typeof peptide === "string" && peptide.trim()) {
      const normPeptide = peptide.trim().replace(/[^a-z0-9]/gi, "").toLowerCase();
      conditions.push(or(
        // lab test name is a prefix of the product name (e.g. lab="Tirzepatide", product="Tirzepatide 10mg")
        sql`${normPeptide} like regexp_replace(lower(${labTestsTable.peptideName}), '[^a-z0-9]', '', 'g') || '%'`,
        // product name is a prefix of the lab test name (e.g. product="Tirzepatide", lab="Tirzepatide 10mg")
        sql`regexp_replace(lower(${labTestsTable.peptideName}), '[^a-z0-9]', '', 'g') like ${normPeptide + "%"}`,
      ) as SQL<unknown>);
    }

    if (supplier && typeof supplier === "string" && supplier.trim()) {
      conditions.push(sql`lower(${labTestsTable.supplier}) = lower(${supplier.trim()})`);
    }

    if (labName && typeof labName === "string" && labName.trim()) {
      conditions.push(sql`lower(${labTestsTable.labName}) = lower(${labName.trim()})`);
    }

    if (testType && typeof testType === "string" && testType.trim()) {
      conditions.push(eq(labTestsTable.testType, testType.trim()));
    }

    if (productCategory && typeof productCategory === "string" && productCategory.trim()) {
      conditions.push(eq(labTestsTable.productCategory, productCategory.trim()));
    }

    if (isThirdParty === "true") {
      conditions.push(eq(labTestsTable.isThirdPartyTest, true));
    } else if (isThirdParty === "false") {
      conditions.push(eq(labTestsTable.isThirdPartyTest, false));
    }

    if (mgAmountStr && typeof mgAmountStr === "string" && mgAmountStr.trim()) {
      const mgNum = parseFloat(mgAmountStr.trim());
      if (isFinite(mgNum)) {
        conditions.push(eq(labTestsTable.mgAmount, mgNum));
      }
    }

    const where = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await db
      .select()
      .from(labTestsTable)
      .where(where)
      .orderBy(
        sql`CASE WHEN ${labTestsTable.testDate} ~ E'^\\d{4}-\\d{2}-\\d{2}$' THEN ${labTestsTable.testDate}::date ELSE NULL END DESC NULLS LAST`,
        desc(labTestsTable.createdAt),
        desc(labTestsTable.id)
      )
      .limit(limit)
      .offset(offset);

    res.json(rows);
  } catch (err) {
    console.error("[lab-tests] GET /lab-tests error:", err);
    res.status(500).json({ error: "Failed to fetch lab tests" });
  }
});

// ── GET /api/lab-tests/metrics — aggregate stats ──────────────────────────────
// Optional filters: ?supplier=X&source=vendor|third_party&testType=mass_purity
router.get("/lab-tests/metrics", async (req, res) => {
  try {
    const { supplier, source, testType } = req.query;

    const baseConditions: SQL<unknown>[] = [eq(labTestsTable.pending, false)];
    if (supplier && typeof supplier === "string" && supplier.trim()) {
      baseConditions.push(sql`lower(${labTestsTable.supplier}) = lower(${supplier.trim()})`);
    }
    if (source === "vendor") {
      baseConditions.push(eq(labTestsTable.isThirdPartyTest, false));
    } else if (source === "third_party") {
      baseConditions.push(eq(labTestsTable.isThirdPartyTest, true));
    }
    if (testType && typeof testType === "string" && testType.trim()) {
      baseConditions.push(eq(labTestsTable.testType, testType.trim()));
    }
    const where = and(...baseConditions) as SQL<unknown>;

    const overallRows = await db.select({
      total: sql<number>`count(*)::int`,
      withPurity: sql<number>`count(${labTestsTable.purityPct})::int`,
      withEndotoxin: sql<number>`count(${labTestsTable.endotoxinEuMg})::int`,
      withSterility: sql<number>`count(${labTestsTable.sterilityPass})::int`,
      sterilityPass: sql<number>`sum(case when ${labTestsTable.sterilityPass} = true then 1 else 0 end)::int`,
      sterilityFail: sql<number>`sum(case when ${labTestsTable.sterilityPass} = false then 1 else 0 end)::int`,
      avgPurity: sql<number>`round(avg(${labTestsTable.purityPct})::numeric, 1)`,
      goodPurity: sql<number>`sum(case when ${labTestsTable.purityPct} >= 99 then 1 else 0 end)::int`,
      lowPurity: sql<number>`sum(case when ${labTestsTable.purityPct} < 99 then 1 else 0 end)::int`,
      thirdParty: sql<number>`sum(case when ${labTestsTable.isThirdPartyTest} = true then 1 else 0 end)::int`,
      vendorTests: sql<number>`sum(case when ${labTestsTable.isThirdPartyTest} = false then 1 else 0 end)::int`,
    }).from(labTestsTable).where(where);
    const overall = overallRows[0] ?? {
      total: 0, withPurity: 0, withEndotoxin: 0, withSterility: 0,
      sterilityPass: 0, sterilityFail: 0, avgPurity: null,
      goodPurity: 0, lowPurity: 0, thirdParty: 0, vendorTests: 0,
    };

    const [byLab, byTestType, byCompound, byCategory, bySupplier] = await Promise.all([
      db.select({ labName: labTestsTable.labName, count: sql<number>`count(*)::int` })
        .from(labTestsTable).where(where).groupBy(labTestsTable.labName).orderBy(desc(sql`count(*)`)),
      db.select({ testType: labTestsTable.testType, count: sql<number>`count(*)::int` })
        .from(labTestsTable).where(where).groupBy(labTestsTable.testType).orderBy(desc(sql`count(*)`)),
      db.select({
        peptideName: labTestsTable.peptideName,
        count: sql<number>`count(*)::int`,
        avgPurity: sql<number>`round(avg(${labTestsTable.purityPct})::numeric, 1)`,
        sterilityPass: sql<number>`sum(case when ${labTestsTable.sterilityPass} = true then 1 else 0 end)::int`,
        sterilityFail: sql<number>`sum(case when ${labTestsTable.sterilityPass} = false then 1 else 0 end)::int`,
      }).from(labTestsTable).where(where).groupBy(labTestsTable.peptideName).orderBy(desc(sql`count(*)`)).limit(20),
      db.select({ productCategory: labTestsTable.productCategory, count: sql<number>`count(*)::int` })
        .from(labTestsTable).where(where).groupBy(labTestsTable.productCategory).orderBy(desc(sql`count(*)`)),
      db.select({ supplier: labTestsTable.supplier, count: sql<number>`count(*)::int` })
        .from(labTestsTable).where(where).groupBy(labTestsTable.supplier).orderBy(desc(sql`count(*)`)),
    ]);

    res.json({ overall, byLab, byTestType, byCompound, byCategory, bySupplier });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

// ── GET /api/lab-tests/filters — available filter values ─────────────────────
router.get("/lab-tests/filters", async (_req, res) => {
  try {
    const [compounds, labs, suppliers] = await Promise.all([
      db.selectDistinct({ peptideName: labTestsTable.peptideName })
        .from(labTestsTable)
        .where(eq(labTestsTable.pending, false))
        .orderBy(labTestsTable.peptideName),
      db.selectDistinct({ labName: labTestsTable.labName })
        .from(labTestsTable)
        .where(eq(labTestsTable.pending, false))
        .orderBy(labTestsTable.labName),
      db.selectDistinct({ supplier: labTestsTable.supplier })
        .from(labTestsTable)
        .where(eq(labTestsTable.pending, false))
        .orderBy(labTestsTable.supplier),
    ]);
    res.json({
      compounds: compounds.map(r => r.peptideName),
      labs: labs.map(r => r.labName),
      suppliers: suppliers.map(r => r.supplier),
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch filters" });
  }
});

// ── POST /api/lab-tests/extract-preview — public AI extraction (rate-limited) ──
const extractRateMap = new Map<string, { count: number; resetAt: number }>();
router.post("/lab-tests/extract-preview", async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const window = 60 * 60 * 1000; // 1 hour
  const limit = 15;
  const entry = extractRateMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) {
      res.status(429).json({ error: "Too many extraction requests — please try again later" });
      return;
    }
    entry.count++;
  } else {
    extractRateMap.set(ip, { count: 1, resetAt: now + window });
  }
  const { url } = req.body;
  if (!url || typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "URL is required" });
    return;
  }
  try {
    const extracted = await extractCoADataFromAnyUrl(url.trim());
    if (!extracted) {
      res.status(422).json({ error: "Could not read report — check the URL or fill in details manually" });
      return;
    }
    res.json({ ok: true, extracted });
  } catch (err) {
    console.error("[public extract-preview]", err);
    res.status(500).json({ error: "AI extraction failed" });
  }
});

// ── POST /api/lab-tests/extract-pdf — AI extraction from uploaded PDF/image ───
const extractPdfRateMap = new Map<string, { count: number; resetAt: number }>();
router.post("/lab-tests/extract-pdf", upload.single("file"), async (req, res) => {
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "unknown";
  const now = Date.now();
  const window = 60 * 60 * 1000;
  const limit = 10;
  const entry = extractPdfRateMap.get(ip);
  if (entry && now < entry.resetAt) {
    if (entry.count >= limit) {
      res.status(429).json({ error: "Too many extraction requests — please try again later" });
      return;
    }
    entry.count++;
  } else {
    extractPdfRateMap.set(ip, { count: 1, resetAt: now + window });
  }

  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded or unsupported file type (PDF, JPEG, PNG, WebP only)" });
    return;
  }
  try {
    const extracted = await extractCoADataFromBuffer(file.buffer, file.mimetype);
    if (!extracted) {
      res.status(422).json({ error: "Could not read report — fill in details manually" });
      return;
    }
    res.json({ ok: true, extracted });
  } catch (err) {
    console.error("[extract-pdf]", err);
    res.status(500).json({ error: "AI extraction failed" });
  }
});

// ── POST /api/lab-tests/submit-pdf — community submission with PDF upload ──────
router.post("/lab-tests/submit-pdf", upload.single("file"), async (req, res) => {
  try {
    const file = req.file;
    const {
      peptideName, supplier, labName, testType, productCategory,
      isThirdPartyTest, mgAmount, purityPct, batchCode, testDate,
      notes, submittedBy, url,
    } = req.body;

    if (!peptideName || !String(peptideName).trim()) {
      res.status(400).json({ error: "Compound name is required" });
      return;
    }
    if (!file && (!url || !String(url).trim())) {
      res.status(400).json({ error: "Either a PDF file or a report URL is required" });
      return;
    }

    const pdfBlob = file ? file.buffer.toString("base64") : null;
    const resolvedUrl = url ? String(url).trim() : null;

    const dupId = await findLabTestDuplicate(resolvedUrl, batchCode, testDate, peptideName);
    if (dupId !== null) {
      res.status(409).json({ error: `A test with the same URL or batch/date/compound already exists (id=${dupId})` });
      return;
    }

    const uniqueId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const values: NewLabTest = {
      janoshikId: uniqueId,
      url: resolvedUrl,
      pdfBlob,
      peptideName: String(peptideName).trim(),
      supplier: supplier ? String(supplier).trim() : "Unknown",
      labName: labName && String(labName).trim() ? String(labName).trim() : "Uzorak",
      testType: testType && String(testType).trim() ? String(testType).trim() : null,
      productCategory: productCategory && String(productCategory).trim() ? String(productCategory).trim() : null,
      mgAmount: mgAmount != null && mgAmount !== "" ? parseFloat(mgAmount) : null,
      batchCode: batchCode ? String(batchCode).trim() : null,
      purityPct: purityPct != null && purityPct !== "" ? parseFloat(purityPct) : null,
      testDate: testDate ? String(testDate).trim() : null,
      notes: notes ? String(notes).trim().slice(0, 1000) : null,
      isThirdPartyTest: isThirdPartyTest === true || isThirdPartyTest === "true",
      submittedBy: submittedBy ? String(submittedBy).trim().slice(0, 100) : null,
      pending: true,
    };
    const [row] = await db.insert(labTestsTable).values(values).returning();
    res.json({ ok: true, id: row.id });
  } catch {
    res.status(500).json({ error: "Failed to submit test" });
  }
});

// ── POST /api/lab-tests/submit — community submission (public) ────────────────
router.post("/lab-tests/submit", async (req, res) => {
  try {
    const {
      peptideName, supplier, labName, testType, productCategory,
      isThirdPartyTest, mgAmount, purityPct, endotoxinEuMg, sterilityPass,
      batchCode, testDate, url, notes, submittedBy
    } = req.body;

    if (!url || typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "Report URL is required" });
      return;
    }
    if (!peptideName || typeof peptideName !== "string" || !peptideName.trim()) {
      res.status(400).json({ error: "Compound name is required" });
      return;
    }

    // Duplicate check — skip if same URL or same batch+date+name already exists
    const dupId = await findLabTestDuplicate(url, batchCode, testDate, peptideName);
    if (dupId !== null) {
      res.status(409).json({ error: `A test with the same URL or batch/date/compound already exists (id=${dupId})` });
      return;
    }

    const uniqueId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const values: NewLabTest = {
      janoshikId: uniqueId,
      url: url.trim(),
      peptideName: peptideName.trim(),
      supplier: supplier ? String(supplier).trim() : "Unknown",
      labName: labName && typeof labName === "string" && labName.trim() ? labName.trim() : "Janoshik",
      testType: testType && typeof testType === "string" && testType.trim() ? testType.trim() : null,
      productCategory: productCategory && typeof productCategory === "string" && productCategory.trim() ? productCategory.trim() : null,
      mgAmount: mgAmount != null && mgAmount !== "" ? parseFloat(mgAmount) : null,
      batchCode: batchCode ? String(batchCode).trim() : null,
      purityPct: purityPct != null && purityPct !== "" ? parseFloat(purityPct) : null,
      endotoxinEuMg: endotoxinEuMg != null && endotoxinEuMg !== "" ? parseFloat(endotoxinEuMg) : null,
      sterilityPass: sterilityPass === true || sterilityPass === "true" ? true : sterilityPass === false || sterilityPass === "false" ? false : null,
      testDate: testDate ? String(testDate).trim() : null,
      notes: notes ? String(notes).trim().slice(0, 1000) : null,
      isThirdPartyTest: isThirdPartyTest === true || isThirdPartyTest === "true",
      submittedBy: submittedBy ? String(submittedBy).trim().slice(0, 100) : null,
      pending: true,
    };
    const [row] = await db.insert(labTestsTable).values(values).returning();
    res.json({ ok: true, id: row.id });
  } catch {
    res.status(500).json({ error: "Failed to submit test" });
  }
});

// ── GET /api/lab-tests/peptides — distinct peptide names ─────────────────────
router.get("/lab-tests/peptides", async (_req, res) => {
  try {
    const rows = await db
      .selectDistinct({ peptideName: labTestsTable.peptideName })
      .from(labTestsTable)
      .orderBy(labTestsTable.peptideName);
    res.json(rows.map(r => r.peptideName));
  } catch {
    res.status(500).json({ error: "Failed to fetch peptide list" });
  }
});

// ── GET /api/lab-tests/summary — aggregate stats per peptide ─────────────────
router.get("/lab-tests/summary", async (_req, res) => {
  try {
    const rows = await db
      .select({
        peptideName: labTestsTable.peptideName,
        count: sql<number>`count(*)::int`,
        avgPurity: sql<number>`round(avg(${labTestsTable.purityPct})::numeric, 1)`,
        avgEndotoxin: sql<number>`round(avg(${labTestsTable.endotoxinEuMg})::numeric, 2)`,
        sterilityPassCount: sql<number>`sum(case when ${labTestsTable.sterilityPass} = true then 1 else 0 end)::int`,
        sterilityTestCount: sql<number>`sum(case when ${labTestsTable.sterilityPass} is not null then 1 else 0 end)::int`,
        latestDate: sql<string>`max(${labTestsTable.createdAt})`,
      })
      .from(labTestsTable)
      .groupBy(labTestsTable.peptideName)
      .orderBy(labTestsTable.peptideName);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// ── GET /api/lab-tests/coa-preview — preview info for any allowed lab URL ─────
router.get("/lab-tests/coa-preview", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "url query param is required" });
      return;
    }
    const decoded = decodeURIComponent(url.trim());
    if (!isBulkImportAllowedUrl(decoded)) {
      res.status(400).json({ error: "URL is not from an allowed lab domain" });
      return;
    }
    const preview = await resolvePreviewInfo(decoded);
    res.json(preview);
  } catch {
    res.status(500).json({ error: "Failed to resolve preview" });
  }
});

// ── GET /api/lab-tests/coa-proxy — proxy image/PDF bytes for a lab URL ────────
router.get("/lab-tests/coa-proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string" || !url.trim()) {
      res.status(400).json({ error: "url query param is required" });
      return;
    }
    const decoded = decodeURIComponent(url.trim());
    if (!isBulkImportAllowedUrl(decoded)) {
      res.status(400).json({ error: "URL is not from an allowed lab domain" });
      return;
    }
    const preview = await resolvePreviewInfo(decoded);
    let targetUrl: string;
    if (preview.type === "image" && preview.images.length > 0) targetUrl = preview.images[0];
    else if (preview.type === "pdf") targetUrl = preview.url;
    else {
      res.status(422).json({ error: "No embeddable media available for this report" });
      return;
    }
    const file = await downloadLabFile(targetUrl);
    if (!file) {
      res.status(502).json({ error: "Failed to download report file" });
      return;
    }
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Disposition", "inline");
    res.end(file.bytes);
  } catch {
    res.status(500).json({ error: "Failed to proxy report file" });
  }
});

// ── GET /api/lab-tests/:id/preview — structured preview info ──────────────────
router.get("/lab-tests/:id/preview", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [test] = await db.select().from(labTestsTable).where(eq(labTestsTable.id, id));
    if (!test) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    // If test has an uploaded PDF blob (no external URL), serve it via proxy
    if (!test.url && test.pdfBlob) {
      res.json({ type: "pdf", originalUrl: null });
      return;
    }
    if (!test.url) { res.status(422).json({ error: "This lab test has no external URL" }); return; }

    // Uzorak: their server 302-redirects /verify/X.pdf back to the SPA hash,
    // so a normal fetch won't retrieve embeddable content. Instead we query
    // their public Supabase API to learn what media is available.
    if (isUzorakUrl(test.url)) {
      const uzorakType = await resolveUzorakPreviewType(test.url);
      res.json({ type: uzorakType, originalUrl: test.url });
      return;
    }

    const preview = await resolvePreviewInfo(test.url, test.labName ?? undefined);
    res.json({ ...preview, originalUrl: test.url });
  } catch {
    res.status(500).json({ error: "Failed to resolve preview" });
  }
});

// ── GET /api/lab-tests/:id/proxy — serve image or PDF bytes (avoids CORS) ────
router.get("/lab-tests/:id/proxy", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [test] = await db.select().from(labTestsTable).where(eq(labTestsTable.id, id));
    if (!test) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    // Serve uploaded PDF blob directly if no external URL
    if (!test.url && test.pdfBlob) {
      const buf = Buffer.from(test.pdfBlob, "base64");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Disposition", "inline");
      res.end(buf);
      return;
    }

    if (!test.url) { res.status(422).json({ error: "This lab test has no external URL" }); return; }

    // Uzorak: fetch bytes via Supabase RPC (direct download is blocked by their SPA redirect)
    if (isUzorakUrl(test.url)) {
      const uzorakFile = await resolveUzorakPreviewBytes(test.url);
      if (!uzorakFile) {
        res.status(502).json({ error: "Failed to retrieve Uzorak report" });
        return;
      }
      res.setHeader("Content-Type", uzorakFile.mimeType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("Content-Disposition", "inline");
      res.end(uzorakFile.bytes);
      return;
    }

    // For all other website URLs, resolve to an actual media URL first
    const preview = await resolvePreviewInfo(test.url, test.labName ?? undefined);
    let candidateUrls: string[] = [];
    if (preview.type === "image" && preview.images.length > 0) {
      candidateUrls = preview.images;
    } else if (preview.type === "pdf") {
      candidateUrls = [preview.url];
    } else {
      res.status(422).json({ error: "No embeddable media available for this report" });
      return;
    }

    // Try each candidate URL in order (handles Janoshik guessed URLs gracefully)
    let file: Awaited<ReturnType<typeof downloadLabFile>> = null;
    for (const url of candidateUrls) {
      file = await downloadLabFile(url);
      if (file) break;
    }
    if (!file) {
      res.status(502).json({ error: "Failed to download report file" });
      return;
    }

    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Content-Disposition", "inline");
    res.end(file.bytes);
  } catch {
    res.status(500).json({ error: "Failed to proxy report file" });
  }
});

// ── GET /api/lab-tests/:id/images — legacy image list endpoint ────────────────
router.get("/lab-tests/:id/images", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [test] = await db.select().from(labTestsTable).where(eq(labTestsTable.id, id));
    if (!test) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    if (!test.url) { res.json({ images: [], url: null, previewType: "none" }); return; }
    const preview = await resolvePreviewInfo(test.url, test.labName ?? undefined);
    const images = preview.type === "image" ? preview.images : [];
    res.json({ images, url: test.url, previewType: preview.type });
  } catch {
    res.status(500).json({ error: "Failed to fetch images" });
  }
});

// ── GET /api/lab-tests/:id — single test ─────────────────────────────────────
router.get("/lab-tests/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [test] = await db.select().from(labTestsTable).where(eq(labTestsTable.id, id));
    if (!test) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(test);
  } catch {
    res.status(500).json({ error: "Failed to fetch test" });
  }
});

// ── GET /api/admin/lab-tests/pending — list pending submissions ───────────────
router.get("/admin/lab-tests/pending", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db.select().from(labTestsTable)
      .where(eq(labTestsTable.pending, true))
      .orderBy(desc(labTestsTable.id));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch pending tests" });
  }
});

// ── POST /api/admin/lab-tests/:id/approve — approve pending submission ────────
router.post("/admin/lab-tests/:id/approve", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    // Build typed partial update from body (same fields as PUT) + set pending=false
    const updates: Partial<NewLabTest> = { pending: false };
    const {
      peptideName, mgAmount, nominalDose, massUnit, supplier, labName, testType, productCategory,
      batchCode, purityPct, endotoxinEuMg, sterilityPass, testDate, notes,
      heavyMetalAs, heavyMetalCd, heavyMetalPb, heavyMetalHg,
    } = req.body;
    if (peptideName != null) updates.peptideName = String(peptideName).trim();
    if (mgAmount != null) updates.mgAmount = parseFloat(mgAmount);
    if (nominalDose != null) updates.nominalDose = String(nominalDose).trim() || null;
    else if (req.body.nominalDose === null) updates.nominalDose = null;
    if (massUnit != null) updates.massUnit = massUnit === "IU" ? "IU" : "mg";
    if (supplier != null) updates.supplier = String(supplier).trim();
    if (labName != null) updates.labName = String(labName).trim();
    if (testType != null) updates.testType = String(testType).trim();
    else if (req.body.testType === null) updates.testType = null;
    if (productCategory != null) updates.productCategory = String(productCategory).trim();
    else if (req.body.productCategory === null) updates.productCategory = null;
    if (batchCode != null) updates.batchCode = String(batchCode).trim();
    if (purityPct != null) updates.purityPct = parseFloat(purityPct);
    else if (req.body.purityPct === null) updates.purityPct = null;
    if (endotoxinEuMg != null) updates.endotoxinEuMg = parseFloat(endotoxinEuMg);
    else if (req.body.endotoxinEuMg === null) updates.endotoxinEuMg = null;
    if (sterilityPass != null) updates.sterilityPass = Boolean(sterilityPass);
    else if (req.body.sterilityPass === null) updates.sterilityPass = null;
    if (testDate != null) updates.testDate = String(testDate);
    if (notes != null) updates.notes = String(notes).trim().slice(0, 1000);
    if (heavyMetalAs != null) updates.heavyMetalAs = String(heavyMetalAs).trim() || null;
    else if (req.body.heavyMetalAs === null) updates.heavyMetalAs = null;
    if (heavyMetalCd != null) updates.heavyMetalCd = String(heavyMetalCd).trim() || null;
    else if (req.body.heavyMetalCd === null) updates.heavyMetalCd = null;
    if (heavyMetalPb != null) updates.heavyMetalPb = String(heavyMetalPb).trim() || null;
    else if (req.body.heavyMetalPb === null) updates.heavyMetalPb = null;
    if (heavyMetalHg != null) updates.heavyMetalHg = String(heavyMetalHg).trim() || null;
    else if (req.body.heavyMetalHg === null) updates.heavyMetalHg = null;
    // Only approve records that are currently pending
    const [row] = await db
      .update(labTestsTable)
      .set(updates)
      .where(and(eq(labTestsTable.id, id), eq(labTestsTable.pending, true)))
      .returning();
    if (!row) {
      res.status(404).json({ error: "Pending submission not found" });
      return;
    }
    res.json({ ok: true });

    // Auto-extract CoA data in the background — only fills fields that are still null
    // (preserves any values the admin/submitter already provided in the approve form)
    setImmediate(async () => {
      try {
        if (!row.url) return;
        const extracted = await extractCoADataFromAnyUrl(row.url);
        if (!extracted) return;
        const fill: Partial<NewLabTest> = {
          aiExtracted: true,
          aiExtractedAt: new Date(),
        };
        // Fill only if the approved row has null for that field
        if (row.purityPct == null && extracted.purityPct != null) fill.purityPct = extracted.purityPct;
        if (row.mgAmount == null && extracted.mgAmount != null) {
          fill.mgAmount = extracted.mgAmount;
          fill.massUnit = extracted.massUnit ?? "mg";
        }
        if (row.endotoxinEuMg == null && extracted.endotoxinEuMg != null) fill.endotoxinEuMg = extracted.endotoxinEuMg;
        if (row.sterilityPass == null && extracted.sterilityPass != null) fill.sterilityPass = extracted.sterilityPass;
        if (!row.heavyMetalAs && extracted.heavyMetalAs) fill.heavyMetalAs = extracted.heavyMetalAs;
        if (!row.heavyMetalCd && extracted.heavyMetalCd) fill.heavyMetalCd = extracted.heavyMetalCd;
        if (!row.heavyMetalPb && extracted.heavyMetalPb) fill.heavyMetalPb = extracted.heavyMetalPb;
        if (!row.heavyMetalHg && extracted.heavyMetalHg) fill.heavyMetalHg = extracted.heavyMetalHg;
        if (!row.batchCode && extracted.batchCode) fill.batchCode = extracted.batchCode;
        if (!row.testDate && extracted.testDate) fill.testDate = extracted.testDate;
        if (!row.testType && extracted.testType) fill.testType = extracted.testType;
        if (!row.productCategory && extracted.productCategory) fill.productCategory = extracted.productCategory;
        await db.update(labTestsTable).set(fill).where(eq(labTestsTable.id, id));
      } catch (err) {
        console.error(`[approve auto-extract] id=${id}`, err);
      }
    });

    // Also try to store the certificate bytes for instant future previews
    if (row.url) {
      setImmediate(() => { tryFetchAndStoreCertificate(id, row.url!).catch(() => {}); });
    }
  } catch {
    res.status(500).json({ error: "Failed to approve test" });
  }
});

// ── DELETE /api/admin/lab-tests/:id/reject — reject & delete pending only ─────
router.delete("/admin/lab-tests/:id/reject", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    // Strictly constrained to pending=true to prevent accidental deletion of approved tests
    const [deleted] = await db
      .delete(labTestsTable)
      .where(and(eq(labTestsTable.id, id), eq(labTestsTable.pending, true)))
      .returning({ id: labTestsTable.id });
    if (!deleted) {
      res.status(404).json({ error: "Pending submission not found" });
      return;
    }
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to reject test" });
  }
});

// ── POST /api/admin/lab-tests/extract-preview — extract from URL without saving ─
router.post("/admin/lab-tests/extract-preview", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const { url } = req.body;
  if (!url || typeof url !== "string" || !url.trim()) {
    res.status(400).json({ error: "URL is required" });
    return;
  }
  try {
    const extracted = await extractCoADataFromAnyUrl(url.trim());
    if (!extracted) {
      res.status(422).json({ error: "Could not extract data — report unreadable or no media found at this URL" });
      return;
    }
    res.json({ ok: true, extracted });
  } catch (err) {
    console.error("[extract-preview]", err);
    res.status(500).json({ error: "AI extraction failed" });
  }
});

// ── POST /api/admin/lab-tests/extract-pdf — AI extraction from uploaded PDF (admin, no rate limit) ─
router.post("/admin/lab-tests/extract-pdf", upload.single("file"), async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const file = req.file;
  if (!file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  try {
    const extracted = await extractCoADataFromBuffer(file.buffer, file.mimetype);
    if (!extracted) {
      res.status(422).json({ error: "Could not read report — fill in details manually" });
      return;
    }
    res.json({ ok: true, extracted });
  } catch (err) {
    console.error("[admin/extract-pdf]", err);
    res.status(500).json({ error: "AI extraction failed" });
  }
});

// ── POST /api/admin/lab-tests/with-pdf — admin add test with PDF upload (no pending) ─
router.post("/admin/lab-tests/with-pdf", upload.single("file"), async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const file = req.file;
    const {
      peptideName, mgAmount, nominalDose, massUnit, supplier, labName, testType,
      productCategory, batchCode, purityPct, endotoxinEuMg, sterilityPass, testDate, notes,
      heavyMetalAs, heavyMetalCd, heavyMetalPb, heavyMetalHg, blendComponents,
    } = req.body;

    if (!peptideName || !String(peptideName).trim()) {
      res.status(400).json({ error: "peptideName is required" });
      return;
    }
    if (!file) {
      res.status(400).json({ error: "A PDF file is required" });
      return;
    }

    const pdfBlob = file.buffer.toString("base64");
    const resolvedSupplier = supplier ? String(supplier).trim() : "Uther";
    const resolvedBatchCode = batchCode ? String(batchCode).trim() : null;
    const resolvedName = resolveUtherName(resolvedSupplier, resolvedBatchCode, String(peptideName).trim());

    const dupId = await findLabTestDuplicate(null, resolvedBatchCode, testDate ? String(testDate) : null, resolvedName);
    if (dupId !== null) {
      res.status(409).json({ error: `A test with the same batch/date/compound already exists (id=${dupId})` });
      return;
    }

    const janoshikId = `pdf-${Date.now()}`;

    let blendComponentsJson: string | null = null;
    if (blendComponents) {
      try {
        const arr = typeof blendComponents === "string" ? JSON.parse(blendComponents) : blendComponents;
        if (Array.isArray(arr) && arr.length > 0) blendComponentsJson = JSON.stringify(arr);
      } catch { /* ignore */ }
    }

    const values: NewLabTest = {
      janoshikId,
      url: null,
      pdfBlob,
      peptideName: resolvedName,
      mgAmount: mgAmount != null && mgAmount !== "" ? parseFloat(mgAmount) : null,
      nominalDose: nominalDose ? String(nominalDose).trim() : null,
      massUnit: massUnit === "IU" ? "IU" : "mg",
      supplier: resolvedSupplier,
      labName: labName ? String(labName).trim() : "Uzorak",
      testType: testType ? String(testType).trim() : null,
      productCategory: productCategory ? String(productCategory).trim() : null,
      batchCode: resolvedBatchCode,
      purityPct: purityPct != null && purityPct !== "" ? parseFloat(purityPct) : null,
      endotoxinEuMg: endotoxinEuMg != null && endotoxinEuMg !== "" ? parseFloat(endotoxinEuMg) : null,
      sterilityPass: sterilityPass != null ? (sterilityPass === "true" || sterilityPass === true) : null,
      testDate: testDate ? String(testDate) : null,
      notes: notes ? String(notes).trim().slice(0, 1000) : null,
      heavyMetalAs: heavyMetalAs ? String(heavyMetalAs).trim() : null,
      heavyMetalCd: heavyMetalCd ? String(heavyMetalCd).trim() : null,
      heavyMetalPb: heavyMetalPb ? String(heavyMetalPb).trim() : null,
      heavyMetalHg: heavyMetalHg ? String(heavyMetalHg).trim() : null,
      blendComponents: blendComponentsJson,
      pending: false,
      aiExtracted: false,
    };

    const [row] = await db.insert(labTestsTable).values(values).returning();
    res.json(row);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "23505") {
      res.status(409).json({ error: "A test with this ID already exists" });
    } else {
      console.error("[admin/with-pdf]", e);
      res.status(500).json({ error: "Failed to add test" });
    }
  }
});

// ── Certificate auto-fetch helper ─────────────────────────────────────────────
// Fire-and-forget after a lab test record is created/updated with a URL.
// Tries to download and store the certificate bytes into pdf_blob so future
// previews load instantly from the DB instead of hitting external servers.
// Silently no-ops if: record already has a blob, URL is not Uzorak, fetch fails.
async function tryFetchAndStoreCertificate(id: number, url: string): Promise<void> {
  try {
    // Only attempt if the record doesn't already have stored bytes
    const [existing] = await db
      .select({ pdfBlob: labTestsTable.pdfBlob })
      .from(labTestsTable)
      .where(eq(labTestsTable.id, id))
      .limit(1);
    if (!existing || existing.pdfBlob) return;

    let blob: string | null = null;

    if (isUzorakUrl(url)) {
      // Uzorak: query their Supabase API — gives us a JPEG snapshot or PDF
      const result = await resolveUzorakPreviewBytes(url);
      if (result) {
        blob = result.bytes.toString("base64");
      }
    } else {
      // Other labs (Peptidetest, Analiza Bialek etc.) — try a direct image fetch.
      // Janoshik will 403 here which is fine; it's caught silently below.
      const preview = await resolvePreviewInfo(url);
      if (preview.type === "image" && preview.images.length > 0) {
        const imgRes = await fetch(preview.images[0], { signal: AbortSignal.timeout(15000) });
        if (imgRes.ok) {
          const buf = Buffer.from(await imgRes.arrayBuffer());
          blob = buf.toString("base64");
        }
      } else if (preview.type === "pdf") {
        const pdfRes = await fetch(preview.url, { signal: AbortSignal.timeout(15000) });
        if (pdfRes.ok) {
          const buf = Buffer.from(await pdfRes.arrayBuffer());
          blob = buf.toString("base64");
        }
      }
    }

    if (!blob) return;

    await db
      .update(labTestsTable)
      .set({ pdfBlob: blob })
      .where(eq(labTestsTable.id, id));

    console.log(`[cert-fetch] Stored certificate for lab test #${id} (${url.slice(0, 60)})`);
  } catch (err) {
    // Never propagate — this is best-effort background work
    console.warn(`[cert-fetch] Failed for lab test #${id}:`, String(err).slice(0, 120));
  }
}

// ── POST /api/admin/lab-tests — admin add test ────────────────────────────────
router.post("/admin/lab-tests", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const {
      url, peptideName, mgAmount, nominalDose, massUnit, supplier, labName, testType,
      productCategory, batchCode, purityPct, endotoxinEuMg, sterilityPass, testDate, notes,
      heavyMetalAs, heavyMetalCd, heavyMetalPb, heavyMetalHg, blendComponents,
    } = req.body;
    if (!url || !peptideName) {
      res.status(400).json({ error: "url and peptideName are required" });
      return;
    }
    const resolvedSupplier = supplier ? String(supplier).trim() : "Uther";
    const resolvedBatchCode = batchCode ? String(batchCode).trim() : null;
    const resolvedName = resolveUtherName(resolvedSupplier, resolvedBatchCode, String(peptideName).trim());

    // Duplicate check
    const dupId = await findLabTestDuplicate(String(url).trim(), resolvedBatchCode, testDate ? String(testDate) : null, resolvedName);
    if (dupId !== null) {
      res.status(409).json({ error: `A test with the same URL or batch/date/compound already exists (id=${dupId})` });
      return;
    }

    const urlMatch = (url as string).match(/\/tests\/(\d+)-/);
    const janoshikId = urlMatch ? urlMatch[1] : `manual-${Date.now()}`;

    // Normalise blend_components JSON
    let blendComponentsJson: string | null = null;
    if (blendComponents) {
      try {
        const arr = typeof blendComponents === "string" ? JSON.parse(blendComponents) : blendComponents;
        if (Array.isArray(arr) && arr.length > 0) blendComponentsJson = JSON.stringify(arr);
      } catch { /* ignore invalid JSON */ }
    }

    const values: NewLabTest = {
      janoshikId,
      url: String(url).trim(),
      peptideName: resolvedName,
      mgAmount: mgAmount != null ? parseFloat(mgAmount) : null,
      nominalDose: nominalDose ? String(nominalDose).trim() : null,
      massUnit: massUnit === "IU" ? "IU" : "mg",
      supplier: resolvedSupplier,
      labName: labName ? String(labName).trim() : "Janoshik",
      testType: testType ? String(testType).trim() : null,
      productCategory: productCategory ? String(productCategory).trim() : null,
      batchCode: resolvedBatchCode,
      purityPct: purityPct != null ? parseFloat(purityPct) : null,
      endotoxinEuMg: endotoxinEuMg != null ? parseFloat(endotoxinEuMg) : null,
      sterilityPass: sterilityPass != null ? Boolean(sterilityPass) : null,
      testDate: testDate ? String(testDate) : null,
      notes: notes ? String(notes).trim().slice(0, 1000) : null,
      heavyMetalAs: heavyMetalAs ? String(heavyMetalAs).trim() : null,
      heavyMetalCd: heavyMetalCd ? String(heavyMetalCd).trim() : null,
      heavyMetalPb: heavyMetalPb ? String(heavyMetalPb).trim() : null,
      heavyMetalHg: heavyMetalHg ? String(heavyMetalHg).trim() : null,
      blendComponents: blendComponentsJson,
    };
    const [row] = await db.insert(labTestsTable).values(values).returning();
    res.json(row);

    // Fire-and-forget: try to store the certificate bytes for instant future previews
    setImmediate(() => { tryFetchAndStoreCertificate(row.id, row.url!).catch(() => {}); });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err?.code === "23505") {
      res.status(409).json({ error: "A test with this Janoshik ID already exists" });
    } else {
      res.status(500).json({ error: "Failed to add test" });
    }
  }
});

// ── PUT /api/admin/lab-tests/:id — admin update test values ──────────────────
router.put("/admin/lab-tests/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const {
      peptideName, mgAmount, nominalDose, massUnit, purityPct, endotoxinEuMg, sterilityPass,
      testDate, notes, supplier, labName, testType, productCategory,
      heavyMetalAs, heavyMetalCd, heavyMetalPb, heavyMetalHg, blendComponents,
      batchCode,
    } = req.body;

    // Build typed partial update using only schema columns
    const updates: Partial<NewLabTest> = {};

    // Resolve supplier/batchCode first (needed for Uther name normalisation)
    const resolvedSupplier = supplier != null ? String(supplier).trim() : null;
    const resolvedBatchCode = batchCode != null ? String(batchCode).trim() || null : undefined;
    if (resolvedSupplier != null) updates.supplier = resolvedSupplier;
    if (resolvedBatchCode !== undefined) updates.batchCode = resolvedBatchCode;

    // peptideName: re-resolve Uther canonical name whenever peptideName, supplier, or batchCode changes
    if (peptideName != null || resolvedSupplier != null || resolvedBatchCode !== undefined) {
      const [existing] = await db
        .select({ peptideName: labTestsTable.peptideName, supplier: labTestsTable.supplier, batchCode: labTestsTable.batchCode })
        .from(labTestsTable).where(eq(labTestsTable.id, id)).limit(1);
      if (!existing) { res.status(404).json({ error: "Not found" }); return; }
      const nameFallback = peptideName != null ? String(peptideName).trim() : existing.peptideName;
      const effectiveSupplier = resolvedSupplier ?? existing.supplier;
      const effectiveBatchCode = resolvedBatchCode !== undefined ? resolvedBatchCode : existing.batchCode;
      updates.peptideName = resolveUtherName(effectiveSupplier, effectiveBatchCode, nameFallback);
    }

    if (mgAmount != null) updates.mgAmount = parseFloat(mgAmount);
    else if (req.body.mgAmount === null) updates.mgAmount = null;
    if (nominalDose != null) updates.nominalDose = String(nominalDose).trim() || null;
    else if (req.body.nominalDose === null) updates.nominalDose = null;
    if (massUnit != null) updates.massUnit = massUnit === "IU" ? "IU" : "mg";
    if (purityPct != null) updates.purityPct = parseFloat(purityPct);
    else if (req.body.purityPct === null) updates.purityPct = null;
    if (endotoxinEuMg != null) updates.endotoxinEuMg = parseFloat(endotoxinEuMg);
    else if (req.body.endotoxinEuMg === null) updates.endotoxinEuMg = null;
    if (sterilityPass != null) updates.sterilityPass = Boolean(sterilityPass);
    else if (req.body.sterilityPass === null) updates.sterilityPass = null;
    if (testDate != null) updates.testDate = String(testDate);
    if (notes != null) updates.notes = String(notes).trim().slice(0, 1000);
    if (labName != null) updates.labName = String(labName).trim();
    if (testType != null) updates.testType = String(testType).trim();
    else if (req.body.testType === null) updates.testType = null;
    if (productCategory != null) updates.productCategory = String(productCategory).trim();
    else if (req.body.productCategory === null) updates.productCategory = null;
    if (heavyMetalAs != null) updates.heavyMetalAs = String(heavyMetalAs).trim() || null;
    else if (req.body.heavyMetalAs === null) updates.heavyMetalAs = null;
    if (heavyMetalCd != null) updates.heavyMetalCd = String(heavyMetalCd).trim() || null;
    else if (req.body.heavyMetalCd === null) updates.heavyMetalCd = null;
    if (heavyMetalPb != null) updates.heavyMetalPb = String(heavyMetalPb).trim() || null;
    else if (req.body.heavyMetalPb === null) updates.heavyMetalPb = null;
    if (heavyMetalHg != null) updates.heavyMetalHg = String(heavyMetalHg).trim() || null;
    else if (req.body.heavyMetalHg === null) updates.heavyMetalHg = null;

    // blendComponents: accept JSON array or null
    if (blendComponents !== undefined) {
      if (blendComponents === null) {
        updates.blendComponents = null;
      } else {
        try {
          const arr = typeof blendComponents === "string" ? JSON.parse(blendComponents) : blendComponents;
          updates.blendComponents = Array.isArray(arr) && arr.length > 0 ? JSON.stringify(arr) : null;
        } catch { updates.blendComponents = null; }
      }
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [row] = await db.update(labTestsTable).set(updates).where(eq(labTestsTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Failed to update test" });
  }
});

// ── POST /api/admin/lab-tests/:id/upload-cert — store a certificate file ─────
// Accepts an image (JPEG/PNG/WebP) or PDF uploaded by the admin.
// Stored as base64 in pdf_blob; future /proxy calls serve it directly.
router.post("/admin/lab-tests/:id/upload-cert", upload.single("file"), async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) { res.status(400).json({ error: "Invalid ID" }); return; }
    if (!req.file) { res.status(400).json({ error: "No file provided" }); return; }
    const blob = req.file.buffer.toString("base64");
    const [row] = await db
      .update(labTestsTable)
      .set({ pdfBlob: blob })
      .where(eq(labTestsTable.id, id))
      .returning({ id: labTestsTable.id });
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    console.log(`[cert-upload] Admin stored certificate for lab test #${id} (${req.file.mimetype}, ${Math.round(req.file.buffer.length / 1024)}KB)`);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to store certificate" });
  }
});

// ── DELETE /api/admin/lab-tests/:id ──────────────────────────────────────────
router.delete("/admin/lab-tests/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(labTestsTable).where(eq(labTestsTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete test" });
  }
});

// ── POST /api/admin/lab-tests/:id/extract — AI extract single test ────────────
router.post("/admin/lab-tests/:id/extract", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    const [test] = await db.select().from(labTestsTable).where(eq(labTestsTable.id, id));
    if (!test) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    if (!test.url) { res.status(422).json({ error: "This lab test has no external URL to extract from" }); return; }
    const extracted = await extractCoADataFromAnyUrl(test.url);
    if (!extracted) {
      res.status(422).json({ error: "Could not extract data — report unreadable or no media found" });
      return;
    }

    const updates: Partial<NewLabTest> = {
      aiExtracted: true,
      aiExtractedAt: new Date(),
    };
    if (extracted.purityPct != null) updates.purityPct = extracted.purityPct;
    if (extracted.mgAmount != null) { updates.mgAmount = extracted.mgAmount; updates.massUnit = extracted.massUnit ?? "mg"; }
    if (extracted.endotoxinEuMg != null) updates.endotoxinEuMg = extracted.endotoxinEuMg;
    if (extracted.sterilityPass != null) updates.sterilityPass = extracted.sterilityPass;
    if (extracted.heavyMetalAs) updates.heavyMetalAs = extracted.heavyMetalAs;
    if (extracted.heavyMetalCd) updates.heavyMetalCd = extracted.heavyMetalCd;
    if (extracted.heavyMetalPb) updates.heavyMetalPb = extracted.heavyMetalPb;
    if (extracted.heavyMetalHg) updates.heavyMetalHg = extracted.heavyMetalHg;
    if (extracted.batchCode) updates.batchCode = extracted.batchCode;
    if (extracted.testDate) updates.testDate = extracted.testDate;
    if (extracted.testType) updates.testType = extracted.testType;
    if (extracted.productCategory) updates.productCategory = extracted.productCategory;
    // blendComponents
    if (Array.isArray(extracted.blendComponents) && extracted.blendComponents.length > 0) {
      updates.blendComponents = JSON.stringify(extracted.blendComponents);
    }
    // Uther name normalisation — use the current record's supplier/batchCode
    const effectiveBatchCode = updates.batchCode ?? test.batchCode;
    const resolvedName = resolveUtherName(test.supplier, effectiveBatchCode, extracted.compoundName ?? test.peptideName);
    if (resolvedName !== (extracted.compoundName ?? test.peptideName)) updates.peptideName = resolvedName;

    const [updated] = await db.update(labTestsTable).set(updates).where(eq(labTestsTable.id, id)).returning();
    res.json({ ok: true, extracted, record: updated });
  } catch (err) {
    console.error("[/extract]", err);
    res.status(500).json({ error: "AI extraction failed" });
  }
});

// ── GET /api/admin/lab-tests/extract-status — batch job status ───────────────
router.get("/admin/lab-tests/extract-status", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(batchJob);
});

// ── POST /api/admin/lab-tests/extract-all — start batch AI extraction ────────
router.post("/admin/lab-tests/extract-all", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  if (batchJob.status === "running") {
    res.status(409).json({ error: "Batch extraction already running", job: batchJob });
    return;
  }

  const { skipExisting = true, mode } = req.body ?? {};
  // mode: "new" = not yet AI-extracted, "all" = re-run everything,
  //        "missing" = AI was run but no CoA values found (or never run)
  const effectiveMode: "new" | "all" | "missing" = mode ?? (skipExisting ? "new" : "all");

  try {
    let whereClause: SQL | undefined;
    if (effectiveMode === "new") {
      whereClause = and(eq(labTestsTable.pending, false), eq(labTestsTable.aiExtracted, false));
    } else if (effectiveMode === "missing") {
      whereClause = and(
        eq(labTestsTable.pending, false),
        isNull(labTestsTable.purityPct),
        isNull(labTestsTable.mgAmount),
        isNull(labTestsTable.endotoxinEuMg),
        isNull(labTestsTable.sterilityPass),
      );
    } else {
      whereClause = eq(labTestsTable.pending, false);
    }

    const tests = await db
      .select({ id: labTestsTable.id, url: labTestsTable.url, supplier: labTestsTable.supplier, batchCode: labTestsTable.batchCode, peptideName: labTestsTable.peptideName })
      .from(labTestsTable)
      .where(whereClause)
      .orderBy(labTestsTable.id);

    resetBatchJob();
    batchJob.status = "running";
    batchJob.total = tests.length;
    batchJob.startedAt = Date.now();

    res.json({ ok: true, started: true, total: tests.length, job: batchJob });

    (async () => {
      for (const test of tests) {
        if (batchJob.status !== "running") break;
        batchJob.currentId = test.id;

        try {
          if (!test.url) {
            batchJob.failed++;
            batchJob.errors.push({ id: test.id, url: null, reason: "No URL — file-only record" });
          } else {
          const extracted = await extractCoADataFromAnyUrl(test.url);
          if (!extracted) {
            batchJob.failed++;
            batchJob.errors.push({ id: test.id, url: test.url, reason: "Report unreadable or no media found" });
          } else {
            const updates: Partial<NewLabTest> = {
              aiExtracted: true,
              aiExtractedAt: new Date(),
            };
            if (extracted.purityPct != null) updates.purityPct = extracted.purityPct;
            if (extracted.mgAmount != null) { updates.mgAmount = extracted.mgAmount; updates.massUnit = extracted.massUnit ?? "mg"; }
            if (extracted.endotoxinEuMg != null) updates.endotoxinEuMg = extracted.endotoxinEuMg;
            if (extracted.sterilityPass != null) updates.sterilityPass = extracted.sterilityPass;
            if (extracted.heavyMetalAs) updates.heavyMetalAs = extracted.heavyMetalAs;
            if (extracted.heavyMetalCd) updates.heavyMetalCd = extracted.heavyMetalCd;
            if (extracted.heavyMetalPb) updates.heavyMetalPb = extracted.heavyMetalPb;
            if (extracted.heavyMetalHg) updates.heavyMetalHg = extracted.heavyMetalHg;
            if (extracted.batchCode) updates.batchCode = extracted.batchCode;
            if (extracted.testDate) updates.testDate = extracted.testDate;
            if (extracted.testType) updates.testType = extracted.testType;
            if (extracted.productCategory) updates.productCategory = extracted.productCategory;
            // blendComponents
            if (Array.isArray(extracted.blendComponents) && extracted.blendComponents.length > 0) {
              updates.blendComponents = JSON.stringify(extracted.blendComponents);
            }
            // Uther name normalisation
            const exBatch = updates.batchCode ?? test.batchCode;
            const resolvedBatchName = resolveUtherName(test.supplier, exBatch, extracted.compoundName ?? test.peptideName);
            if (resolvedBatchName !== (extracted.compoundName ?? test.peptideName)) updates.peptideName = resolvedBatchName;

            await db.update(labTestsTable).set(updates).where(eq(labTestsTable.id, test.id));
            batchJob.succeeded++;
          }
          } // end else (test.url exists)
        } catch (err) {
          batchJob.failed++;
          batchJob.errors.push({ id: test.id, url: test.url ?? null, reason: String(err) });
        }

        batchJob.processed++;
        await new Promise(r => setTimeout(r, 1200));
      }

      batchJob.status = "done";
      batchJob.finishedAt = Date.now();
      batchJob.currentId = null;
    })().catch(err => {
      console.error("[extract-all]", err);
      batchJob.status = "error";
      batchJob.finishedAt = Date.now();
    });
  } catch (err) {
    console.error("[extract-all start]", err);
    res.status(500).json({ error: "Failed to start extraction job" });
  }
});

// ── POST /api/admin/lab-tests/extract-stop — stop batch job ──────────────────
router.post("/admin/lab-tests/extract-stop", (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (batchJob.status === "running") {
    batchJob.status = "done";
    batchJob.finishedAt = Date.now();
  }
  res.json({ ok: true, job: batchJob });
});

// ── GET /api/admin/lab-tests/bulk-import-status — bulk import job status ─────
router.get("/admin/lab-tests/bulk-import-status", (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(bulkImportJob);
});

// ── POST /api/admin/lab-tests/bulk-import — import multiple lab URLs ──────────
router.post("/admin/lab-tests/bulk-import", async (req, res) => {
  if (!requireAdmin(req, res)) return;

  if (bulkImportJob.status === "running") {
    res.status(409).json({ error: "Bulk import already running", job: bulkImportJob });
    return;
  }

  const { urls, isThirdParty = false, labName = "Janoshik", supplier = "Uther" } = req.body ?? {};
  if (!Array.isArray(urls) || urls.length === 0) {
    res.status(400).json({ error: "urls must be a non-empty array" });
    return;
  }

  // Validate and deduplicate
  const rawUrls: string[] = [...new Set(
    urls.map((u: unknown) => String(u ?? "").trim()).filter(Boolean)
  )];
  const safeUrls = rawUrls.filter(isAdminBulkImportUrl);

  resetBulkImportJob();
  bulkImportJob.status = "running";
  bulkImportJob.total = rawUrls.length;   // total = ALL input URLs so progress math is consistent
  bulkImportJob.startedAt = Date.now();

  // Pre-populate errors for invalid/non-allowlisted URLs and advance processed counter
  for (const u of rawUrls.filter(u => !isAdminBulkImportUrl(u))) {
    bulkImportJob.errors.push({ url: u, reason: "Domain not in allowed lab list (Janoshik, Uzorak, Peptidetest, Testides, Chromate, Analiza Bialek)" });
    bulkImportJob.failed++;
    bulkImportJob.processed++;
  }

  res.json({ ok: true, total: rawUrls.length, job: bulkImportJob });

  (async () => {
    for (const url of safeUrls) {
      if (bulkImportJob.status !== "running") break;

      try {
        // Skip if URL already in DB (fast pre-check before extraction)
        const urlExisting = await db
          .select({ id: labTestsTable.id })
          .from(labTestsTable)
          .where(eq(labTestsTable.url, url))
          .limit(1);

        if (urlExisting.length > 0) {
          bulkImportJob.skipped++;
          bulkImportJob.processed++;
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        // Extract CoA data — do NOT insert if extraction fails
        const extracted = await extractCoADataFromAnyUrl(url);
        if (!extracted) {
          bulkImportJob.failed++;
          bulkImportJob.errors.push({ url, reason: "No images found or AI extraction failed — record not created" });
          bulkImportJob.processed++;
          await new Promise(r => setTimeout(r, 300));
          continue;
        }

        const importSupplier = supplier.trim() || "Uther";
        const importBatchCode = extracted.batchCode ?? null;
        const importBlend = Array.isArray(extracted.blendComponents) && extracted.blendComponents.length > 0
          ? JSON.stringify(extracted.blendComponents) : null;
        const importName = resolveUtherName(importSupplier, importBatchCode, extracted.compoundName ?? "Unknown");

        // Post-extraction fingerprint check (catches same batch+date+name even if URL differs)
        const fingerprintDupId = await findLabTestDuplicate(null, importBatchCode, extracted.testDate ?? null, importName);
        if (fingerprintDupId !== null) {
          bulkImportJob.skipped++;
          bulkImportJob.processed++;
          await new Promise(r => setTimeout(r, 200));
          continue;
        }

        const newRecord: NewLabTest = {
          url,
          peptideName: importName,
          supplier: importSupplier,
          labName: labName.trim() || "Janoshik",
          isThirdPartyTest: Boolean(isThirdParty),
          pending: false,
          aiExtracted: true,
          aiExtractedAt: new Date(),
          purityPct: extracted.purityPct ?? null,
          endotoxinEuMg: extracted.endotoxinEuMg ?? null,
          sterilityPass: extracted.sterilityPass ?? null,
          heavyMetalAs: extracted.heavyMetalAs ?? null,
          heavyMetalCd: extracted.heavyMetalCd ?? null,
          heavyMetalPb: extracted.heavyMetalPb ?? null,
          heavyMetalHg: extracted.heavyMetalHg ?? null,
          batchCode: importBatchCode,
          testDate: extracted.testDate ?? null,
          testType: extracted.testType ?? null,
          productCategory: extracted.productCategory ?? null,
          notes: null,
          mgAmount: extracted.mgAmount ?? null,
          massUnit: extracted.massUnit ?? "mg",
          janoshikId: null,
          submittedBy: null,
          blendComponents: importBlend,
        };

        const [inserted] = await db.insert(labTestsTable).values(newRecord).returning();
        bulkImportJob.imported++;
        bulkImportJob.results.push({
          url,
          id: inserted.id,
          peptideName: inserted.peptideName,
          purityPct: inserted.purityPct,
        });

        // Fire-and-forget certificate fetch for instant future previews
        tryFetchAndStoreCertificate(inserted.id, url).catch(() => {});
      } catch (err) {
        bulkImportJob.failed++;
        bulkImportJob.errors.push({ url, reason: String(err) });
      }

      bulkImportJob.processed++;
      await new Promise(r => setTimeout(r, 1000));
    }

    bulkImportJob.status = "done";
    bulkImportJob.finishedAt = Date.now();
  })().catch(err => {
    console.error("[bulk-import]", err);
    bulkImportJob.status = "error";
    bulkImportJob.finishedAt = Date.now();
  });
});

// ── POST /api/admin/lab-tests/backfill-certs — fetch & store missing certs ────
// One-time background job: for every test that has a URL but no pdf_blob,
// try to download and store the certificate. Fire-and-forget, returns immediately.
let certBackfillRunning = false;
router.post("/admin/lab-tests/backfill-certs", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (certBackfillRunning) {
    res.status(409).json({ error: "Backfill already running" });
    return;
  }
  // Find all tests with a URL but no stored blob
  const missing = await db
    .select({ id: labTestsTable.id, url: labTestsTable.url })
    .from(labTestsTable)
    .where(and(isNotNull(labTestsTable.url), isNull(labTestsTable.pdfBlob)));

  res.json({ ok: true, total: missing.length, message: `Backfilling ${missing.length} certificates in background` });

  certBackfillRunning = true;
  (async () => {
    let stored = 0;
    for (const { id, url } of missing) {
      if (!url) continue;
      await tryFetchAndStoreCertificate(id, url);
      stored++;
      // Small delay to avoid hammering external servers
      await new Promise(r => setTimeout(r, 500));
    }
    console.log(`[cert-backfill] Done — attempted ${missing.length}, stored ${stored}`);
    certBackfillRunning = false;
  })().catch(err => {
    console.error("[cert-backfill] Error:", err);
    certBackfillRunning = false;
  });
});

// ── GET /api/admin/lab-tests/backfill-certs — check backfill status ───────────
router.get("/admin/lab-tests/backfill-certs", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(labTestsTable)
    .where(and(isNotNull(labTestsTable.url), isNull(labTestsTable.pdfBlob)));
  res.json({ running: certBackfillRunning, missingCount: count });
});

// ── POST /api/admin/lab-tests/bulk-import-stop — cancel running import ────────
router.post("/admin/lab-tests/bulk-import-stop", (req, res) => {
  if (!requireAdmin(req, res)) return;
  if (bulkImportJob.status === "running") {
    bulkImportJob.status = "done";
    bulkImportJob.finishedAt = Date.now();
  }
  res.json({ ok: true, job: bulkImportJob });
});

export default router;
