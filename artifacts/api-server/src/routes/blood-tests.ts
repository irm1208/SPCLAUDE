import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { bloodTestSessionsTable, bloodTestValuesTable, compoundLogsTable, accountsTable, btConversationsTable, siteConfigTable, btKnowledgeCacheTable } from "@workspace/db";
import { dnaProfilesTable } from "@workspace/db";
import { SNP_MAP } from "@workspace/snp-database";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { randomUUID } from "crypto";
import { requireAccount } from "../middleware/account-auth";
import { GoogleGenAI } from "../lib/google-genai";
import { logCustomerActivity } from "../lib/activity-log";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

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

  gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: extractPrompt }] }],
    config: { maxOutputTokens: 1024 },
  }).then(async (r) => {
    const raw = (r.text ?? "").trim()
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

function buildBloodTestSystemPrompt(
  sessionName: string,
  sessionDate: string,
  biomarkers: BiomarkerContext[],
  activeCompounds: string[] = [],
  historicalSessions: SessionHistoryContext[] = [],
  dnaFindings: string = "",
  cachedKnowledge: Array<{ topic: string; summary: string }> = [],
): string {
  const dateObj = new Date(sessionDate + "T00:00:00");
  const displayDate = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" });

  const biomarkerLines = biomarkers.map(b => {
    const rangeStr = b.refRangeLow != null && b.refRangeHigh != null
      ? `ref: ${b.refRangeLow}–${b.refRangeHigh} ${b.unit}`
      : b.refRangeHigh != null ? `ref: up to ${b.refRangeHigh} ${b.unit}` : "no ref range";
    const flag = b.status === "out_of_range" ? " ⚠ OUT OF RANGE" : b.status === "borderline" ? " ⚡ BORDERLINE" : "";
    return `  - ${b.name}: ${b.value} ${b.unit} (${rangeStr})${flag}`;
  }).join("\n");

  const compoundsLine = activeCompounds.length > 0
    ? `KNOWN ACTIVE COMPOUNDS (from user's compound log — treat as a starting point, confirm if relevant): ${activeCompounds.join(", ")}`
    : `KNOWN ACTIVE COMPOUNDS: None logged.`;

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

  const dnaSection = dnaFindings
    ? `\n\n═══════════════════════════════════════════
PATIENT GENETIC PROFILE (DNA — uploaded by user)
═══════════════════════════════════════════
The user has uploaded their raw DNA data (23andMe / MyHeritage). The following variants were matched against a curated database. Use this to personalise your interpretation — e.g. MTHFR TT explains why B12/folate supplementation may differ, COMT AA explains dopamine sensitivity, aromatase variants explain E2 tendencies on TRT, Factor V Leiden is critical for clotting risk.
${dnaFindings}
Cross-reference these findings with the blood test results where clinically relevant. Do not repeat all findings verbatim — reference only the variants that are directly relevant to the biomarkers or compounds being discussed.`
    : "";

  const knowledgeSection = cachedKnowledge.length > 0
    ? `\n\n═══════════════════════════════════════════
CACHED COMMUNITY KNOWLEDGE (already researched — incorporate directly, no need to re-search these topics)
═══════════════════════════════════════════
The following community/forum insights have been retrieved from our knowledge base. Use them to inform your response. Do NOT search the web for these topics again — the knowledge is already here.
${cachedKnowledge.map(k => `[${k.topic.toUpperCase().replace(/_/g, " ")}]\n${k.summary}`).join("\n\n")}`
    : "";

  return `You are an expert personal health research assistant embedded in Peps Anonymous — a UK health optimisation and peptide community. Your job is to genuinely help the individual in front of you, not to give generic textbook answers. You serve a diverse membership: men on TRT or AAS, women navigating HRT, PCOS, or thyroid conditions, anyone tracking thyroid, metabolic, or cardiovascular health, GLP-1 users, people managing autoimmune conditions, and anyone optimising general health markers.

BLOOD TEST (CURRENT — most recent): ${sessionName} — ${displayDate}
BIOMARKERS:
${biomarkerLines}

${compoundsLine}${historicalSection}${persistentTrendsSection}${dnaSection}${knowledgeSection}

═══════════════════════════════════════════
PERSONA & TONE
═══════════════════════════════════════════
You are the knowledgeable friend who happens to have deep medical and pharmacological knowledge — frank, warm, zero fluff, not preachy. You combine the perspective of a forward-thinking sports medicine doctor, an experienced forum veteran, and a longevity-focused biohacker. You are equally at home discussing a woman's thyroid or HRT panel as a man's TRT protocol or peptide stack. You speak plainly. You don't hedge unnecessarily.

Your community knowledge spans the full spectrum of health forums — not just bodybuilding or TRT. You draw from:

Steroids / PEDs / cycles: MESO-Rx (ThinkSteroids), AnabolicSteroidForums.com, Eroids, Professional Muscle, UG Bodybuilding, T Nation (Pharma / T Replacement section), Evolutionary.org, MuscleChemistry, WorldClassBodybuilding, Steroidology, r/moreplatesmoredates, r/steroids.

TRT / HRT / hormones / bloodwork: ExcelMale, AnaSci HRT & TRT, Steroid.com HRT/Low-T section, Professional Muscle HRT, Canadian Brawn TRT/HRT, X-Steroids TRT/HRT, r/Testosterone, r/TRT_females, r/maleHRT. UK-specific: "TRT in the UK" communities, NHS/private clinic forums.

Menopause / women's HRT: Patient.info HRT forum, HysterSisters, Menopause Support, r/menopause, r/Perimenopause, r/HRT, r/PCOS, r/endometriosis, r/WomensHealth, r/TTC_PCOS.

Thyroid & autoimmune: Thyroid UK, ThyroidPatients.ca, r/Hypothyroidism, r/Hashimotos, r/GravesDisease, r/AutoimmuneDisease.

Metabolic / GLP-1 / diabetes: r/semaglutide, r/Ozempic, r/Mounjaro, r/diabetes, r/prediabetes, r/diabetes_t2, Diabetes UK forums.

Biohacking / quantified self: Biohacking Forum (biohacking.forum), Dangerous Things Forum, r/Biohackers, r/QuantifiedSelf, r/longevity, r/biohacking, r/nootropics, r/PeterAttia.

Supplements / general health: r/Supplements, AnabolicMinds, IronMagazine Forums, r/Anemic, r/sleep, Patient.info general health, r/Peptides.

Reference sources: MedlinePlus lab guides, NHS blood test resources, Private Blood Tests London, Cancer Research UK lab explanations.

When the question takes you outside hormones and peptides — into metabolic health, thyroid, women's health, autoimmune, cardiovascular, sleep, supplements, or anything else — you draw on those communities just as naturally.

═══════════════════════════════════════════
APPROACH — READ THIS CAREFULLY
═══════════════════════════════════════════
1. THINK IN PATTERNS, NOT SILOS. Never interpret a marker in isolation — always consider the full picture. Examples:
   - High testosterone + low LH/FSH = almost certainly exogenous androgens. Ask before assuming anything else.
   - High E2 alone tells you little without knowing T levels, aromatisation tendency, body fat, symptoms, and whether they're on exogenous androgens.
   - Elevated haematocrit makes more sense in context of testosterone dose, hydration, altitude, and time of draw.
   - Low HDL alone could be AAS lipid dysregulation or simply diet — ask.
   - Mildly elevated liver enzymes could be intense gym sessions, oral compounds, or alcohol — clarify before alarming them.
   - Abnormal TSH must be read alongside Free T4 and Free T3 — TSH alone is a poor picture of thyroid function.
   - Elevated androgens (DHEA-S, testosterone) in women with irregular cycles → think PCOS before anything else; check LH:FSH ratio.
   - Low ferritin in women is a very common finding and often explains fatigue before thyroid, anaemia, or mental health causes are considered.
   - Elevated fasting glucose or HbA1c needs context: recent illness, diet, steroid use, PCOS (insulin resistance), age and family history.

2. PROBE WHEN SOMETHING IS AMBIGUOUS. If a finding could have multiple explanations and the answer would change your advice, ask ONE focused clarifying question before giving a full recommendation. Pick the most important one.
   Examples:
   - T high, LH/FSH suppressed → "Are you currently on TRT, a test cycle, or any other exogenous androgens?"
   - E2 elevated → "Are you running any androgens that aromatise? Any symptoms — water retention, chest sensitivity, mood changes?"
   - Haematocrit high → "What's your current testosterone dose and ester? Do you donate blood regularly?"
   - Liver enzymes up → "Any oral compounds — Anavar, Superdrol, anything like that? How intense has training been?"
   - Prolactin elevated → "Any 19-nor compounds — Deca, NPP, Tren? Any lactation or sexual side effects?"
   - TSH elevated with normal frees → "Any recent illness, major stress, or are you on any thyroid medication?"
   - Women: elevated androgens → "Any signs of irregular cycles, excess hair growth, acne?"
   - Women: low ferritin → "How heavy are your periods? Any fatigue, brain fog, breathlessness?"

3. APPLY COMMUNITY & EVIDENCE KNOWLEDGE. Reference ranges are written for average sedentary populations. Apply real-world context:

   MEN'S HORMONES & AAS/TRT:
   - E2 of 80–150 pmol/L is often well-tolerated on TRT; don't automatically reach for an AI. Many men feel best with E2 in the 100–130 pmol/L range. Over-suppressing E2 with Anastrozole causes joint pain, depression, zero libido, brain fog. Exemestane (Aromasin) has a better rebound profile than Anastrozole; 12.5mg EOD is often better long-term.
   - ANASTROZOLE REBOUND (critical forum knowledge): Stopping Anastrozole abruptly after prolonged use causes a pronounced E2 rebound — often worse than the original E2 level — because the aromatase enzyme recovers suddenly with a surge effect. Anastrozole is a reversible competitive inhibitor with a ~46–48 hour half-life; after stopping, full aromatase recovery typically takes 2–4 weeks. Forum consensus (ExcelMale, UK TRT Reddit, Meso-Rx): never stop Anastrozole cold turkey — taper by halving the dose every 1–2 weeks. If E2 shoots up dramatically after a user stopped their AI, this is almost certainly rebound, not a new problem. Exemestane (Aromasin) suicidally inhibits aromatase (irreversible) so it physically cannot rebound — many experienced users switch to Exemestane 12.5mg E2D or E3D precisely for this reason. If someone asks about going from Anastrozole to Exemestane, the transition is typically: run both briefly, then drop Anastrozole gradually as Exemestane takes effect.
   - Haematocrit: most TRT protocols accept up to 52–54% before phlebotomy is warranted. Blood donation is first-line.
   - HDL suppression from AAS is dose- and compound-dependent. DHT derivatives (Anavar, Proviron, Masteron) hit HDL hardest. Omega-3 4g/day + cardio are practical interventions.
   - Low LH/FSH on exogenous androgens is expected — only a concern if coming off or preserving fertility.
   - Elevated PSA on TRT: a mild rise (0.5–1.5 above baseline) is common; velocity matters more than a single reading.
   - IGF-1 elevation on GH peptides is expected. Monitor fasting glucose alongside it.
   - Prolactin with 19-nor compounds (Deca, NPP, Tren): Cabergoline 0.25–0.5mg twice weekly is the standard community tool. P5P may help mildly.
   - PCT: Gonadorelin, Clomiphene, or Enclomiphene to restart the HPG axis. Nolvadex is gentler for oestrogen rebound. HCG during cycle preserves testicular volume.
   - SHBG: High SHBG reduces free testosterone. Boron (10mg/day), low-dose Proviron, or more frequent injections are practical options.
   - BPC-157: well-regarded for liver protection, gut healing, tendon repair. TUDCA 500–1000mg/day is considered essential by many oral compound users.
   - Fasting matters: testosterone is highest 8–9am — always ask timing if values seem off.

   WOMEN'S HORMONES & HRT:
   - Women on HRT (oestrogen + progesterone): transdermal oestrogen does not carry the VTE risk of oral oestrogen — this distinction matters when discussing cardiovascular markers.
   - Oestradiol levels on HRT vary widely by route and brand — a "low" result may simply reflect patch timing or formulation.
   - Progesterone (Utrogestan/micronised): serum progesterone on oral micronised is not a reliable indicator of tissue levels — don't over-interpret a low serum number.
   - PCOS: the LH:FSH ratio (classically >2:1) is useful when both are in range but LH is disproportionately elevated. Elevated total or free testosterone, raised DHEA-S, low SHBG all support the picture. Fasting insulin and HOMA-IR are increasingly recognised in management.
   - Perimenopause/menopause: FSH >30–40 IU/L alongside symptoms is more meaningful than a single value. Oestradiol fluctuates wildly in perimenopause — a single reading can be misleading.
   - Contraception (combined pill): suppresses LH/FSH (expected), raises SHBG significantly (lowers free testosterone, which can affect libido and mood), and can raise CRP. These are normal pharmacological effects, not pathology.
   - Low ferritin (<30 µg/L) is extremely common in women and frequently overlooked. Even with a normal haemoglobin, low ferritin causes fatigue, hair loss, brain fog, and reduced exercise tolerance. The Thyroid UK community strongly advocates treating ferritin <50–70 µg/L in symptomatic women.
   - Iron and ferritin: ferritin is an acute-phase reactant — can be falsely elevated in inflammation. Serum iron + TIBC + ferritin together give a better picture than ferritin alone.

   THYROID:
   - TSH alone is a poor screening tool for thyroid function — it's a pituitary signal, not a direct measure of thyroid output. Free T4 and Free T3 are the working markers.
   - Many people feel well only when TSH is 1–2 mIU/L, even though labs accept up to 4–5 mIU/L. The Thyroid UK and Stop The Thyroid Madness communities document this extensively.
   - On levothyroxine (T4-only): some people are poor T4→T3 converters (DIO2 gene variant). Adding liothyronine (T3) or switching to desiccated thyroid (NDT) can resolve residual symptoms despite "normal" labs.
   - Subclinical hypothyroidism (TSH elevated, frees normal): treat based on symptoms + antibodies (TPO-Ab), not TSH alone.
   - Hashimoto's: elevated TPO antibodies with fluctuating TSH. Gluten-free diet, selenium 200µg/day, and stress management are the community-supported interventions before medication.
   - Graves'/hyperthyroidism: suppressed TSH with elevated frees — needs urgent referral; community knowledge is less applicable here.
   - Reverse T3 (rT3): controversial but widely discussed. High rT3 with low-normal Free T3 suggests conversion issues. Stress, illness, very low-calorie diets, and selenium deficiency are common causes.

   METABOLIC & CARDIOVASCULAR:
   - HbA1c: a 3-month average. Values 39–47 mmol/mol (5.7–6.4%) are pre-diabetic range and warrant lifestyle intervention. Fasting glucose alone can be normal in early insulin resistance.
   - Fasting insulin: not routinely tested in the UK but highly informative. >60 pmol/L fasting suggests insulin resistance even with normal glucose. HOMA-IR is a simple calculated score.
   - Lipids: LDL must be read in context — pattern B (small dense LDL) is more atherogenic than pattern A. ApoB is a better cardiovascular risk marker than LDL-C. Triglycerides/HDL ratio >2 is a practical insulin resistance proxy.
   - Elevated CRP/hs-CRP: non-specific inflammation marker. Could be infection, overtraining, poor sleep, diet — context is everything. Chronic elevation (>3 mg/L) warrants investigation.
   - Vitamin D: below 50 nmol/L is deficiency; below 75 nmol/L is insufficiency. UK labs often use a lower threshold than optimal function requires. Supplementing 3,000–5,000 IU/day with K2 is safe for most adults.
   - B12: serum B12 doesn't reliably reflect cellular status. Active B12 (holotranscobalamin) is more informative. Values below 300 pg/mL (221 pmol/L) should be taken seriously in symptomatic patients even if technically "in range."

4. GIVE LAYERED, PRACTICAL ANSWERS. Always include:
   - What the number means in their specific context
   - Evidence-based interpretation (what research says)
   - Community-tested approaches (lifestyle, supplementation, dose adjustment) — clearly labelled as anecdotal
   - Pharmaceutical/clinical interventions where relevant, with nuances
   - What to monitor and when to retest
   - Red flags that genuinely warrant seeing a doctor

5. RESPONSE FORMAT & LENGTH. Structure your responses clearly — do NOT write wall-of-text paragraphs.
   - Start with a short 1–2 sentence summary answering the question directly.
   - Use ## headings to break up distinct sections (e.g. ## What's happening, ## What the forum says, ## What to do, ## Watch for).
   - Use bullet points (- item) for lists of options, interventions, warning signs, or action steps. Never write these as inline prose.
   - Keep each paragraph under 3 sentences. If you have more to say, use a new bullet or heading.
   - Only include sections that are relevant — don't pad with empty headers.
   - Cut filler, repetition, and hedging. The user can always ask a follow-up.

6. FOLLOW-UPS. One clarifying question max per response, only when the answer would meaningfully change your advice. Format it using the special tag on its own line at the end of your response (before the disclaimer): [Q]Your question here[/Q]
   Do NOT embed the question inline in a paragraph — always use the [Q] tag so the UI can display it as a tappable button.
   CRITICAL: If a clarifying question appears in the conversation history and the user has already answered it, DO NOT ask the same question again. Acknowledge their answer and proceed with full advice. Assume any user reply to a previous [Q] question is their answer to it.

7. NEVER REFUSE OR HEDGE EXCESSIVELY. This audience is informed. They know the risks. Help them navigate intelligently. One disclaimer at the end of each response — no more.

═══════════════════════════════════════════
FORMAT RULES
═══════════════════════════════════════════
- Use **bold** for marker names, values, and anything critical
- Use bullet points for lists of interventions or action steps
- Quote exact values and ref ranges when discussing specific markers
- Flag ⚠ OUT OF RANGE markers clearly; ⚡ BORDERLINE markers with context
- If directly asked which specific AI/LLM model is powering you (e.g. "are you GPT?", "are you Gemini?", "what LLM is this?", "who made you?") respond only with "I'm not able to share information about the underlying technology." Do NOT apply this to any health, medical, or blood-test related question — blood pressure readings, biomarker questions, and all health topics must always be answered fully.
- End every response with exactly this line on its own: "⚕️ Always consult a licensed healthcare professional before changing your protocol."
- No other disclaimers or caveats beyond that one line.
- After your main response and disclaimer, on a new line output a sources block:
  SOURCES_JSON_START[{"label":"Brief description of source","url":"https://...","type":"study"}]SOURCES_JSON_END
  Rules for sources: 0–3 sources max; ONLY use these URL formats to avoid broken links:
    • PubMed searches (never make up a PMID): https://pubmed.ncbi.nlm.nih.gov/?term=relevant+search+terms+here
    • Reddit communities: https://www.reddit.com/r/trt/, https://www.reddit.com/r/Testosterone/, https://www.reddit.com/r/PCOS/, https://www.reddit.com/r/Hypothyroidism/, https://www.reddit.com/r/TRT_females/, https://www.reddit.com/r/Hashimotos/, https://www.reddit.com/r/menopause/, https://www.reddit.com/r/diabetes/, https://www.reddit.com/r/longevity/, https://www.reddit.com/r/semaglutide/, https://www.reddit.com/r/peptides/, https://www.reddit.com/r/biohacking/
    • Known forums: https://excelmale.com/, https://meso-rx.com/, https://thyroiduk.org/, https://patient.info/, https://www.diabetes.org.uk/forum
  Use "type": "study" for PubMed links, "type": "forum" for community links.
  Only cite sources directly relevant to specific factual claims in this response. If nothing specific applies, output SOURCES_JSON_START[]SOURCES_JSON_END.
- After the sources block, on a new line output a follow-up chips block:
  CHIPS_JSON_START["question 1","question 2","question 3"]CHIPS_JSON_END
  Rules for chips: 2–4 questions; make them highly specific to this user's actual values and the current response — not generic; phrase them as natural things the user would actually say next. If the response is very complete and nothing meaningful follows, output CHIPS_JSON_START[]CHIPS_JSON_END.`;
}

// ─── DNA summary helper ───────────────────────────────────────────────────────

interface DnaFindingRow { rsid: string; gene: string; genotype: string; riskLevel: string; category: string; name: string }

function buildDnaSummary(findings: DnaFindingRow[]): string {
  if (!findings || findings.length === 0) return "";
  const notable = findings.filter(f => f.riskLevel === "high" || f.riskLevel === "moderate");
  const rows = notable.length > 0 ? notable : findings.slice(0, 10);
  const entry = (f: DnaFindingRow) => {
    const snp = SNP_MAP.get(f.rsid.toLowerCase());
    const notes = snp?.notes ?? "";
    return `• ${f.gene} (${f.rsid}) — ${f.name} — Genotype: ${f.genotype} [${f.riskLevel.toUpperCase()}]\n  ${notes}`;
  };
  const byCategory = new Map<string, DnaFindingRow[]>();
  for (const f of rows) {
    const cat = f.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(f);
  }
  let out = "";
  for (const [cat, catFindings] of byCategory) {
    out += `\n[${cat}]\n${catFindings.map(entry).join("\n")}\n`;
  }
  return out;
}

const CHIPS_RE = /CHIPS_JSON_START(\[[\s\S]*?\])CHIPS_JSON_END/;
const SOURCES_RE = /SOURCES_JSON_START(\[[\s\S]*?\])SOURCES_JSON_END/;
const Q_TAG_RE = /\[Q\]([\s\S]*?)\[\/Q\]/g;

interface DiscussSource { label: string; url: string; type: "study" | "forum" | "other" }

function parseResponse(raw: string): { text: string; chips: string[]; sources: DiscussSource[] } {
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

  // Extract [Q]...[/Q] follow-up questions from text and add to chips
  let text = raw.replace(CHIPS_RE, "").replace(SOURCES_RE, "");
  const qMatches = [...text.matchAll(Q_TAG_RE)];
  for (const m of qMatches) {
    const q = m[1].trim();
    if (q && !chips.includes(q)) chips.push(q);
  }
  // Strip [Q] tags from displayed text
  text = text.replace(Q_TAG_RE, "").trim();

  return { text: text || "Sorry, I wasn't able to generate a response. Please try again.", chips, sources };
}

async function callGeminiDiscuss(
  message: string,
  sessionName: string,
  sessionDate: string,
  biomarkers: BiomarkerContext[],
  history: HistoryMessage[] = [],
  activeCompounds: string[] = [],
  historicalSessions: SessionHistoryContext[] = [],
  dnaFindings: string = "",
  cachedKnowledge: Array<{ topic: string; summary: string }> = [],
): Promise<{ text: string; chips: string[]; sources: DiscussSource[] }> {
  const systemPrompt = buildBloodTestSystemPrompt(sessionName, sessionDate, biomarkers, activeCompounds, historicalSessions, dnaFindings, cachedKnowledge);

  // Cap history at last 20 messages (10 turns each side) to keep tokens manageable
  const cappedHistory = history.slice(-20);

  const contents = [
    ...cappedHistory.map(h => ({
      role: h.role === "assistant" ? "model" : "user",
      parts: [{ text: h.content }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  console.log(`[discuss] Calling Gemini with ${contents.length} turn(s), ${biomarkers.length} biomarkers, ${cachedKnowledge.length} cached topic(s)`);

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents,
    config: {
      systemInstruction: systemPrompt,
      maxOutputTokens: 8192,
      tools: [{ googleSearch: {} }],
    },
  });

  const raw = response.text ?? "";
  console.log(`[discuss] Gemini responded with ${raw.length} chars`);

  // Log web searches performed and async-populate the knowledge cache from this response
  try {
    const candidate = response.candidates?.[0];
    const groundingMeta = (candidate as Record<string, unknown> | undefined)?.groundingMetadata as Record<string, unknown> | undefined;
    const queries = groundingMeta?.webSearchQueries as string[] | undefined;
    if (queries && queries.length > 0) {
      console.log(`[discuss] Web searches performed: ${queries.join(", ")}`);
    }
  } catch { /* non-critical */ }

  // Async: extract community knowledge from this response and store in knowledge base
  // This runs after the response is parsed and returned — it never delays the user
  extractAndCacheKnowledge(raw);

  return parseResponse(raw);
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

  const prompt = `You are a health analytics assistant for a peptide and health optimisation platform called Peps Anonymous. Based on the user's blood test data, generate a JSON response with exactly three fields.

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

  console.log(`[health-insights] Calling Gemini with ${biomarkers.length} biomarkers`);

  const response = await gemini.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: { maxOutputTokens: 1024 },
  });

  const raw = (response.text ?? "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

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
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{
        role: "user",
        parts: [
          {
            inlineData: {
              mimeType: mt,
              data: imageBase64,
            },
          },
          {
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
      config: { maxOutputTokens: 4096 },
    });

    console.log("[extract-image] OCR complete, chars:", (response.text ?? "").length);
    res.json({ text: response.text ?? "" });
  } catch (err) {
    console.error("[extract-image] Gemini error:", err);
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

const DEFAULT_DISCUSS_LIMIT = 5;

async function getDiscussLimit(telegramUsername: string): Promise<number> {
  const [acct] = await db
    .select({ discussLimitOverride: accountsTable.discussLimitOverride })
    .from(accountsTable)
    .where(eq(accountsTable.telegramUsername, telegramUsername));
  if (acct?.discussLimitOverride != null) return acct.discussLimitOverride;
  const [cfg] = await db.select({ value: siteConfigTable.value }).from(siteConfigTable).where(eq(siteConfigTable.key, "discuss_limit"));
  if (cfg?.value) { const n = parseInt(cfg.value, 10); if (!isNaN(n)) return n; }
  return DEFAULT_DISCUSS_LIMIT;
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

  const [compoundRows, allSessions, dnaRow] = await Promise.all([
    db.select({ compoundName: compoundLogsTable.compoundName, endDate: compoundLogsTable.endDate })
      .from(compoundLogsTable).where(eq(compoundLogsTable.telegramUsername, tg)),
    db.select().from(bloodTestSessionsTable)
      .where(eq(bloodTestSessionsTable.telegramUsername, tg))
      .orderBy(desc(bloodTestSessionsTable.testDate)),
    db.select().from(dnaProfilesTable).where(eq(dnaProfilesTable.accountId, tg)).limit(1),
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

  const dnaFindings = buildDnaSummary(dnaRow[0]?.findings ?? []);

  const sessionDisplayName = session.testName ?? session.labName ?? "Blood Test";
  const systemPrompt = buildBloodTestSystemPrompt(sessionDisplayName, session.testDate, biomarkers, activeCompounds, historicalSessions, dnaFindings);

  const openingInstruction = `The user has just opened a new chat about their blood test. Generate a smart, personalised opening message that:
1. Briefly acknowledges the most notable finding(s) — mention specific values and whether they're in/out of range
2. If anything is ambiguous and context would change your interpretation (e.g. high T with suppressed LH/FSH, elevated E2, high haematocrit), ask ONE focused clarifying question
3. Keep it conversational — 3 to 6 sentences total, no long bullet lists in the opener
4. End with the standard disclaimer line

Do NOT say "Hello" or "Hi there" — just get straight into the findings. You are looking at their test results and speaking directly to them.`;

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: openingInstruction }] }],
      config: { systemInstruction: systemPrompt, maxOutputTokens: 1024 },
    });
    res.json({ response: response.text ?? "I've reviewed your results. What would you like to explore?" });
  } catch {
    res.json({ response: "I've reviewed your results — ask me anything about what you see here." });
  }
});

// POST /api/blood-tests/discuss — contextual AI-like chat with blood test data
router.post("/blood-tests/discuss", requireAccount, async (req, res): Promise<void> => {
  const tg = req.account!.telegramUsername;
  const { message, sessionId, history = [] } = req.body as { message: string; sessionId?: string; history?: HistoryMessage[] };

  if (!message || typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
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
    // No tests uploaded yet — do not consume quota
    const [acct] = await db
      .select({ discussCount: accountsTable.discussCount })
      .from(accountsTable)
      .where(eq(accountsTable.telegramUsername, tg));
    const currentUsed = acct?.discussCount ?? 0;
    res.json({
      response: "You haven't logged any blood tests yet. Head to the Upload tab to add your first test, then I can help you interpret the results.",
      contextSession: null,
      used: currentUsed,
      limit: effectiveLimit,
    });
    return;
  }

  // Guardrail: only block direct questions about the underlying AI technology (not health questions)
  const LLM_KEYWORDS = /\bwhich\s+(ai|llm)\b|\bwhat\s+(ai|llm)\b|\bare\s+you\s+(gpt|claude|gemini|llama|mistral|chatgpt)\b|\bwho\s+made\s+you\b|\bopenai\b|\banthropic\b|\bgoogle\s+ai\b|\bwhat\s+(ai|llm)\s+model\b|\blanguage\s+model\b|\bwhat\s+are\s+you\b.*\b(ai|bot|model)\b/i;

  const getUsedCount = async () => {
    const [a] = await db.select({ discussCount: accountsTable.discussCount }).from(accountsTable).where(eq(accountsTable.telegramUsername, tg));
    return a?.discussCount ?? 0;
  };

  if (LLM_KEYWORDS.test(message)) {
    res.json({
      response: "I'm not able to share information about the underlying technology.",
      contextSession: null,
      used: await getUsedCount(),
      limit: effectiveLimit,
    });
    return;
  }

  // Step 2: Increment usage counter (no limit enforced)
  const updated = await db
    .update(accountsTable)
    .set({ discussCount: sql`${accountsTable.discussCount} + 1` })
    .where(eq(accountsTable.telegramUsername, tg))
    .returning({ newCount: accountsTable.discussCount });

  const newCount = updated[0]?.newCount ?? (await getUsedCount());

  // Step 3: Build biomarker context for current session + all historical sessions
  const [values, compoundRows, allSessionsList, dnaRow] = await Promise.all([
    db.select().from(bloodTestValuesTable).where(eq(bloodTestValuesTable.sessionId, session.id)),
    db.select({ compoundName: compoundLogsTable.compoundName, endDate: compoundLogsTable.endDate })
      .from(compoundLogsTable).where(eq(compoundLogsTable.telegramUsername, tg)),
    db.select().from(bloodTestSessionsTable)
      .where(eq(bloodTestSessionsTable.telegramUsername, tg))
      .orderBy(desc(bloodTestSessionsTable.testDate)),
    db.select().from(dnaProfilesTable).where(eq(dnaProfilesTable.accountId, tg)).limit(1),
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

  // Step 4: Call Gemini — roll back the reserved slot if it fails
  let responseText: string;
  let responseChips: string[] = [];
  let responseSources: DiscussSource[] = [];
  try {
    const dnaFindings = buildDnaSummary(dnaRow[0]?.findings ?? []);
    const cacheTopics = extractTopicsForCache(message, biomarkers);
    const cachedKnowledge = await lookupKnowledgeCache(cacheTopics);
    if (cachedKnowledge.length > 0) {
      console.log(`[discuss] Knowledge cache hit: ${cachedKnowledge.map(k => k.topic).join(", ")}`);
    }
    const result = await callGeminiDiscuss(message, sessionDisplayName, session.testDate, biomarkers, history, activeCompounds, historicalSessions, dnaFindings, cachedKnowledge);
    responseText = result.text;
    responseChips = result.chips;
    responseSources = result.sources;
  } catch (err) {
    console.error("[discuss] Gemini error:", err);
    await db
      .update(accountsTable)
      .set({ discussCount: sql`GREATEST(${accountsTable.discussCount} - 1, 0)` })
      .where(eq(accountsTable.telegramUsername, tg));
    res.status(500).json({
      error: "ai_unavailable",
      response: "I'm having trouble reaching the AI right now. Please try again in a moment.",
      contextSession: null,
      used: newCount - 1,
      limit: effectiveLimit,
    });
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

  res.json({
    response: responseText,
    chips: responseChips,
    sources: responseSources,
    contextSession: {
      id: session.id,
      testName: session.testName ?? session.labName ?? "Blood Test",
      testDate: session.testDate,
    },
    used: newCount,
    limit: effectiveLimit,
  });
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
