import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bloodTestSessionsTable, bloodTestValuesTable, compoundLogsTable, accountsTable, btConversationsTable, siteConfigTable, btKnowledgeCacheTable, customerActivityLogsTable, labTestsTable, glp1LogsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray, gte, count } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { callSageAI, callSageAIStream } from "../lib/sage-ai";
import { type Glp1LogCtx } from "../lib/sage-system-prompt";
import { findProtocol, formatProtocolForSage } from "../lib/protocol-data";
import { logCustomerActivity } from "../lib/activity-log";
import { searchWebForSage, shouldSearchWeb } from "../lib/web-search";
import { fetchPepPediaContext } from "../lib/pep-pedia";
import { isWebSearchEnabled, getSageSystemPromptTemplate } from "./admin-sage-settings";

const router: IRouter = Router();

// ─── Knowledge base cache ─────────────────────────────────────────────────────

/** Keyword list used to extract topic keys from user messages + biomarker lists. */
const CACHE_KEYWORDS = [
  "anastrozole","exemestane","aromasin","aromatase","cabergoline","gonadorelin",
  "clomiphene","enclomiphene","hmg","hcg","fsh","lh",
  "shbg","testosterone","oestradiol","estradiol","progesterone","dhea","cortisol",
  "tsh","thyroid","hashimoto","graves","t3","t4","liothyronine","levothyroxine",
  "ferritin","iron","b12","folate","vitamin d",
  "insulin","hba1c","glucose","igf",
  "prolactin","growth hormone","ghrp","ipamorelin","bpc","tb500",
  "pcos","endometriosis","menopause","perimenopause","hrt","trt","aas",
  "hdl","ldl","triglyceride","cholesterol",
  "creatinine","egfr","kidney","liver","alt","ast","ggt","bilirubin",
  "haematocrit","haemoglobin","hemoglobin","red blood","white blood","platelet","mchc","mcv",
  "semaglutide","tirzepatide","glp","ozempic","mounjaro","wegovy",
  "vitamin","zinc","magnesium","selenium","iodine",
  "crp","inflammation","autoimmune",
  "sleep","cortisol","melatonin","stress",
  "erectile","libido","mood","fatigue","energy",
];

/** Pull topic keys out of the current message and out-of-range biomarkers. */
function extractTopicsForCache(
  message: string,
  biomarkers: Array<{ name: string; value: number; refRangeLow: number | null; refRangeHigh: number | null; status: string }>,
): string[] {
  const topics = new Set<string>();

  // Out-of-range / borderline biomarkers → "markerslug_high" / "markerslug_low"
  for (const b of biomarkers) {
    if (b.status === "out_of_range" || b.status === "borderline") {
      const slug = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 22);
      const dir = b.refRangeHigh != null && b.value > b.refRangeHigh ? "high" : "low";
      topics.add(`${slug}_${dir}`);
      topics.add(slug);
    }
  }

  // Keywords found in the user message
  const lc = message.toLowerCase();
  for (const kw of CACHE_KEYWORDS) {
    if (lc.includes(kw)) {
      topics.add(kw.replace(/\s+/g, "_").slice(0, 30));
    }
  }

  return [...topics].slice(0, 10);
}

/** Fetch cached community knowledge for a set of topic keys. Also bumps hit counters. */
async function lookupKnowledgeCache(topics: string[]): Promise<Array<{ topic: string; summary: string }>> {
  if (topics.length === 0) return [];
  try {
    const rows = await db
      .select({ topic: btKnowledgeCacheTable.topic, summary: btKnowledgeCacheTable.summary })
      .from(btKnowledgeCacheTable)
      .where(inArray(btKnowledgeCacheTable.topic, topics.slice(0, 10)));

    if (rows.length > 0) {
      // Non-blocking hit counter bump
      db.update(btKnowledgeCacheTable)
        .set({ hits: sql`${btKnowledgeCacheTable.hits} + 1` })
        .where(inArray(btKnowledgeCacheTable.topic, rows.map(r => r.topic)))
        .catch(() => {});
    }
    return rows;
  } catch {
    return [];
  }
}

/**
 * Fire-and-forget: ask Gemini to extract any cacheable community knowledge from
 * a response and store it in bt_knowledge_cache. Runs after the main response
 * is already sent so it never delays the user.
 */
function extractAndCacheKnowledge(responseText: string): void {
  if (!responseText || responseText.length < 150) return;

  const extractPrompt = `You are extracting reusable health community knowledge from a health-assistant response.

Identify 0–4 distinct pieces of community/forum/anecdotal wisdom in the response below. Focus on real-world protocol experience, not generic textbook facts.

Response text:
${responseText.slice(0, 3500)}

Return ONLY valid JSON (no markdown fences):
[{"topic":"snake_case_max_35chars","summary":"2–4 sentences of the specific community consensus or anecdotal wisdom. Include context (e.g. typical values, protocol adjustments, common experiences). Be concrete."}]

Rules:
- Only include genuine forum/community/anecdotal insight — NOT generic medical definitions
- topic must be snake_case, 5–35 chars (e.g. "high_shbg_trt_causes", "anastrozole_rebound_e2", "oestradiol_low_ai_over_control")
- Return [] if nothing worth caching is present`;

  callSageAI({
    messages: [{ role: "user", content: extractPrompt }],
    maxTokens: 1024,
  }).then(async (rawText) => {
    const raw = rawText.trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    let entries: Array<{ topic: string; summary: string }>;
    try { entries = JSON.parse(raw); } catch { return; }
    if (!Array.isArray(entries)) return;

    for (const entry of entries.slice(0, 4)) {
      if (!entry?.topic || !entry?.summary) continue;
      const topic = entry.topic.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_|_$/g, "").slice(0, 40);
      if (topic.length < 5) continue;
      await db.insert(btKnowledgeCacheTable)
        .values({
          topic,
          summary: entry.summary.slice(0, 2000),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: btKnowledgeCacheTable.topic,
          set: { summary: sql`EXCLUDED.summary`, updatedAt: new Date() },
        })
        .catch(() => {});
      console.log(`[knowledge-cache] Cached topic: ${topic}`);
    }
  }).catch(() => {});
}

// Normalise incoming date strings to ISO YYYY-MM-DD.
// Accepts: YYYY-MM-DD (unchanged), DD/MM/YYYY, DD/MM/YY (expands to 20YY).
function normalizeDate(raw: string): string | null {
  const t = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (m) {
    const y = 2000 + parseInt(m[3], 10);
    return `${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  return null;
}

// ─── Health intelligence helpers ─────────────────────────────────────────────

const RECOMMENDATIONS: Record<string, { compound: string; reason: string }[]> = {
  "Total Testosterone": [
    { compound: "Gonadorelin",    reason: "LH/FSH analogue that stimulates endogenous testosterone production" },
    { compound: "Vitamin D3",     reason: "Consistently associated with low testosterone when deficient" },
    { compound: "Zinc",           reason: "Essential cofactor in the testosterone synthesis pathway" },
  ],
  "Testosterone": [
    { compound: "Gonadorelin",    reason: "LH/FSH analogue that stimulates endogenous testosterone production" },
    { compound: "Vitamin D3",     reason: "Consistently associated with low testosterone when deficient" },
  ],
  "Free Testosterone": [
    { compound: "Boron",          reason: "Shown to reduce SHBG and increase free testosterone" },
    { compound: "Zinc",           reason: "Supports testosterone synthesis and may reduce SHBG" },
  ],
  "LH": [
    { compound: "Gonadorelin",    reason: "Direct LH analogue — stimulates Leydig cell testosterone production" },
    { compound: "Clomiphene",     reason: "SERM that raises LH/FSH by blocking hypothalamic oestrogen feedback" },
  ],
  "Luteinising Hormone": [
    { compound: "Gonadorelin",    reason: "Direct LH analogue — stimulates Leydig cell testosterone production" },
    { compound: "Clomiphene",     reason: "SERM that raises LH/FSH by blocking hypothalamic oestrogen feedback" },
  ],
  "FSH": [
    { compound: "Gonadorelin",    reason: "Stimulates FSH alongside LH through pituitary signalling" },
  ],
  "Follicle Stimulating Hormone": [
    { compound: "Gonadorelin",    reason: "Stimulates FSH alongside LH through pituitary signalling" },
  ],
  "IGF-1": [
    { compound: "Ipamorelin",     reason: "GHRP that increases GH pulse amplitude, raising IGF-1" },
    { compound: "CJC-1295",       reason: "GHRH analogue that amplifies GH secretion and IGF-1 production" },
    { compound: "GHRP-6",         reason: "Potent GH secretagogue, elevates IGF-1 via hypothalamic pathways" },
  ],
  "ALT": [
    { compound: "BPC-157",        reason: "Shown to reduce liver inflammation and aid hepatocyte repair" },
    { compound: "TUDCA",          reason: "Bile acid supplement with hepatoprotective properties" },
    { compound: "NAC",            reason: "Glutathione precursor that supports hepatic detoxification" },
  ],
  "Alanine Transaminase": [
    { compound: "BPC-157",        reason: "Shown to reduce liver inflammation and aid hepatocyte repair" },
    { compound: "TUDCA",          reason: "Bile acid supplement with hepatoprotective properties" },
    { compound: "NAC",            reason: "Glutathione precursor that supports hepatic detoxification" },
  ],
  "AST": [
    { compound: "BPC-157",        reason: "Hepatoprotective peptide shown to lower transaminase levels" },
    { compound: "TUDCA",          reason: "Reduces bile salt toxicity and liver stress markers" },
    { compound: "NAC",            reason: "Raises glutathione — the liver's primary antioxidant" },
  ],
  "GGT": [
    { compound: "NAC",            reason: "N-Acetyl Cysteine raises glutathione and reduces GGT" },
    { compound: "TUDCA",          reason: "Supports bile flow and reduces hepatocellular stress" },
  ],
  "Gamma-Glutamyl Transferase": [
    { compound: "NAC",            reason: "N-Acetyl Cysteine raises glutathione and reduces GGT" },
    { compound: "TUDCA",          reason: "Supports bile flow and reduces hepatocellular stress" },
  ],
  "Vitamin D": [
    { compound: "Vitamin D3 + K2", reason: "Direct supplementation at 2,000–10,000 IU/day to raise serum levels" },
  ],
  "Vitamin B12": [
    { compound: "Vitamin B12 (Methylcobalamin)", reason: "Injection or sublingual form for optimal absorption" },
  ],
  "Total Cholesterol": [
    { compound: "Omega-3 (EPA/DHA)", reason: "High-dose fish oil reduces triglycerides and improves lipid profile" },
    { compound: "BPC-157",           reason: "Anecdotally reported to have lipid-improving properties" },
  ],
  "LDL": [
    { compound: "Omega-3 (EPA/DHA)", reason: "Reduces LDL particle count and triglycerides" },
    { compound: "Red Yeast Rice",     reason: "Natural statin-like compound shown to reduce LDL" },
  ],
  "Low-Density Lipoprotein": [
    { compound: "Omega-3 (EPA/DHA)", reason: "Reduces LDL particle count and triglycerides" },
    { compound: "Red Yeast Rice",     reason: "Natural statin-like compound shown to reduce LDL" },
  ],
  "HDL": [
    { compound: "Omega-3 (EPA/DHA)", reason: "Raises HDL through improved lipid metabolism" },
  ],
  "High-Density Lipoprotein": [
    { compound: "Omega-3 (EPA/DHA)", reason: "Raises HDL through improved lipid metabolism" },
  ],
  "Triglycerides": [
    { compound: "Omega-3 (EPA/DHA)", reason: "Most evidence-backed intervention for reducing triglycerides" },
  ],
  "Haemoglobin": [
    { compound: "Iron (Ferrous Bisglycinate)", reason: "Addresses iron deficiency anaemia with high bioavailability" },
    { compound: "Vitamin B12",                  reason: "Required for red blood cell maturation" },
  ],
  "Ferritin": [
    { compound: "Iron (Ferrous Bisglycinate)", reason: "Replenishes iron stores efficiently with low GI side effects" },
    { compound: "Vitamin C",                   reason: "Enhances non-haem iron absorption when taken together" },
  ],
  "eGFR": [
    { compound: "BPC-157",   reason: "Renoprotective effects observed in multiple animal models" },
    { compound: "Hydration", reason: "Adequate daily water intake is critical for maintaining GFR" },
  ],
  "Estimated Glomerular Filtration Rate": [
    { compound: "BPC-157",   reason: "Renoprotective effects observed in multiple animal models" },
    { compound: "Hydration", reason: "Adequate daily water intake is critical for maintaining GFR" },
  ],
  "Haematocrit": [
    { compound: "Therapeutic phlebotomy", reason: "Donate blood — first-line treatment for TRT/AAS-elevated haematocrit" },
    { compound: "Hydration",              reason: "Adequate daily water reduces haemoconcentration" },
  ],
  "TSH": [
    { compound: "Selenium",     reason: "Essential cofactor for thyroid hormone synthesis and T4→T3 conversion" },
    { compound: "Iodine",       reason: "Rate-limiting substrate for thyroid hormone production" },
  ],
  "Thyroid Stimulating Hormone": [
    { compound: "Selenium",     reason: "Essential cofactor for thyroid hormone synthesis and T4→T3 conversion" },
    { compound: "Iodine",       reason: "Rate-limiting substrate for thyroid hormone production" },
  ],
  "SHBG": [
    { compound: "Boron",        reason: "Shown to reduce SHBG and increase free testosterone" },
  ],
  "Sex Hormone Binding Globulin": [
    { compound: "Boron",        reason: "Shown to reduce SHBG and increase free testosterone" },
  ],
  "Oestradiol": [
    { compound: "Anastrozole",  reason: "Aromatase inhibitor that reduces oestradiol conversion from androgens" },
    { compound: "Exemestane",   reason: "Steroidal AI with fewer rebound effects than non-steroidal options" },
  ],
  "Prolactin": [
    { compound: "Cabergoline",  reason: "Dopamine agonist that effectively suppresses elevated prolactin" },
    { compound: "Vitamin B6 (P5P)", reason: "Pyridoxal-5-phosphate may help modestly reduce prolactin levels" },
  ],
};

// Compound-type-aware advice rules.
interface AdviceRule {
  compoundTypes: string[];
  marker: string;
  direction: "low" | "high" | "any";
  headline: string;
  body: string;
  severity: "info" | "warning" | "caution";
}

// Short-name → full-name aliases for backward compatibility with older blood test records
const BIOMARKER_ALIAS_MAP: Record<string, string> = {
  "LH": "Luteinising Hormone",
  "FSH": "Follicle Stimulating Hormone",
  "HDL": "High-Density Lipoprotein",
  "LDL": "Low-Density Lipoprotein",
  "ALT": "Alanine Transaminase",
  "AST": "Aspartate Aminotransferase",
  "GGT": "Gamma-Glutamyl Transferase",
  "ALB": "Albumin",
  "ALP": "Alkaline Phosphatase",
  "BILI": "Bilirubin",
  "TSH": "Thyroid Stimulating Hormone",
  "SHBG": "Sex Hormone Binding Globulin",
  "TEST": "Testosterone",
  "FTEST": "Free Testosterone",
  "ESTR": "Oestradiol",
  "PROL": "Prolactin",
  "FT4": "Free Thyroxine",
  "HCT": "Haematocrit",
  "HEMO": "Haemoglobin",
  "RBC": "Red Blood Cells",
  "WBC": "White Blood Cells",
  "LYMPH": "Lymphocytes",
  "MONO": "Monocytes",
  "NEUT": "Neutrophils",
  "PLT": "Platelets",
  "MCV": "Mean Cell Volume",
  "MCHC": "Mean Cell Haemoglobin Concentration",
  "MCH": "Mean Cell Haemoglobin",
  "BASO": "Basophils",
  "EOS": "Eosinophils",
  "CHOL": "Total Cholesterol",
  "THDL": "Total Cholesterol: HDL Ratio",
  "CREA": "Creatinine",
  "eGFR": "Estimated Glomerular Filtration Rate",
  "UREA": "Urea",
  "HbA1c": "Glycated Haemoglobin (HbA1c)",
  "FER": "Ferritin",
  "PSA": "Prostate-Specific Antigen",
};

function normalizeBiomarkerName(name: string): string {
  return BIOMARKER_ALIAS_MAP[name] ?? name;
}

const ADVICE_RULES: AdviceRule[] = [
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Luteinising Hormone",
    direction: "low",
    headline: "LH suppression — consistent with androgen use",
    body: "Exogenous androgens suppress the HPG axis, lowering LH and FSH. This is expected on-cycle. If planning PCT or a cycle break, consider Gonadorelin or Clomiphene to restore endogenous production.",
    severity: "info",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Follicle Stimulating Hormone",
    direction: "low",
    headline: "FSH suppression — consistent with androgen use",
    body: "FSH suppression is expected with exogenous androgen use. Fertility may be impaired. Consider Gonadorelin if fertility preservation is a priority.",
    severity: "info",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Haematocrit",
    direction: "high",
    headline: "Elevated haematocrit — action recommended",
    body: "AAS/TRT use commonly elevates haematocrit due to erythropoietic stimulation. Values above 52% carry cardiovascular risk. Therapeutic phlebotomy (blood donation) is the first-line intervention. Ensure adequate hydration.",
    severity: "warning",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Haemoglobin",
    direction: "high",
    headline: "Elevated haemoglobin — likely androgen-driven",
    body: "Elevated haemoglobin is a common side effect of androgen use. Monitor haematocrit closely and consider donating blood if haematocrit exceeds 52%.",
    severity: "caution",
  },
  {
    compoundTypes: ["AAS"],
    marker: "High-Density Lipoprotein",
    direction: "low",
    headline: "Low HDL — lipid dysregulation from AAS",
    body: "Anabolic steroids commonly suppress HDL cholesterol. High-dose Omega-3 (EPA/DHA) is the most evidence-backed intervention. Minimising saturated fat and increasing aerobic exercise also helps.",
    severity: "warning",
  },
  {
    compoundTypes: ["AAS"],
    marker: "Low-Density Lipoprotein",
    direction: "high",
    headline: "Elevated LDL — lipid dysregulation from AAS",
    body: "AAS use frequently raises LDL. Omega-3 fish oil and dietary adjustments are first-line. Red Yeast Rice may help in resistant cases. Consider monitoring lipids monthly during a cycle.",
    severity: "warning",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Alanine Transaminase",
    direction: "high",
    headline: "Elevated ALT — hepatic stress",
    body: "Elevated liver enzymes can occur with androgen use. BPC-157, TUDCA, and NAC are hepatoprotective compounds that may support recovery. Avoid alcohol and unnecessary hepatotoxic medications.",
    severity: "warning",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Aspartate Aminotransferase",
    direction: "high",
    headline: "Elevated AST — hepatic stress",
    body: "AST elevation alongside ALT suggests hepatocellular stress. BPC-157 and TUDCA have hepatoprotective properties supported by research. Review oral compound usage if present.",
    severity: "warning",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Gamma-Glutamyl Transferase",
    direction: "high",
    headline: "Elevated GGT — hepatic stress",
    body: "GGT elevation is a sensitive marker of liver stress and alcohol metabolism. NAC and TUDCA can support liver function. Review oral compounds if GGT is persistently elevated.",
    severity: "warning",
  },
  {
    compoundTypes: ["Peptide"],
    marker: "IGF-1",
    direction: "high",
    headline: "Elevated IGF-1 — expected with GH secretagogue use",
    body: "IGF-1 elevation is an expected outcome of GH peptide use (Ipamorelin, CJC-1295, GHRP-6, Tesamorelin). Monitor fasting glucose alongside IGF-1, as elevated GH activity can impair insulin sensitivity.",
    severity: "info",
  },
  {
    compoundTypes: ["Peptide"],
    marker: "Fasting Glucose",
    direction: "high",
    headline: "Elevated fasting glucose — monitor insulin sensitivity",
    body: "GH peptides can blunt insulin sensitivity, raising fasting glucose. Avoid dosing peptides pre-meal and consider monitoring HbA1c if fasting glucose remains persistently elevated.",
    severity: "caution",
  },
  {
    compoundTypes: ["AAS", "TRT"],
    marker: "Oestradiol",
    direction: "high",
    headline: "Elevated oestradiol — aromatisation from androgens",
    body: "Elevated oestradiol is common with testosterone-based compounds due to aromatisation. Symptoms include water retention and gynecomastia risk. An aromatase inhibitor (Anastrozole, Exemestane) may be appropriate — start low and retest.",
    severity: "caution",
  },
];

// Testing schedule recommendations keyed by compound type
const TESTING_SCHEDULE_RULES: { compoundTypes: string[]; schedule: string }[] = [
  {
    compoundTypes: ["AAS", "TRT"],
    schedule: "On AAS/TRT — retest full blood count, liver panel (ALT, AST, GGT), and hormone panel (LH, FSH, total testosterone, oestradiol) every 6–8 weeks",
  },
  {
    compoundTypes: ["Peptide"],
    schedule: "On GH peptides — monitor IGF-1 every 3 months and fasting glucose monthly",
  },
];

// ─── Status + borderline helpers ─────────────────────────────────────────────

function parseNum(s: string | null | undefined): number | null {
  if (s == null || s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function getStatus(
  val: number,
  low: number | null,
  high: number | null,
): "in_range" | "borderline" | "out_of_range" | "no_range" {
  if (low == null && high == null) return "no_range";
  if (low != null && val < low) return "out_of_range";
  if (high != null && val > high) return "out_of_range";

  if (low != null && high != null) {
    const width = high - low;
    const zone = width * 0.15;
    if (val <= low + zone || val >= high - zone) return "borderline";
  } else if (low != null && val <= low * 1.15) {
    return "borderline";
  } else if (high != null && val >= high * 0.85) {
    return "borderline";
  }

  return "in_range";
}

function getTrend(current: number, previous: number | null): "up" | "down" | "stable" {
  if (previous == null) return "stable";
  const pct = (current - previous) / Math.abs(previous);
  if (pct > 0.05) return "up";
  if (pct < -0.05) return "down";
  return "stable";
}

// ─── Discuss AI helper ────────────────────────────────────────────────────────

interface BiomarkerContext {
  name: string;
  value: number;
  unit: string;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  status: string;
}

type HistoryMessage = { role: "user" | "assistant"; content: string };

interface SessionHistoryContext {
  name: string;
  date: string;
  biomarkers: BiomarkerContext[];
}

interface LabTestContext {
  peptideName: string;
  batchCode: string | null;
  labName: string;
  testDate: string | null;
  supplier: string;
  purityPct: number | null;
  endotoxinEuMg: number | null;
  sterilityPass: boolean | null;
  heavyMetalAs: string | null;
  heavyMetalCd: string | null;
  heavyMetalPb: string | null;
  heavyMetalHg: string | null;
  notes: string | null;
}

// ─── Sage chart data (dated per-biomarker time series for inline chat charts) ─

interface ChartSeriesPoint {
  date: string;
  value: number;
}

interface ChartSeries {
  marker: string;
  unit: string;
  refRangeLow: number | null;
  refRangeHigh: number | null;
  points: ChartSeriesPoint[];
}

/** Builds a dated time series per biomarker name across the current session + all historical sessions. */
function buildChartableSeries(
  sessionDate: string,
  biomarkers: BiomarkerContext[],
  historicalSessions: SessionHistoryContext[],
): Map<string, ChartSeries> {
  const map = new Map<string, ChartSeries>();
  const addPoint = (name: string, date: string, value: number, unit: string, refLow: number | null, refHigh: number | null) => {
    const key = name.trim().toLowerCase();
    if (!map.has(key)) {
      map.set(key, { marker: name, unit, refRangeLow: refLow, refRangeHigh: refHigh, points: [] });
    }
    map.get(key)!.points.push({ date, value });
  };

  for (const b of biomarkers) addPoint(b.name, sessionDate, b.value, b.unit, b.refRangeLow, b.refRangeHigh);
  for (const s of historicalSessions) {
    for (const b of s.biomarkers) addPoint(b.name, s.date, b.value, b.unit, b.refRangeLow, b.refRangeHigh);
  }

  for (const series of map.values()) {
    series.points.sort((a, b) => a.date.localeCompare(b.date));
  }
  return map;
}

/** Resolves AI-requested marker names into real, server-verified chart series. Never trusts AI-generated numbers. */
function resolveCharts(requestedMarkers: string[], seriesMap: Map<string, ChartSeries>): ChartSeries[] {
  const out: ChartSeries[] = [];
  const seen = new Set<string>();
  for (const raw of requestedMarkers) {
    const key = raw.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const series = seriesMap.get(key);
    if (series && series.points.length >= 2) out.push(series);
    if (out.length >= 3) break;
  }
  return out;
}

/** Fetch up to 3 most-recent lab tests for each of the given compound names. Falls back to 10 most recent overall if no compounds given. */
async function fetchLabTestsForCompounds(compoundNames: string[]): Promise<LabTestContext[]> {
  const rows = compoundNames.length > 0
    ? await db
        .select({
          peptideName: labTestsTable.peptideName,
          batchCode: labTestsTable.batchCode,
          labName: labTestsTable.labName,
          testDate: labTestsTable.testDate,
          supplier: labTestsTable.supplier,
          purityPct: labTestsTable.purityPct,
          endotoxinEuMg: labTestsTable.endotoxinEuMg,
          sterilityPass: labTestsTable.sterilityPass,
          heavyMetalAs: labTestsTable.heavyMetalAs,
          heavyMetalCd: labTestsTable.heavyMetalCd,
          heavyMetalPb: labTestsTable.heavyMetalPb,
          heavyMetalHg: labTestsTable.heavyMetalHg,
          notes: labTestsTable.notes,
        })
        .from(labTestsTable)
        .where(
          and(
            inArray(labTestsTable.peptideName, compoundNames),
            eq(labTestsTable.pending, false),
          ),
        )
        .orderBy(desc(labTestsTable.createdAt))
        .limit(30)
    : await db
        .select({
          peptideName: labTestsTable.peptideName,
          batchCode: labTestsTable.batchCode,
          labName: labTestsTable.labName,
          testDate: labTestsTable.testDate,
          supplier: labTestsTable.supplier,
          purityPct: labTestsTable.purityPct,
          endotoxinEuMg: labTestsTable.endotoxinEuMg,
          sterilityPass: labTestsTable.sterilityPass,
          heavyMetalAs: labTestsTable.heavyMetalAs,
          heavyMetalCd: labTestsTable.heavyMetalCd,
          heavyMetalPb: labTestsTable.heavyMetalPb,
          heavyMetalHg: labTestsTable.heavyMetalHg,
          notes: labTestsTable.notes,
        })
        .from(labTestsTable)
        .where(eq(labTestsTable.pending, false))
        .orderBy(desc(labTestsTable.createdAt))
        .limit(10);

  // Deduplicate: keep max 3 most-recent per compound
  const seen = new Map<string, number>();
  const result: LabTestContext[] = [];
  for (const r of rows) {
    const n = (seen.get(r.peptideName) ?? 0);
    if (n < 3) {
      result.push(r);
      seen.set(r.peptideName, n + 1);
    }
  }
  return result;
}

interface CompoundWithDose {
  name: string;
  active: boolean;
  doseAmount?: string | null;
  doseUnit?: string | null;
  frequency?: string | null;
  route?: string | null;
}

function formatCompoundLine(c: CompoundWithDose): string {
  const parts: string[] = [c.name];
  if (c.doseAmount && c.doseUnit) parts.push(`${c.doseAmount} ${c.doseUnit}`);
  if (c.route) parts.push(`(${c.route})`);
  if (c.frequency) parts.push(`— ${c.frequency}`);
  return parts.join(" ");
}

async function buildBloodTestSystemPrompt(
  sessionName: string,
  sessionDate: string,
  biomarkers: BiomarkerContext[],
  activeCompounds: string[] = [],
  historicalSessions: SessionHistoryContext[] = [],
  cachedKnowledge: Array<{ topic: string; summary: string }> = [],
  labTests: LabTestContext[] = [],
  allCompounds: CompoundWithDose[] = [],
  hasBloodTest = true,
  chartableMarkers: string[] = [],
  glp1Logs: Glp1LogCtx[] = [],
): Promise<string> {
  const dateObj = new Date(sessionDate + "T00:00:00");
  const displayDate = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

  const biomarkerLines = biomarkers.map(b => {
    const rangeStr = b.refRangeLow != null && b.refRangeHigh != null
      ? `ref: ${b.refRangeLow}–${b.refRangeHigh} ${b.unit}`
      : b.refRangeHigh != null ? `ref: up to ${b.refRangeHigh} ${b.unit}` : "no ref range";
    const flag = b.status === "out_of_range" ? " ⚠ OUT OF RANGE" : b.status === "borderline" ? " ⚡ BORDERLINE" : "";
    return `  - ${b.name}: ${b.value} ${b.unit} (${rangeStr})${flag}`;
  }).join("\n");

  // Build compound context using allCompounds if available, else fall back to activeCompounds
  const enrichedActive = allCompounds.filter(c => c.active);
  const enrichedHistorical = allCompounds.filter(c => !c.active);
  const effectiveActive = allCompounds.length > 0 ? enrichedActive.map(c => c.name) : activeCompounds;

  const compoundsLine = [
    enrichedActive.length > 0
      ? `ACTIVE COMPOUNDS (currently being used — consider dose/route/frequency and impact on all biomarkers):\n${enrichedActive.map(c => `  - ${formatCompoundLine(c)}`).join("\n")}`
      : activeCompounds.length > 0
        ? `ACTIVE COMPOUNDS (currently being used — consider impact on all biomarkers): ${activeCompounds.join(", ")}`
        : `ACTIVE COMPOUNDS: None currently logged.`,
    enrichedHistorical.length > 0
      ? `HISTORICAL COMPOUNDS (previously used / cycled off):\n${enrichedHistorical.map(c => `  - ${formatCompoundLine(c)}`).join("\n")}`
      : "",
  ].filter(Boolean).join("\n");

  // Build protocol reference section for known compounds
  const compoundsToLookUp = [...effectiveActive, ...enrichedHistorical.map(c => c.name)];
  const protocolLines: string[] = [];
  for (const name of compoundsToLookUp) {
    const proto = findProtocol(name);
    if (proto) protocolLines.push(formatProtocolForSage(name, proto));
  }
  const protocolSection = protocolLines.length > 0
    ? `\n\n═══════════════════════════════════════════
PLATFORM PROTOCOL REFERENCE (from Salt&Peps protocols page — for the user's logged compounds)
═══════════════════════════════════════════
These are the established dosing protocols for the user's compounds as listed on the Salt&Peps protocols page. Use this data to assess whether their current regimen aligns with recommended practice, identify dosing issues, and give specific actionable guidance.

${protocolLines.join("\n\n")}`
    : "";

  let historicalSection = "";
  if (historicalSessions.length > 0) {
    const formatted = historicalSessions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(s => {
        const sDate = new Date(s.date + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });
        const lines = s.biomarkers.map(b => {
          const flag = b.status === "out_of_range" ? " ⚠" : b.status === "borderline" ? " ⚡" : "";
          return `    ${b.name}: ${b.value} ${b.unit}${flag}`;
        }).join("\n");
        return `  ${s.name} — ${sDate}:\n${lines}`;
      }).join("\n\n");
    historicalSection = `

═══════════════════════════════════════════
HISTORICAL BLOOD TEST DATA (oldest → newest, excluding current test)
═══════════════════════════════════════════
Use this data to discuss trends, improvements, or deterioration across time.
${formatted}`;
  }

  // Build per-marker baseline analysis across ALL sessions (current + historical)
  let persistentTrendsSection = "";
  if (historicalSessions.length > 0) {
    const allMarkerData = new Map<string, { values: number[]; refLow: number | null; refHigh: number | null; unit: string }>();

    // Include current session biomarkers
    for (const b of biomarkers) {
      if (!allMarkerData.has(b.name)) {
        allMarkerData.set(b.name, { values: [], refLow: b.refRangeLow, refHigh: b.refRangeHigh, unit: b.unit });
      }
      allMarkerData.get(b.name)!.values.push(b.value);
    }
    // Include all historical sessions
    for (const s of historicalSessions) {
      for (const b of s.biomarkers) {
        if (!allMarkerData.has(b.name)) {
          allMarkerData.set(b.name, { values: [], refLow: b.refRangeLow, refHigh: b.refRangeHigh, unit: b.unit });
        }
        allMarkerData.get(b.name)!.values.push(b.value);
      }
    }

    const trends: string[] = [];
    for (const [name, data] of allMarkerData) {
      if (data.values.length < 2) continue;
      const { values, refLow, refHigh, unit } = data;
      const avg = values.reduce((a, v) => a + v, 0) / values.length;
      const minV = Math.min(...values);
      const maxV = Math.max(...values);
      const countHigh = refHigh != null ? values.filter(v => v > refHigh).length : 0;
      const countLow  = refLow  != null ? values.filter(v => v < refLow).length  : 0;

      if (refHigh != null && countHigh === values.length) {
        trends.push(`  ${name}: PERSISTENTLY ABOVE RANGE in all ${values.length} tests (avg ${avg.toFixed(1)} ${unit}, observed range ${minV}–${maxV})`);
      } else if (refLow != null && countLow === values.length) {
        trends.push(`  ${name}: PERSISTENTLY BELOW RANGE in all ${values.length} tests (avg ${avg.toFixed(1)} ${unit}, observed range ${minV}–${maxV})`);
      } else if (refHigh != null && countHigh >= Math.ceil(values.length * 0.67)) {
        trends.push(`  ${name}: MOSTLY ABOVE RANGE (${countHigh}/${values.length} tests, avg ${avg.toFixed(1)} ${unit})`);
      } else if (refLow != null && countLow >= Math.ceil(values.length * 0.67)) {
        trends.push(`  ${name}: MOSTLY BELOW RANGE (${countLow}/${values.length} tests, avg ${avg.toFixed(1)} ${unit})`);
      }
    }

    if (trends.length > 0) {
      persistentTrendsSection = `

═══════════════════════════════════════════
ESTABLISHED PATIENT BASELINES — READ BEFORE INTERPRETING
═══════════════════════════════════════════
These patterns are confirmed across ${historicalSessions.length + 1} test sessions spanning the patient's full history. They represent this person's established physiology, NOT a transient result. CRITICAL RULE: never interpret a single recent data point as evidence of the opposite of a long-established trend. If a marker is listed as PERSISTENTLY ABOVE RANGE, do not frame it as "low" or "below range" in your response — always discuss it in the context of the established pattern.
${trends.join("\n")}`;
    }
  }

  const knowledgeSection = cachedKnowledge.length > 0
    ? `\n\n═══════════════════════════════════════════
CACHED COMMUNITY KNOWLEDGE (already researched — incorporate directly, no need to re-search these topics)
═══════════════════════════════════════════
The following community/forum insights have been retrieved from our knowledge base. Use them to inform your response. Do NOT search the web for these topics again — the knowledge is already here.
${cachedKnowledge.map(k => `[${k.topic.toUpperCase().replace(/_/g, " ")}]\n${k.summary}`).join("\n\n")}`
    : "";

  const labTestSection = labTests.length > 0
    ? `\n\n═══════════════════════════════════════════
LAB TEST CERTIFICATES (CoA — third-party quality tests for compounds used by this member)
═══════════════════════════════════════════
These are independently verified Certificate of Analysis (CoA) results from ${labTests[0]?.labName ?? "third-party labs"} for the peptide compounds relevant to this member. Use this data to:
- Confirm purity when discussing dosing accuracy or expected effect strength
- Highlight if a batch had sterility or endotoxin concerns
- Reassure (or flag concern) about product quality when relevant to symptoms or bloodwork

${labTests.map(t => {
  const parts: string[] = [`[${t.peptideName}${t.batchCode ? ` — batch ${t.batchCode}` : ""}]`];
  parts.push(`  Lab: ${t.labName} | Supplier: ${t.supplier}${t.testDate ? ` | Tested: ${t.testDate}` : ""}`);
  if (t.purityPct != null) parts.push(`  Purity: ${t.purityPct}%`);
  if (t.endotoxinEuMg != null) parts.push(`  Endotoxin: ${t.endotoxinEuMg} EU/mg`);
  if (t.sterilityPass != null) parts.push(`  Sterility: ${t.sterilityPass ? "PASS ✓" : "FAIL ✗"}`);
  const metals = [
    t.heavyMetalAs ? `As: ${t.heavyMetalAs}` : null,
    t.heavyMetalCd ? `Cd: ${t.heavyMetalCd}` : null,
    t.heavyMetalPb ? `Pb: ${t.heavyMetalPb}` : null,
    t.heavyMetalHg ? `Hg: ${t.heavyMetalHg}` : null,
  ].filter(Boolean);
  if (metals.length > 0) parts.push(`  Heavy metals: ${metals.join(", ")}`);
  if (t.notes) parts.push(`  Notes: ${t.notes}`);
  return parts.join("\n");
}).join("\n\n")}`
    : "";

  const glp1Section = glp1Logs.length > 0
    ? `\n\n═══════════════════════════════════════════
GLP-1 INJECTION LOG (most recent entries, newest first)
═══════════════════════════════════════════
Use this data to discuss dosing progression, weight trends, side effects, and adherence. Weight is stored in kg.
${glp1Logs.map(l => {
  const parts: string[] = [`  ${l.loggedDate}: ${l.compoundName} ${l.doseMg}mg`];
  if (l.weightKg != null) parts.push(`weight ${l.weightKg}kg`);
  if (l.injectionSite) parts.push(`site: ${l.injectionSite}`);
  if (l.sideEffects) { try { const arr = JSON.parse(l.sideEffects) as string[]; if (arr.length) parts.push(`side effects: ${arr.join(", ")}`); } catch { parts.push(`side effects: ${l.sideEffects}`); } }
  if (l.calories != null) parts.push(`calories: ${l.calories} kcal`);
  if (l.proteinG != null) parts.push(`protein: ${l.proteinG}g`);
  if (l.notes) parts.push(`notes: ${l.notes}`);
  return parts.join(" | ");
}).join("\n")}`
    : "";

  const healthDataBlock = hasBloodTest
    ? `IMPORTANT: The following blood test results and compounds ARE this user's actual data, retrieved directly from their account. You have full access to it. Do NOT ask the user to share, paste, or upload their results — you already have them. Answer questions about their bloodwork directly using the data below.

BLOOD TEST (CURRENT — most recent): ${sessionName} — ${displayDate}
BIOMARKERS:
${biomarkerLines}

${compoundsLine}${protocolSection}${historicalSection}${persistentTrendsSection}${glp1Section}${knowledgeSection}${labTestSection}`
    : `BLOOD TEST STATUS: No blood test on file yet for this member.

IMPORTANT BEHAVIOUR RULE: In your FIRST response in this conversation, and ONLY the first, open with a single short sentence acknowledging that you don't have any blood test results on file for them yet. Mention that they can upload a blood test via the Blood Tests section of their profile to unlock personalised biomarker analysis. Then pivot IMMEDIATELY to being genuinely helpful with whatever they asked — compound protocols, dosing questions, general health optimisation. Do NOT repeat this notice in any subsequent messages.

${compoundsLine}${protocolSection}${glp1Section}${knowledgeSection}${labTestSection}`;

  const chartMarkersBlock = chartableMarkers.length > 0
    ? `You may ONLY request charts for markers in this exact list (each has 2+ dated results on file for this user): ${chartableMarkers.join(", ")}. Use the exact marker name as written here.`
    : "This user currently has no biomarker with 2+ dated results on file, so you cannot request any chart right now.";

  const template = await getSageSystemPromptTemplate();
  return template
    .split("{{HEALTH_DATA}}").join(healthDataBlock)
    .split("{{CHARTABLE_MARKERS}}").join(chartMarkersBlock);
}

const CHIPS_RE = /CHIPS_JSON_START(\[[\s\S]*?\])CHIPS_JSON_END/;
const SOURCES_RE = /SOURCES_JSON_START(\[[\s\S]*?\])SOURCES_JSON_END/;
const CHART_RE = /CHART_JSON_START(\[[\s\S]*?\])CHART_JSON_END/;
const Q_TAG_RE = /\[Q\]([\s\S]*?)\[\/Q\]/g;

interface DiscussSource { label: string; url: string; type: "study" | "forum" | "other" }

function parseResponse(raw: string): { text: string; chips: string[]; sources: DiscussSource[]; chartMarkers: string[] } {
  const chipsMatch = raw.match(CHIPS_RE);
  let chips: string[] = [];
  if (chipsMatch) {
    try { chips = JSON.parse(chipsMatch[1]) as string[]; } catch { chips = []; }
    if (!Array.isArray(chips)) chips = [];
    chips = chips.filter((c): c is string => typeof c === "string" && c.trim().length > 0).slice(0, 4);
  }

  const sourcesMatch = raw.match(SOURCES_RE);
  let sources: DiscussSource[] = [];
  if (sourcesMatch) {
    try { sources = JSON.parse(sourcesMatch[1]) as DiscussSource[]; } catch { sources = []; }
    if (!Array.isArray(sources)) sources = [];
    sources = sources
      .filter((s): s is DiscussSource => typeof s === "object" && s !== null && typeof s.label === "string" && typeof s.url === "string")
      .slice(0, 3);
  }

  const chartMatch = raw.match(CHART_RE);
  let chartMarkers: string[] = [];
  if (chartMatch) {
    try { chartMarkers = JSON.parse(chartMatch[1]) as string[]; } catch { chartMarkers = []; }
    if (!Array.isArray(chartMarkers)) chartMarkers = [];
    chartMarkers = chartMarkers.filter((c): c is string => typeof c === "string" && c.trim().length > 0).slice(0, 2);
  }

  // Extract [Q]...[/Q] follow-up questions from text and add to chips
  let text = raw.replace(CHIPS_RE, "").replace(SOURCES_RE, "").replace(CHART_RE, "");
  const qMatches = [...text.matchAll(Q_TAG_RE)];
  for (const m of qMatches) {
    const q = m[1].trim();
    if (q && !chips.includes(q)) chips.push(q);
  }
  // Strip [Q] tags from displayed text
  text = text.replace(Q_TAG_RE, "").trim();

  return { text: text || "Sorry, I wasn't able to generate a response. Please try again.", chips, sources, chartMarkers };
}

// ─── Sage output safety filter ────────────────────────────────────────────────
// Scans AI responses server-side before they reach the user.
// Blocks anything that looks like code, SQL, shell commands, or secret patterns.
const SAGE_OUTPUT_BLOCK_PATTERNS: RegExp[] = [
  // Code fences
  /```[\s\S]{0,5000}```/i,
  /~~~[\s\S]{0,5000}~~~/i,
  // SQL keywords (destructive or structural)
  /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w|DELETE\s+FROM|DROP\s+TABLE|DROP\s+DATABASE|ALTER\s+TABLE|CREATE\s+TABLE|TRUNCATE\s+TABLE|GRANT\s+|REVOKE\s+)\b/i,
  // Shell / CLI indicators
  /(?:^|\n)\s*\$\s+\S/m,
  /\b(sudo|chmod|chown|curl|wget|npm\s+install|pip\s+install|apt-get|brew\s+install)\b/i,
  // Secret key patterns
  /\bsk-[A-Za-z0-9]{10,}\b/,
  /\bBEARER\s+[A-Za-z0-9\-._~+/]{10,}\b/i,
  /\b(password|api_key|secret|token)\s*[:=]\s*\S{6,}/i,
];

const SAGE_OUTPUT_SAFE_REPLY = "I'm Sage — I can only help with blood tests, compounds, and health protocols.";

function filterSageOutput(text: string): string {
  for (const pattern of SAGE_OUTPUT_BLOCK_PATTERNS) {
    if (pattern.test(text)) {
      console.warn(`[sage-filter] Blocked response matching pattern: ${pattern.source.slice(0, 60)}`);
      return SAGE_OUTPUT_SAFE_REPLY;
    }
  }
  return text;
}

// ─── Sage input security scanner ──────────────────────────────────────────────
// Scans incoming user messages for prompt injection / jailbreak attempts BEFORE
// they are sent to the AI. Flags are logged to the audit trail. Users with 3+
// flags today are auto-blocked for the remainder of the day.

const SAGE_FLAGS_PER_DAY_LIMIT = 3;

const SAGE_INPUT_INJECTION_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ignore\s+(all\s+)?(previous|prior|above|your)\s+instructions/i,        label: "ignore_instructions" },
  { pattern: /forget\s+(all\s+)?(your\s+)?(rules|instructions|guidelines|training)/i, label: "forget_rules" },
  { pattern: /\b(jailbreak|dan\s+mode|developer\s+mode|god\s+mode|unlocked\s+mode)\b/i, label: "jailbreak_keyword" },
  { pattern: /act\s+as\s+(if\s+you\s+(are|were)|a\s+)?(?!sage\b)\w+/i,               label: "act_as_persona" },
  { pattern: /you\s+are\s+now\s+(?!sage\b)\w/i,                                       label: "persona_override" },
  { pattern: /pretend\s+(you\s+are|to\s+be|you\s+have\s+no)/i,                        label: "pretend_persona" },
  { pattern: /new\s+(system\s+)?prompt[\s:]/i,                                         label: "new_system_prompt" },
  { pattern: /\[system\]|\[assistant\]|\[user\].*override/i,                           label: "role_injection" },
  { pattern: /repeat\s+(everything|all|your\s+instructions|the\s+system\s+prompt)/i,  label: "prompt_extraction" },
  { pattern: /what\s+(are|were)\s+your\s+(exact\s+)?(instructions|system\s+prompt|rules)/i, label: "prompt_extraction" },
  { pattern: /translate\s+your\s+(instructions|system\s+prompt)\s+(to|into)/i,        label: "prompt_extraction" },
  { pattern: /hypothetically\s+if\s+you\s+(had\s+no\s+restrictions|were\s+allowed)/i, label: "hypothetical_bypass" },
  { pattern: /for\s+(educational|research|fictional|story|roleplay)\s+purposes?\s+(only\s+)?[,:]?\s*(please\s+)?(tell|explain|describe|provide|show|give)/i, label: "fictional_bypass" },
];

async function scanSageInput(
  message: string,
  telegramUsername: string,
): Promise<{ blocked: boolean; reason?: string; autoSuspended?: boolean }> {
  let matchedLabel: string | undefined;

  for (const { pattern, label } of SAGE_INPUT_INJECTION_PATTERNS) {
    if (pattern.test(message)) {
      matchedLabel = label;
      break;
    }
  }

  if (!matchedLabel) return { blocked: false };

  console.warn(`[sage-input-filter] Injection attempt by ${telegramUsername}: ${matchedLabel}`);

  // Log the flag to the audit trail (fire-and-forget)
  logCustomerActivity({
    telegramUsername,
    eventCategory: "security",
    eventType: "sage.injection_attempt",
    actorType: "customer",
    metadata: { pattern: matchedLabel, messagePreview: message.slice(0, 120) },
  }).catch(() => {});

  // Count how many flags this user has accumulated today
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [{ flagCount }] = await db
    .select({ flagCount: count() })
    .from(customerActivityLogsTable)
    .where(
      and(
        eq(customerActivityLogsTable.telegramUsername, telegramUsername),
        eq(customerActivityLogsTable.eventType, "sage.injection_attempt"),
        gte(customerActivityLogsTable.createdAt, todayStart),
      ),
    );

  const autoSuspended = flagCount >= SAGE_FLAGS_PER_DAY_LIMIT;

  if (autoSuspended) {
    console.warn(`[sage-input-filter] Auto-suspended ${telegramUsername} (${flagCount} flags today)`);
    logCustomerActivity({
      telegramUsername,
      eventCategory: "security",
      eventType: "sage.auto_suspended",
      actorType: "system",
      metadata: { flagCount, reason: "daily_flag_limit_exceeded" },
    }).catch(() => {});
  }

  return { blocked: true, reason: matchedLabel, autoSuspended };
}

async function callGeminiDiscuss(
  message: string,
  sessionName: string,
  sessionDate: string,
  biomarkers: BiomarkerContext[],
  history: HistoryMessage[] = [],
  activeCompounds: string[] = [],
  historicalSessions: SessionHistoryContext[] = [],
  cachedKnowledge: Array<{ topic: string; summary: string }> = [],
  labTests: LabTestContext[] = [],
  allCompounds: CompoundWithDose[] = [],
  hasBloodTest = true,
  glp1Logs: Glp1LogCtx[] = [],
  onToken?: (text: string) => void,
): Promise<{ text: string; chips: string[]; sources: DiscussSource[]; charts: ChartSeries[] }> {
  const seriesMap = buildChartableSeries(sessionDate, biomarkers, historicalSessions);
  const chartableMarkers = [...seriesMap.values()].filter(s => s.points.length >= 2).map(s => s.marker);

  let systemPrompt = await buildBloodTestSystemPrompt(sessionName, sessionDate, biomarkers, activeCompounds, historicalSessions, cachedKnowledge, labTests, allCompounds, hasBloodTest, chartableMarkers, glp1Logs);

  // ── Pre-fetch context in parallel (Pep-Pedia + optional web search) ────────
  // Both run concurrently so they don't add to each other's latency.
  // Best-effort: any failure is silent and Sage proceeds without that context.
  const webSearchEnabled = shouldSearchWeb(message) && await isWebSearchEnabled().catch(() => true);
  const [pepPediaResult, searchResult] = await Promise.all([
    fetchPepPediaContext(message).catch(() => null),
    webSearchEnabled ? searchWebForSage(message).catch(() => null) : Promise.resolve(null),
  ]);

  if (pepPediaResult) {
    systemPrompt += `\n\n─── PEP-PEDIA.ORG REFERENCE (${pepPediaResult.url}) ───\n${pepPediaResult.content}\n─── END PEP-PEDIA REFERENCE ───\n\nThe above is from the Pep-Pedia wiki — a curated peptide reference database. Prioritise this information for compound-specific facts (mechanism, dosing, half-life, storage). Cite the source as "${pepPediaResult.url}" when you use it.`;
  }

  let webSearchSources: DiscussSource[] = [];
  if (searchResult) {
    const today = new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
    systemPrompt += `\n\nLIVE WEB SEARCH RESULTS (retrieved ${today}):\n${searchResult.digest}\n\nUse the above only if relevant to the user's question. It reflects current, real information — you DO have real-time web access via this search, so never claim you can't search the internet or don't have access to current news when results like this are provided.`;
    webSearchSources = searchResult.sources.map(s => ({ label: s.title, url: s.url, type: "other" as const }));
  }

  // Cap history at last 20 messages (10 turns each side) to keep tokens manageable
  const cappedHistory = history.slice(-20);

  const messages = [
    ...cappedHistory.map(h => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user" as const, content: message },
  ];

  console.log(`[discuss] Calling Sage AI with ${messages.length} turn(s), ${biomarkers.length} biomarkers, ${cachedKnowledge.length} cached topic(s)`);

  const raw = onToken
    ? await callSageAIStream({ system: systemPrompt, messages, maxTokens: 1200, onToken })
    : await callSageAI({ system: systemPrompt, messages, maxTokens: 1200, enableWebSearch: false });
  console.log(`[discuss] Sage AI responded with ${raw.length} chars`);

  const filtered = filterSageOutput(raw);

  // Only cache knowledge from clean responses
  if (filtered === raw) extractAndCacheKnowledge(raw);

  const parsed = parseResponse(filtered);
  const charts = resolveCharts(parsed.chartMarkers, seriesMap);

  // Merge in real web-search sources (kept separate from the model's
  // self-reported SOURCES_JSON allowlist citations), deduped by URL, capped.
  let sources = parsed.sources;
  if (webSearchSources.length > 0) {
    const seenUrls = new Set(sources.map(s => s.url));
    const merged = [...sources];
    for (const s of webSearchSources) {
      if (seenUrls.has(s.url)) continue;
      seenUrls.add(s.url);
      merged.push(s);
    }
    sources = merged.slice(0, 5);
  }

  return { text: parsed.text, chips: parsed.chips, sources, charts };
}

// ─── Health Insights AI helper ────────────────────────────────────────────────

interface HealthInsightsCacheEntry {
  narrative: string;
  nextSteps: string;
  monitoring: Array<{ marker: string; reason: string }>;
  expiresAt: number;
}
const healthInsightsCache = new Map<string, HealthInsightsCacheEntry>();

async function callGeminiHealthInsights(
  biomarkers: Array<{ name: string; value: number | null; unit: string; refRangeLow: number | null; refRangeHigh: number | null; status: string }>,
  activeCompounds: string[],
  adviceHeadlines: string[],
): Promise<{ narrative: string; nextSteps: string; monitoring: Array<{ marker: string; reason: string }> }> {
  const biomarkerLines = biomarkers
    .filter((b) => b.value != null)
    .map((b) => {
      const rangeStr =
        b.refRangeLow != null && b.refRangeHigh != null
          ? `ref: ${b.refRangeLow}–${b.refRangeHigh} ${b.unit}`
          : b.refRangeHigh != null
            ? `ref: up to ${b.refRangeHigh} ${b.unit}`
            : "no ref range";
      const flag =
        b.status === "out_of_range" ? " ⚠ OUT OF RANGE" : b.status === "borderline" ? " ⚡ BORDERLINE" : "";
      return `  - ${b.name}: ${b.value} ${b.unit} (${rangeStr})${flag}`;
    })
    .join("\n");

  const compoundsLine = activeCompounds.length > 0 ? activeCompounds.join(", ") : "none";
  const adviceLine = adviceHeadlines.length > 0 ? adviceHeadlines.join("; ") : "none";

  const prompt = `You are a health analytics assistant for a peptide and health optimisation platform called Salt&Peps. Based on the user's blood test data, generate a JSON response with exactly three fields.

BIOMARKERS:
${biomarkerLines}

ACTIVE COMPOUNDS: ${compoundsLine}

EXISTING ALERTS: ${adviceLine}

Generate:
1. "narrative": 2-4 sentences. An analytic overview of the most notable findings — mention specific elevated or concerning markers by name with their values, note any trends, and state one key clinical implication. Be specific and data-driven. Write in second person ("Your...").
2. "nextSteps": 3-5 sentences. A personalised action plan addressing what the user should prioritise first, specific compound or lifestyle recommendations tied to their out-of-range markers, and a suggested monitoring cadence. Be practical. Write in second person.
3. "monitoring": an array of 3-5 objects, each with "marker" (the exact biomarker name from the list above) and "reason" (1 sentence explaining why this marker deserves close monitoring given the user's current results and active compounds). Prioritise out-of-range and borderline markers, plus any markers particularly relevant to their active compounds.

Return ONLY valid JSON, no markdown fences, no explanation:
{"narrative":"...","nextSteps":"...","monitoring":[{"marker":"...","reason":"..."}]}`;

  console.log(`[health-insights] Calling Sage AI with ${biomarkers.length} biomarkers`);

  const raw = (await callSageAI({
    messages: [{ role: "user", content: prompt }],
    maxTokens: 1024,
  })).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  type RawInsights = { narrative?: string; nextSteps?: string; monitoring?: Array<{ marker?: string; reason?: string }> };
  const toResult = (p: RawInsights) => ({
    narrative: p.narrative ?? "Analysis unavailable.",
    nextSteps: p.nextSteps ?? "No specific recommendations at this time.",
    monitoring: Array.isArray(p.monitoring)
      ? p.monitoring.filter((m) => m.marker && m.reason).slice(0, 5).map((m) => ({ marker: m.marker!, reason: m.reason! }))
      : [],
  });

  try {
    return toResult(JSON.parse(raw) as RawInsights);
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return toResult(JSON.parse(match[0]) as RawInsights); } catch { /* fall through */ }
    }
    return {
      narrative: "AI analysis unavailable at this time.",
      nextSteps: "Please review your biomarker table and consult a healthcare professional for personalised guidance.",
      monitoring: [],
    };
  }
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/blood-tests — list all sessions with values for the authenticated user
router.get("/blood-tests", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  const sessions = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(eq(bloodTestSessionsTable.telegramUsername, tg))
    .orderBy(desc(bloodTestSessionsTable.testDate));

  const result = await Promise.all(
    sessions.map(async (session) => {
      const values = await db
        .select()
        .from(bloodTestValuesTable)
        .where(eq(bloodTestValuesTable.sessionId, session.id));
      return { ...session, values };
    })
  );

  res.json(result);
});

// GET /api/account/health-summary — cross-reference blood tests + compounds
router.get("/account/health-summary", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  const sessions = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(eq(bloodTestSessionsTable.telegramUsername, tg))
    .orderBy(desc(bloodTestSessionsTable.testDate));

  if (sessions.length === 0) {
    res.json({
      biomarkers: [],
      adviceCards: [],
      testingSchedule: [],
      activeCompounds: [],
      lastTestDate: null,
    });
    return;
  }

  const allValues = await Promise.all(
    sessions.map(async (s) => {
      const vals = await db
        .select()
        .from(bloodTestValuesTable)
        .where(eq(bloodTestValuesTable.sessionId, s.id));
      return vals.map((v) => ({ ...v, testDate: s.testDate }));
    })
  );
  const flatValues = allValues.flat();

  const byMarker = new Map<string, typeof flatValues>();
  for (const v of flatValues) {
    const name = normalizeBiomarkerName(v.biomarkerName);
    if (!byMarker.has(name)) byMarker.set(name, []);
    byMarker.get(name)!.push(v);
  }

  const biomarkers = Array.from(byMarker.entries()).map(([name, readings]) => {
    const latest = readings[0];
    const previous = readings[1] ?? null;
    const val = parseNum(latest.value);
    const prevVal = previous ? parseNum(previous.value) : null;
    const low = parseNum(latest.refRangeLow);
    const high = parseNum(latest.refRangeHigh);

    return {
      name,
      category: latest.biomarkerCategory,
      value: val,
      unit: latest.unit,
      refRangeLow: low,
      refRangeHigh: high,
      status: val != null ? getStatus(val, low, high) : ("no_range" as const),
      trend: val != null ? getTrend(val, prevVal) : ("stable" as const),
      latestDate: latest.testDate,
      previousValue: prevVal,
      previousDate: previous?.testDate ?? null,
    };
  });

  const compounds = await db
    .select()
    .from(compoundLogsTable)
    .where(eq(compoundLogsTable.telegramUsername, tg));

  const activeCompounds = compounds.filter((c) => !c.endDate);
  const activeCompoundNames = activeCompounds.map((c) => c.compoundName);
  const activeCompoundTypes = [...new Set(activeCompounds.map((c) => c.compoundType))];

  const adviceCards: {
    id: string;
    marker: string;
    headline: string;
    body: string;
    severity: "info" | "warning" | "caution";
    relatedCompounds: string[];
  }[] = [];

  for (const rule of ADVICE_RULES) {
    const hasMatchingType = rule.compoundTypes.some((t) => activeCompoundTypes.includes(t));
    if (!hasMatchingType) continue;

    const markerData = biomarkers.find((b) => b.name === rule.marker);
    if (!markerData || markerData.value == null) continue;
    if (markerData.status === "no_range") continue;

    const isHigh = markerData.refRangeHigh != null && markerData.value > markerData.refRangeHigh;
    const isLow = markerData.refRangeLow != null && markerData.value < markerData.refRangeLow;
    const isHighBorderline =
      markerData.status === "borderline" &&
      markerData.refRangeHigh != null &&
      markerData.value >= markerData.refRangeHigh * 0.85;
    const isLowBorderline =
      markerData.status === "borderline" &&
      markerData.refRangeLow != null &&
      markerData.value <= markerData.refRangeLow * 1.15;

    const directionMatch =
      (rule.direction === "high" && (isHigh || isHighBorderline)) ||
      (rule.direction === "low" && (isLow || isLowBorderline)) ||
      (rule.direction === "any" && (isHigh || isLow || isHighBorderline || isLowBorderline));

    if (!directionMatch) continue;

    const relatedCompounds = activeCompounds
      .filter((c) => rule.compoundTypes.includes(c.compoundType))
      .map((c) => c.compoundName);

    if (adviceCards.some((a) => a.marker === rule.marker && a.headline === rule.headline)) continue;

    adviceCards.push({
      id: `${rule.marker}-${rule.direction}`,
      marker: rule.marker,
      headline: rule.headline,
      body: rule.body,
      severity: rule.severity,
      relatedCompounds,
    });
  }

  for (const marker of biomarkers) {
    if (marker.status !== "out_of_range") continue;
    if (adviceCards.some((a) => a.marker === marker.name)) continue;
    const recs = RECOMMENDATIONS[marker.name];
    if (!recs || recs.length === 0) continue;

    const topRec = recs[0];
    adviceCards.push({
      id: `${marker.name}-rec`,
      marker: marker.name,
      headline: `${marker.name} is out of range`,
      body: `${topRec.compound} may help: ${topRec.reason}.${recs.length > 1 ? ` Also consider: ${recs.slice(1).map((r) => r.compound).join(", ")}.` : ""}`,
      severity: "caution",
      relatedCompounds: [],
    });
  }

  const testingSchedule: string[] = [];
  for (const rule of TESTING_SCHEDULE_RULES) {
    if (rule.compoundTypes.some((t) => activeCompoundTypes.includes(t))) {
      testingSchedule.push(rule.schedule);
    }
  }
  if (activeCompounds.length > 0 && testingSchedule.length === 0) {
    testingSchedule.push("Schedule a full blood panel every 3 months minimum while using any research compound");
  }

  res.json({
    biomarkers,
    adviceCards,
    testingSchedule,
    activeCompounds: activeCompoundNames,
    lastTestDate: sessions[0]?.testDate ?? null,
  });
});

// GET /api/account/health-insights — Gemini-generated narrative + next steps
router.get("/account/health-insights", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;

  const sessions = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(eq(bloodTestSessionsTable.telegramUsername, tg))
    .orderBy(desc(bloodTestSessionsTable.testDate));

  if (sessions.length === 0) {
    res.json({
      narrative: "No blood test data found.",
      nextSteps: "Log your first blood test to get personalised AI insights.",
      monitoring: [],
    });
    return;
  }

  const lastTestDate = sessions[0].testDate;
  const cacheKey = `${tg}::${lastTestDate}`;
  const cached = healthInsightsCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    console.log(`[health-insights] Cache hit for ${tg}`);
    res.json({ narrative: cached.narrative, nextSteps: cached.nextSteps, monitoring: cached.monitoring });
    return;
  }

  // Rebuild biomarker list (same logic as health-summary)
  const allValues = await Promise.all(
    sessions.map(async (s) => {
      const vals = await db
        .select()
        .from(bloodTestValuesTable)
        .where(eq(bloodTestValuesTable.sessionId, s.id));
      return vals.map((v) => ({ ...v, testDate: s.testDate }));
    }),
  );
  const flatValues = allValues.flat();

  const byMarker = new Map<string, typeof flatValues>();
  for (const v of flatValues) {
    const name = normalizeBiomarkerName(v.biomarkerName);
    if (!byMarker.has(name)) byMarker.set(name, []);
    byMarker.get(name)!.push(v);
  }

  const insightsBiomarkers = Array.from(byMarker.entries()).map(([name, readings]) => {
    const latest = readings[0];
    const prev = readings[1] ?? null;
    const val = parseNum(latest.value);
    const prevVal = prev ? parseNum(prev.value) : null;
    const low = parseNum(latest.refRangeLow);
    const high = parseNum(latest.refRangeHigh);
    return {
      name,
      value: val,
      unit: latest.unit,
      refRangeLow: low,
      refRangeHigh: high,
      status: val != null ? getStatus(val, low, high) : ("no_range" as const),
      trend: val != null ? getTrend(val, prevVal) : ("stable" as const),
    };
  });

  const compounds = await db
    .select()
    .from(compoundLogsTable)
    .where(eq(compoundLogsTable.telegramUsername, tg));
  const activeCompoundsForInsights = compounds.filter((c) => !c.endDate);
  const activeCompoundNamesForInsights = activeCompoundsForInsights.map((c) => c.compoundName);
  const activeCompoundTypesForInsights = [...new Set(activeCompoundsForInsights.map((c) => c.compoundType))];

  // Collect advice headlines
  const adviceHeadlines: string[] = [];
  for (const rule of ADVICE_RULES) {
    if (!rule.compoundTypes.some((t) => activeCompoundTypesForInsights.includes(t))) continue;
    const md = insightsBiomarkers.find((b) => b.name === rule.marker);
    if (!md || md.value == null || md.status === "no_range") continue;
    const isHigh = md.refRangeHigh != null && md.value > md.refRangeHigh;
    const isLow = md.refRangeLow != null && md.value < md.refRangeLow;
    const isHighB = md.status === "borderline" && md.refRangeHigh != null && md.value >= md.refRangeHigh * 0.85;
    const isLowB = md.status === "borderline" && md.refRangeLow != null && md.value <= md.refRangeLow * 1.15;
    const dirMatch =
      (rule.direction === "high" && (isHigh || isHighB)) ||
      (rule.direction === "low" && (isLow || isLowB)) ||
      (rule.direction === "any" && (isHigh || isLow || isHighB || isLowB));
    if (dirMatch && !adviceHeadlines.includes(rule.headline)) adviceHeadlines.push(rule.headline);
  }

  try {
    const result = await callGeminiHealthInsights(insightsBiomarkers, activeCompoundNamesForInsights, adviceHeadlines);
    healthInsightsCache.set(cacheKey, { ...result, expiresAt: Date.now() + 10 * 60 * 1000 });
    res.json(result);
  } catch (err) {
    console.error("[health-insights] Gemini error:", err);
    res.status(500).json({
      narrative: "AI analysis unavailable at this time.",
      nextSteps: "Please review your biomarker table and consult a healthcare professional for personalised guidance.",
      monitoring: [],
    });
  }
});

// POST /api/blood-tests/extract-image — OCR a blood test screenshot/image using Gemini vision
router.post("/blood-tests/extract-image", requireAccount, async (req, res): Promise<void> => {
  const { imageBase64, mimeType } = req.body as { imageBase64?: string; mimeType?: string };

  if (!imageBase64 || typeof imageBase64 !== "string") {
    res.status(400).json({ error: "imageBase64 is required" });
    return;
  }

  // Normalise mime type
  const mt = (mimeType ?? "image/png").replace("image/jpg", "image/jpeg");
  if (!mt.startsWith("image/")) {
    res.status(400).json({ error: "Unsupported file type" });
    return;
  }

  try {
    const ocrText = await callSageAI({
      messages: [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mt, data: imageBase64 } },
          {
            type: "text",
            text: [
              "You are an OCR assistant specialised in blood test lab reports.",
              "Your task: extract every biomarker result and output it on its own line in EXACTLY this format:",
              "  Biomarker Name: value unit",
              "Examples:",
              "  Oestradiol: 46.9 pmol/l",
              "  Follicle Stimulating Hormone: 4.37 U/l",
              "  Testosterone: 24.7 nmol/l",
              "  Free Testosterone: 0.366 nmol/l",
              "  Sex Hormone Binding Globulin: 57.6 nmol/l",
              "  Albumin: 46.5 g/l",
              "Rules:",
              "- Use the exact biomarker name as printed in the report.",
              "- Include the numeric result value and the unit exactly as shown.",
              "- Do NOT include reference ranges, status labels (Low / High / Optimal / Normal), or any other text.",
              "- One biomarker per line. Output ONLY the biomarker lines, nothing else.",
              "- If a value appears as a circle or badge on the right side of a bar chart, that IS the result value — use it.",
            ].join("\n"),
          },
        ],
      }],
      maxTokens: 4096,
    });

    console.log("[extract-image] OCR complete, chars:", ocrText.length);
    res.json({ text: ocrText });
  } catch (err) {
    console.error("[extract-image] Sage AI error:", err);
    res.status(500).json({ error: "Image extraction failed" });
  }
});

// POST /api/blood-tests — create a new session with values
router.post("/blood-tests", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { testDate, labName, testName, measurementType, medicationNotes, notes, values } = req.body as {
    testDate: string;
    labName?: string;
    testName?: string;
    measurementType?: string;
    medicationNotes?: string;
    notes?: string;
    values: {
      biomarkerName: string;
      biomarkerCategory: string;
      value: number;
      unit: string;
      refRangeLow?: number | null;
      refRangeHigh?: number | null;
    }[];
  };

  if (!testDate || typeof testDate !== "string") {
    res.status(400).json({ error: "testDate is required (YYYY-MM-DD)" });
    return;
  }

  const normalizedDate = normalizeDate(testDate);
  if (!normalizedDate) {
    res.status(400).json({ error: `Invalid testDate format: "${testDate}". Use DD/MM/YYYY or YYYY-MM-DD.` });
    return;
  }

  if (!Array.isArray(values) || values.length === 0) {
    res.status(400).json({ error: "At least one biomarker value is required" });
    return;
  }

  for (const v of values) {
    if (!v.biomarkerName || !v.biomarkerCategory || v.value == null || !v.unit) {
      res.status(400).json({ error: "Each value must have biomarkerName, biomarkerCategory, value, and unit" });
      return;
    }
  }

  const sessionId = randomUUID();

  await db.insert(bloodTestSessionsTable).values({
    id: sessionId,
    telegramUsername: tg,
    testDate: normalizedDate,
    labName: labName ?? null,
    testName: testName ?? null,
    measurementType: measurementType ?? null,
    medicationNotes: medicationNotes ?? null,
    notes: notes ?? null,
  });

  await db.insert(bloodTestValuesTable).values(
    values.map((v) => ({
      id: randomUUID(),
      sessionId,
      biomarkerName: String(v.biomarkerName),
      biomarkerCategory: String(v.biomarkerCategory),
      value: String(v.value),
      unit: String(v.unit),
      refRangeLow: v.refRangeLow != null ? String(v.refRangeLow) : null,
      refRangeHigh: v.refRangeHigh != null ? String(v.refRangeHigh) : null,
    }))
  );

  const insertedValues = await db
    .select()
    .from(bloodTestValuesTable)
    .where(eq(bloodTestValuesTable.sessionId, sessionId));

  const [session] = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(eq(bloodTestSessionsTable.id, sessionId));

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "blood_test",
    eventType: "blood_test.session_created",
    entityId: sessionId,
    actorType: "customer",
    metadata: {
      labName: labName ?? null,
      testDate,
      testName: testName ?? null,
      measurementType: measurementType ?? null,
      medicationNotes: medicationNotes ?? null,
    },
  }).catch(() => {});

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "blood_test",
    eventType: "blood_test.results_uploaded",
    entityId: sessionId,
    actorType: "customer",
    metadata: {
      biomarkerCount: values.length,
      biomarkers: values.map(v => ({
        name: v.biomarkerName,
        value: v.value,
        unit: v.unit,
        refRangeLow: v.refRangeLow ?? null,
        refRangeHigh: v.refRangeHigh ?? null,
      })),
    },
  }).catch(() => {});

  res.status(201).json({ ...session, values: insertedValues });
});

const DEFAULT_DISCUSS_LIMIT = 50;

async function getDiscussLimit(telegramUsername: string): Promise<number> {
  const [acct] = await db
    .select({ discussLimitOverride: accountsTable.discussLimitOverride })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, telegramUsername));
  // Clamp to >= 1 so the daily-quota SQL always enforces "exactly N/day"
  // (a non-positive limit would otherwise leak one request per day on reset).
  if (acct?.discussLimitOverride != null) return Math.max(1, acct.discussLimitOverride);
  const [cfg] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "discuss_limit"));
  if (cfg?.value) { const n = parseInt(cfg.value, 10); if (!isNaN(n)) return Math.max(1, n); }
  return DEFAULT_DISCUSS_LIMIT;
}

// Returns how many discuss requests the user has consumed *today* (0 if the
// stored counter is from a previous day — the daily window has reset).
async function readDailyUsed(telegramUsername: string): Promise<number> {
  const result = await db.execute(sql`
    SELECT CASE WHEN discuss_count_date = CURRENT_DATE THEN discuss_count ELSE 0 END AS used
    FROM accounts WHERE telegram_username = ${telegramUsername}
  `);
  const rows = result.rows as { used: number }[];
  return Number(rows[0]?.used ?? 0);
}

// Atomically enforce the per-day quota and consume one slot. The counter resets
// automatically on the first request of a new calendar day (DB CURRENT_DATE).
// Returns { allowed: false } when today's limit is already reached.
async function consumeDailyQuota(
  telegramUsername: string,
  limit: number,
): Promise<{ allowed: boolean; used: number }> {
  const result = await db.execute(sql`
    UPDATE accounts
    SET discuss_count = CASE WHEN discuss_count_date = CURRENT_DATE THEN discuss_count + 1 ELSE 1 END,
        discuss_count_date = CURRENT_DATE
    WHERE telegram_username = ${telegramUsername}
      AND (discuss_count_date IS DISTINCT FROM CURRENT_DATE OR discuss_count < ${limit})
    RETURNING discuss_count AS used
  `);
  const rows = result.rows as { used: number }[];
  if (rows.length > 0) {
    return { allowed: true, used: Number(rows[0].used) };
  }
  return { allowed: false, used: await readDailyUsed(telegramUsername) };
}

// POST /api/blood-tests/discuss/open — generate an AI opening message when a new chat starts (no quota cost)
router.post("/blood-tests/discuss/open", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { sessionId } = req.body as { sessionId?: string };

  let session;
  if (sessionId) {
    const [found] = await db
      .select()
      .from(bloodTestSessionsTable)
      .where(and(eq(bloodTestSessionsTable.id, sessionId), eq(bloodTestSessionsTable.telegramUsername, tg)));
    session = found;
  } else {
    const sessions = await db
      .select()
      .from(bloodTestSessionsTable)
      .where(eq(bloodTestSessionsTable.telegramUsername, tg))
      .orderBy(desc(bloodTestSessionsTable.testDate))
      .limit(1);
    session = sessions[0];
  }

  if (!session) {
    res.json({ response: "No blood tests found. Head to the Upload tab to add your first test." });
    return;
  }

  const values = await db
    .select()
    .from(bloodTestValuesTable)
    .where(eq(bloodTestValuesTable.sessionId, session.id));

  const biomarkers: BiomarkerContext[] = values.map((v) => {
    const val = parseNum(v.value) ?? 0;
    const low = parseNum(v.refRangeLow);
    const high = parseNum(v.refRangeHigh);
    return { name: v.biomarkerName, value: val, unit: v.unit, refRangeLow: low, refRangeHigh: high, status: getStatus(val, low, high) };
  });

  const [compoundRows, allSessions] = await Promise.all([
    db.select({
      compoundName: compoundLogsTable.compoundName,
      endDate: compoundLogsTable.endDate,
      doseAmount: compoundLogsTable.doseAmount,
      doseUnit: compoundLogsTable.doseUnit,
      frequency: compoundLogsTable.frequency,
      route: compoundLogsTable.route,
    }).from(compoundLogsTable).where(eq(compoundLogsTable.telegramUsername, tg)),
    db.select().from(bloodTestSessionsTable)
      .where(eq(bloodTestSessionsTable.telegramUsername, tg))
      .orderBy(desc(bloodTestSessionsTable.testDate)),
  ]);
  const activeCompounds = compoundRows.filter(c => !c.endDate).map(c => c.compoundName);

  const otherSessions = allSessions.filter(s => s.id !== session.id);
  const historicalSessions: SessionHistoryContext[] = await Promise.all(
    otherSessions.map(async s => {
      const sVals = await db.select().from(bloodTestValuesTable).where(eq(bloodTestValuesTable.sessionId, s.id));
      return {
        name: s.testName ?? s.labName ?? "Blood Test",
        date: s.testDate,
        biomarkers: sVals.map(v => {
          const val = parseNum(v.value) ?? 0;
          const low = parseNum(v.refRangeLow);
          const high = parseNum(v.refRangeHigh);
          return { name: v.biomarkerName, value: val, unit: v.unit, refRangeLow: low, refRangeHigh: high, status: getStatus(val, low, high) };
        }),
      };
    })
  );

  const sessionDisplayName = session.testName ?? session.labName ?? "Blood Test";
  const allCompoundsForOpen: CompoundWithDose[] = compoundRows.map(c => ({
    name: c.compoundName,
    active: !c.endDate,
    doseAmount: c.doseAmount,
    doseUnit: c.doseUnit,
    frequency: c.frequency,
    route: c.route,
  }));
  const systemPrompt = await buildBloodTestSystemPrompt(
    sessionDisplayName, session.testDate, biomarkers, activeCompounds,
    historicalSessions, [], [], allCompoundsForOpen, true,
  );

  const openingInstruction = `The user has just opened a new chat about their blood test. Generate a smart, personalised opening message that:
1. Briefly acknowledges the most notable finding(s) — mention specific values and whether they're in/out of range
2. If anything is ambiguous and context would change your interpretation (e.g. high T with suppressed LH/FSH, elevated E2, high haematocrit), ask ONE focused clarifying question
3. Keep it conversational — 3 to 6 sentences total, no long bullet lists in the opener
4. End with the standard disclaimer line

Do NOT say "Hello" or "Hi there" — just get straight into the findings. You are looking at their test results and speaking directly to them.`;

  try {
    const text = await callSageAI({
      system: systemPrompt,
      messages: [{ role: "user", content: openingInstruction }],
      maxTokens: 1024,
    });
    res.json({ response: text || "I've reviewed your results. What would you like to explore?" });
  } catch {
    res.json({ response: "I've reviewed your results — ask me anything about what you see here." });
  }
});

// Guardrail regex: block direct questions about the underlying AI technology (not health questions).
// Shared by both the blood-test path and the compounds-only (no blood test yet) path.
const AI_IDENTITY_RE = /\bwhich\s+(ai|llm)\b|\bwhat\s+(ai|llm)\b|\bare\s+you\s+(gpt|claude|gemini|llama|mistral|chatgpt)\b|\bwho\s+made\s+you\b|\bopenai\b|\banthropic\b|\bgoogle\s+ai\b|\bwhat\s+(ai|llm)\s+model\b|\blanguage\s+model\b|\bwhat\s+are\s+you\b.*\b(ai|bot|model)\b/i;

// POST /api/blood-tests/discuss — contextual AI-like chat with blood test data
router.post("/blood-tests/discuss", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { message, sessionId, history = [] } = req.body as { message: string; sessionId?: string; history?: HistoryMessage[] };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  // Security: scan for prompt injection / jailbreak attempts
  const inputScan = await scanSageInput(message, tg);
  if (inputScan.blocked) {
    const reply = inputScan.autoSuspended
      ? "Your access to Sage has been temporarily suspended due to repeated policy violations. Please contact support."
      : "I'm Sage — I can only help with blood tests, compounds, and health protocols.";
    res.status(400).json({ error: "blocked_input", response: reply, contextSession: null, used: 0, limit: 0 });
    return;
  }

  // Step 1: Look up the session BEFORE touching quota
  let session;
  if (sessionId) {
    const [found] = await db
      .select()
      .from(bloodTestSessionsTable)
      .where(and(
        eq(bloodTestSessionsTable.id, sessionId),
        eq(bloodTestSessionsTable.telegramUsername, tg)
      ));
    session = found;
  } else {
    const sessions = await db
      .select()
      .from(bloodTestSessionsTable)
      .where(eq(bloodTestSessionsTable.telegramUsername, tg))
      .orderBy(desc(bloodTestSessionsTable.testDate))
      .limit(1);
    session = sessions[0];
  }

  const effectiveLimit = await getDiscussLimit(tg);

  if (!session) {
    // No blood test on file. If the user has active compounds, still answer using that context;
    // otherwise there's nothing to personalise on, so don't consume quota.
    const compoundRowsNoBt = await db
      .select({
        compoundName: compoundLogsTable.compoundName,
        endDate: compoundLogsTable.endDate,
        doseAmount: compoundLogsTable.doseAmount,
        doseUnit: compoundLogsTable.doseUnit,
        frequency: compoundLogsTable.frequency,
        route: compoundLogsTable.route,
      })
      .from(compoundLogsTable)
      .where(eq(compoundLogsTable.telegramUsername, tg));
    const activeCompoundsNoBt = compoundRowsNoBt.filter((c) => !c.endDate).map((c) => c.compoundName);
    const allCompoundsNoBt: CompoundWithDose[] = compoundRowsNoBt.map((c) => ({
      name: c.compoundName,
      active: !c.endDate,
      doseAmount: c.doseAmount,
      doseUnit: c.doseUnit,
      frequency: c.frequency,
      route: c.route,
    }));

    const readUsed = async () => readDailyUsed(tg);

    // AI-identity guardrail — do not consume quota
    if (AI_IDENTITY_RE.test(message)) {
      res.json({
        response: "I'm not able to share information about the underlying technology.",
        contextSession: null,
        used: await readUsed(),
        limit: effectiveLimit,
      });
      return;
    }

    // Enforce daily quota, consuming one slot; roll back on failure
    const quotaNoBt = await consumeDailyQuota(tg, effectiveLimit);
    if (!quotaNoBt.allowed) {
      res.status(429).json({
        error: "limit_reached",
        response: "You've reached your daily question limit. Please check back tomorrow.",
        contextSession: null,
        used: quotaNoBt.used,
        limit: effectiveLimit,
      });
      return;
    }
    const newCountNoBt = quotaNoBt.used;

    // ── Start SSE stream ──────────────────────────────────────────────────────
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const sseWrite = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

    try {
      const [topics, labTests, glp1Rows] = await Promise.all([
        Promise.resolve(extractTopicsForCache(message, [])),
        fetchLabTestsForCompounds(activeCompoundsNoBt),
        db.select().from(glp1LogsTable).where(eq(glp1LogsTable.telegramUsername, tg)).orderBy(desc(glp1LogsTable.loggedDate)).limit(60),
      ]);
      const cachedKnowledge = await lookupKnowledgeCache(topics);
      const glp1Logs: Glp1LogCtx[] = glp1Rows.map(r => ({
        loggedDate: r.loggedDate,
        compoundName: r.compoundName,
        doseMg: parseFloat(String(r.doseMg)),
        weightKg: r.weightKg != null ? parseFloat(String(r.weightKg)) : null,
        notes: r.notes ?? null,
        injectionSite: r.injectionSite ?? null,
        sideEffects: r.sideEffects ?? null,
        calories: r.calories != null ? parseFloat(String(r.calories)) : null,
        proteinG: r.proteinG != null ? parseFloat(String(r.proteinG)) : null,
      }));
      const result = await callGeminiDiscuss(
        message,
        "General health (no blood test on file yet)",
        new Date().toISOString().slice(0, 10),
        [],
        history,
        activeCompoundsNoBt,
        [],
        cachedKnowledge,
        labTests,
        allCompoundsNoBt,
        false,
        glp1Logs,
        (text) => sseWrite({ type: "token", text }),
      );

      logCustomerActivity({
        telegramUsername: tg,
        eventCategory: "blood_test",
        eventType: "blood_test.ai_discussion_message",
        entityId: "compounds-only",
        actorType: "customer",
        metadata: { sender: "user", content: message, conversationId: "compounds-only", characterCount: message.length },
      }).catch(() => {});

      logCustomerActivity({
        telegramUsername: tg,
        eventCategory: "blood_test",
        eventType: "blood_test.ai_discussion_message",
        entityId: "compounds-only",
        actorType: "system",
        metadata: { sender: "ai", content: result.text, conversationId: "compounds-only", characterCount: result.text.length },
      }).catch(() => {});

      sseWrite({ type: "done", sources: result.sources, chips: result.chips, charts: result.charts, contextSession: null, used: newCountNoBt, limit: effectiveLimit });
      res.end();
    } catch (err) {
      console.error("[discuss] Gemini error (compounds-only):", err);
      await db
        .update(accountsTable)
        .set({ discussCount: sql`GREATEST(${accountsTable.discussCount} - 1, 0)` })
        .where(and(eq(accountsTable.telegramUsername, tg), eq(accountsTable.discussCountDate, sql`CURRENT_DATE`)));
      sseWrite({ type: "error", error: "ai_unavailable" });
      res.end();
    }
    return;
  }

  const getUsedCount = async () => readDailyUsed(tg);

  if (AI_IDENTITY_RE.test(message)) {
    res.json({
      response: "I'm not able to share information about the underlying technology.",
      contextSession: null,
      used: await getUsedCount(),
      limit: effectiveLimit,
    });
    return;
  }

  // Step 2: Enforce the daily quota and consume one slot
  const quota = await consumeDailyQuota(tg, effectiveLimit);
  if (!quota.allowed) {
    res.status(429).json({
      error: "limit_reached",
      response: "You've reached your daily question limit. Please check back tomorrow.",
      contextSession: null,
      used: quota.used,
      limit: effectiveLimit,
    });
    return;
  }
  const newCount = quota.used;

  // Step 3: Build biomarker context for current session + all historical sessions
  const [values, compoundRows, allSessionsList] = await Promise.all([
    db.select().from(bloodTestValuesTable).where(eq(bloodTestValuesTable.sessionId, session.id)),
    db.select({
      compoundName: compoundLogsTable.compoundName,
      endDate: compoundLogsTable.endDate,
      doseAmount: compoundLogsTable.doseAmount,
      doseUnit: compoundLogsTable.doseUnit,
      frequency: compoundLogsTable.frequency,
      route: compoundLogsTable.route,
    }).from(compoundLogsTable).where(eq(compoundLogsTable.telegramUsername, tg)),
    db.select().from(bloodTestSessionsTable)
      .where(eq(bloodTestSessionsTable.telegramUsername, tg))
      .orderBy(desc(bloodTestSessionsTable.testDate)),
  ]);

  const biomarkers: BiomarkerContext[] = values.map((v) => {
    const val = parseNum(v.value) ?? 0;
    const low = parseNum(v.refRangeLow);
    const high = parseNum(v.refRangeHigh);
    return {
      name: v.biomarkerName,
      value: val,
      unit: v.unit,
      refRangeLow: low,
      refRangeHigh: high,
      status: getStatus(val, low, high),
    };
  });

  const sessionDisplayName = session.testName ?? session.labName ?? "Blood Test";
  const activeCompounds = compoundRows.filter(c => !c.endDate).map(c => c.compoundName);
  const allCompoundsWithStatus: CompoundWithDose[] = compoundRows.map(c => ({
    name: c.compoundName,
    active: !c.endDate,
    doseAmount: c.doseAmount,
    doseUnit: c.doseUnit,
    frequency: c.frequency,
    route: c.route,
  }));

  // Fetch biomarkers for all other sessions to build historical context
  const otherSessions = allSessionsList.filter(s => s.id !== session.id);
  const historicalSessions: SessionHistoryContext[] = await Promise.all(
    otherSessions.map(async s => {
      const sVals = await db.select().from(bloodTestValuesTable).where(eq(bloodTestValuesTable.sessionId, s.id));
      return {
        name: s.testName ?? s.labName ?? "Blood Test",
        date: s.testDate,
        biomarkers: sVals.map(v => {
          const val = parseNum(v.value) ?? 0;
          const low = parseNum(v.refRangeLow);
          const high = parseNum(v.refRangeHigh);
          return { name: v.biomarkerName, value: val, unit: v.unit, refRangeLow: low, refRangeHigh: high, status: getStatus(val, low, high) };
        }),
      };
    })
  );

  // ── Start SSE stream ──────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const sseWrite = (data: object) => res.write(`data: ${JSON.stringify(data)}\n\n`);

  // Step 4: Call Gemini — roll back the reserved slot if it fails
  let responseText: string;
  let responseChips: string[] = [];
  let responseSources: DiscussSource[] = [];
  let responseCharts: ChartSeries[] = [];
  try {
    const cacheTopics = extractTopicsForCache(message, biomarkers);
    const [cachedKnowledge, labTests, glp1Rows] = await Promise.all([
      lookupKnowledgeCache(cacheTopics),
      fetchLabTestsForCompounds(activeCompounds),
      db.select().from(glp1LogsTable).where(eq(glp1LogsTable.telegramUsername, tg)).orderBy(desc(glp1LogsTable.loggedDate)).limit(60),
    ]);
    if (cachedKnowledge.length > 0) {
      console.log(`[discuss] Knowledge cache hit: ${cachedKnowledge.map(k => k.topic).join(", ")}`);
    }
    if (labTests.length > 0) {
      console.log(`[discuss] Lab tests loaded: ${labTests.map(t => t.peptideName).join(", ")}`);
    }
    const glp1Logs: Glp1LogCtx[] = glp1Rows.map(r => ({
      loggedDate: r.loggedDate,
      compoundName: r.compoundName,
      doseMg: parseFloat(String(r.doseMg)),
      weightKg: r.weightKg != null ? parseFloat(String(r.weightKg)) : null,
      notes: r.notes ?? null,
      injectionSite: r.injectionSite ?? null,
      sideEffects: r.sideEffects ?? null,
      calories: r.calories != null ? parseFloat(String(r.calories)) : null,
      proteinG: r.proteinG != null ? parseFloat(String(r.proteinG)) : null,
    }));
    const result = await callGeminiDiscuss(message, sessionDisplayName, session.testDate, biomarkers, history, activeCompounds, historicalSessions, cachedKnowledge, labTests, allCompoundsWithStatus, true, glp1Logs, (text) => sseWrite({ type: "token", text }));
    responseText = result.text;
    responseChips = result.chips;
    responseSources = result.sources;
    responseCharts = result.charts;
  } catch (err) {
    console.error("[discuss] Gemini error:", err);
    await db
      .update(accountsTable)
      .set({ discussCount: sql`GREATEST(${accountsTable.discussCount} - 1, 0)` })
      .where(and(eq(accountsTable.telegramUsername, tg), eq(accountsTable.discussCountDate, sql`CURRENT_DATE`)));
    sseWrite({ type: "error", error: "ai_unavailable" });
    res.end();
    return;
  }

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "blood_test",
    eventType: "blood_test.ai_discussion_message",
    entityId: session.id,
    actorType: "customer",
    metadata: {
      sender: "user",
      content: message,
      conversationId: sessionId ?? session.id,
      characterCount: message.length,
    },
  }).catch(() => {});

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "blood_test",
    eventType: "blood_test.ai_discussion_message",
    entityId: session.id,
    actorType: "system",
    metadata: {
      sender: "ai",
      content: responseText,
      conversationId: sessionId ?? session.id,
      characterCount: responseText.length,
    },
  }).catch(() => {});

  sseWrite({ type: "done", sources: responseSources, chips: responseChips, charts: responseCharts, contextSession: { id: session.id, testName: session.testName ?? session.labName ?? "Blood Test", testDate: session.testDate }, used: newCount, limit: effectiveLimit });
  res.end();
});

// PATCH /api/blood-tests/:sessionId — update session metadata and replace all values
router.patch("/blood-tests/:sessionId", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const sessionId = String(req.params["sessionId"]);

  const { testDate, labName, testName, measurementType, medicationNotes, notes, values } = req.body as {
    testDate?: string;
    labName?: string;
    testName?: string;
    measurementType?: string;
    medicationNotes?: string;
    notes?: string;
    values: {
      biomarkerName: string;
      biomarkerCategory: string;
      value: number;
      unit: string;
      refRangeLow?: number | null;
      refRangeHigh?: number | null;
    }[];
  };

  if (!Array.isArray(values) || values.length === 0) {
    res.status(400).json({ error: "At least one biomarker value is required" });
    return;
  }

  const [session] = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(and(eq(bloodTestSessionsTable.id, sessionId), eq(bloodTestSessionsTable.telegramUsername, tg)));

  if (!session) {
    res.status(404).json({ error: "Test session not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (testDate != null) {
    const nd = normalizeDate(testDate);
    if (!nd) {
      res.status(400).json({ error: `Invalid testDate format: "${testDate}". Use DD/MM/YYYY or YYYY-MM-DD.` });
      return;
    }
    updates.testDate = nd;
  }
  if (labName !== undefined) updates.labName = labName ?? null;
  if (testName !== undefined) updates.testName = testName ?? null;
  if (measurementType !== undefined) updates.measurementType = measurementType ?? null;
  if (medicationNotes !== undefined) updates.medicationNotes = medicationNotes ?? null;
  if (notes !== undefined) updates.notes = notes ?? null;

  if (Object.keys(updates).length > 0) {
    await db.update(bloodTestSessionsTable).set(updates).where(eq(bloodTestSessionsTable.id, sessionId));
  }

  await db.delete(bloodTestValuesTable).where(eq(bloodTestValuesTable.sessionId, sessionId));

  await db.insert(bloodTestValuesTable).values(
    values.map((v) => ({
      id: randomUUID(),
      sessionId,
      biomarkerName: String(v.biomarkerName),
      biomarkerCategory: String(v.biomarkerCategory),
      value: String(v.value),
      unit: String(v.unit),
      refRangeLow: v.refRangeLow != null ? String(v.refRangeLow) : null,
      refRangeHigh: v.refRangeHigh != null ? String(v.refRangeHigh) : null,
    }))
  );

  const [updatedSession] = await db.select().from(bloodTestSessionsTable).where(eq(bloodTestSessionsTable.id, sessionId));
  const updatedValues = await db.select().from(bloodTestValuesTable).where(eq(bloodTestValuesTable.sessionId, sessionId));

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "blood_test",
    eventType: "blood_test.session_updated",
    entityId: sessionId,
    actorType: "customer",
    metadata: { biomarkerCount: values.length },
  }).catch(() => {});

  res.json({ ...updatedSession, values: updatedValues });
});

// DELETE /api/blood-tests/:sessionId — delete a session (values cascade)
router.delete("/blood-tests/:sessionId", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const sessionId = String(req.params["sessionId"]);

  const [session] = await db
    .select()
    .from(bloodTestSessionsTable)
    .where(
      and(
        eq(bloodTestSessionsTable.id, sessionId),
        eq(bloodTestSessionsTable.telegramUsername, tg)
      )
    );

  if (!session) {
    res.status(404).json({ error: "Test session not found" });
    return;
  }

  const sessionValues = await db
    .select()
    .from(bloodTestValuesTable)
    .where(eq(bloodTestValuesTable.sessionId, sessionId));

  await db.delete(bloodTestSessionsTable).where(eq(bloodTestSessionsTable.id, sessionId));

  logCustomerActivity({
    telegramUsername: tg,
    eventCategory: "blood_test",
    eventType: "blood_test.session_deleted",
    entityId: sessionId,
    actorType: "customer",
    metadata: {
      snapshot: session,
      biomarkers: sessionValues,
    },
  }).catch(() => {});

  res.json({ ok: true });
});

// ─── Blood-test conversation persistence ─────────────────────────────────────

// GET /api/blood-tests/conversations — list all conversations for this account
router.get("/blood-tests/conversations", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const rows = await db
    .select()
    .from(btConversationsTable)
    .where(eq(btConversationsTable.telegramUsername, tg))
    .orderBy(desc(btConversationsTable.updatedAt));
  res.json(rows);
});

// PUT /api/blood-tests/conversations/:id — upsert a conversation
router.put("/blood-tests/conversations/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  const { title, messages } = req.body as { title?: string; messages?: unknown };

  if (!Array.isArray(messages)) {
    res.status(400).json({ error: "messages must be an array" });
    return;
  }
  const safeTitle = typeof title === "string" && title.trim() ? title.trim().slice(0, 120) : "New Chat";

  await db
    .insert(btConversationsTable)
    .values({ id, telegramUsername: tg, title: safeTitle, messagesJson: JSON.stringify(messages), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: btConversationsTable.id,
      set: { title: safeTitle, messagesJson: JSON.stringify(messages), updatedAt: new Date() },
    });
  res.json({ ok: true });
});

// DELETE /api/blood-tests/conversations/:id — delete a conversation
router.delete("/blood-tests/conversations/:id", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const id = String(req.params["id"]);
  await db
    .delete(btConversationsTable)
    .where(and(eq(btConversationsTable.id, id), eq(btConversationsTable.telegramUsername, tg)));
  res.json({ ok: true });
});

export default router;
