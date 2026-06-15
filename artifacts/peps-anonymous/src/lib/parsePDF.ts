import * as pdfjsLib from "pdfjs-dist";
import mammoth from "mammoth";

// Use the built worker via Vite's ?url import so no CDN dependency
// @ts-ignore — Vite resolves this at build time
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

// ─── Biomarker search index ────────────────────────────────────────────────────
// Patterns ordered most-specific first to avoid false matches.
// notWith: if the matched line contains any of these strings, skip that
//          occurrence and try the next match of the same pattern.
// Covers: same-line tabular (Thriva), next-line visual (Voy/Randox)

type SearchEntry = { code: string; patterns: string[]; notWith?: string[] };

const BIOMARKER_SEARCH_INDEX: SearchEntry[] = [
  {
    code: "FTEST",
    patterns: [
      "free testosterone",
      "ftest",
      "testosterone, free",
      "testosterone free",
    ],
  },
  {
    code: "TEST",
    // notWith: skip lines that also contain "free", "sex", or "binding" so
    // we don't accidentally match "Free Testosterone" or "Sex Hormone Binding"
    patterns: ["total testosterone", "testosterone total", "testosterone"],
    notWith: ["free", "sex", "binding"],
  },
  {
    code: "LH",
    patterns: [
      "luteinising hormone",
      "luteinizing hormone",
      "lh ",
      "lutenising",
    ],
  },
  {
    code: "FSH",
    patterns: [
      "follicle stimulating hormone",
      "follicle-stimulating hormone",
      "follicle-stimulating",
      "fsh ",
    ],
  },
  {
    code: "ESTR",
    patterns: [
      "oestradiol",
      "estradiol",
      "estrogen",
      "17-beta estradiol",
      "17β-estradiol",
    ],
  },
  { code: "PROL", patterns: ["prolactin", "prl "] },
  {
    code: "SHBG",
    patterns: [
      "sex hormone binding globulin",
      "sex-hormone binding globulin",
      "sex hormone binding glob",
      "sex horm binding",
      "sex-hormone binding",
      "shbg",
    ],
  },
  {
    code: "FAI",
    patterns: ["free androgen index", "fai "],
  },
  {
    code: "TSH",
    patterns: [
      "thyroid stimulating hormone",
      "thyroid-stimulating hormone",
      "thyroid stim",
      "thyroid function",
      "tsh ",
      "tsh)",
    ],
  },
  {
    code: "FT4",
    patterns: [
      "free thyroxine",
      "free t4",
      "thyroxine, free",
      "thyroxine free",
      "ft4",
    ],
  },
  {
    code: "FT3",
    patterns: [
      "free triiodothyronine",
      "free tri-iodothyronine",
      "free t3",
      "triiodothyronine, free",
      "triiodothyronine free",
      // bare "triiodothyronine" catches "Triiodothyronine (T3), Free" (Labcorp format)
      "triiodothyronine",
      "ft3 ",
    ],
    // notWith: avoid matching "Total Triiodothyronine" (a different marker)
    notWith: ["total"],
  },
  {
    code: "ATPO",
    patterns: [
      "anti-thyroid peroxidase",
      "anti thyroid peroxidase",
      "thyroid peroxidase antibod",
      "anti-tpo",
      "tpo antibod",
    ],
  },
  {
    code: "ATPG",
    patterns: [
      "anti-thyroglobulin",
      "anti thyroglobulin",
      "thyroglobulin antibod",
      "anti-tg ",
    ],
  },
  {
    code: "HCT",
    patterns: ["haematocrit", "hematocrit", "hct ", "packed cell volume", "pcv "],
  },
  {
    code: "HEMO",
    patterns: ["haemoglobin", "hemoglobin", "hgb ", "hb "],
  },
  {
    code: "RBC",
    patterns: ["red blood cell", "red cell count", "rbc ", "erythrocyte"],
  },
  {
    code: "WBC",
    patterns: ["white blood cell", "white blood count", "white cell count", "wbc ", "leukocyte", "leucocyte"],
  },
  { code: "LYMPH", patterns: ["lymphocyte", "lymphs "] },
  { code: "MONO",  patterns: ["monocyte", "monos "] },
  { code: "NEUT",  patterns: ["neutrophil", "neuts "] },
  { code: "PLT",   patterns: ["platelet", "plt ", "thrombocyte"] },
  { code: "RDW",   patterns: ["red cell distribution width", "red blood cell distribution width", "rdw "] },
  { code: "MPV",   patterns: ["mean platelet volume", "mpv "] },
  {
    code: "MCV",
    patterns: ["mean cell volume", "mean corpuscular volume", "mcv "],
  },
  {
    code: "MCHC",
    patterns: [
      "mean cell haemoglobin concentration",
      "mean corpuscular haemoglobin concentration",
      "mchc",
    ],
  },
  {
    code: "MCH",
    patterns: ["mean cell haemoglobin", "mean corpuscular haemoglobin", " mch "],
  },
  { code: "BASO", patterns: ["basophil", "basos "] },
  { code: "EOS",  patterns: ["eosinophil", "eos "] },
  // NHDL before HDL: " hdl " matches inside "non hdl cholesterol" without this guard
  {
    code: "NHDL",
    patterns: ["non hdl cholesterol", "non-hdl cholesterol", "non hdl-c", "non-hdl-c"],
  },
  {
    code: "HDL",
    patterns: [
      "high-density lipoprotein",
      "high density lipoprotein",
      "hdl cholesterol",
      "hdl-c",
      " hdl ",
    ],
    notWith: ["non"],
  },
  // VLDL before LDL: "ldl cholesterol" / "ldl-c" are substrings of VLDL variants
  {
    code: "VLDL",
    patterns: [
      "vldl cholesterol",
      "vldl-c",
      "vldl cal",
      "very low density lipoprotein",
      "very-low-density lipoprotein",
    ],
  },
  {
    code: "LDL",
    patterns: [
      "low-density lipoprotein",
      "low density lipoprotein",
      "ldl cholesterol",
      "ldl-c",
      " ldl ",
    ],
    notWith: ["vldl"],
  },
  {
    code: "TRIG",
    patterns: [
      "triglyceride",
      "triacylglycerol",
      "trig ",
    ],
  },
  // THDL before CHOL so "Total Cholesterol/HDL Ratio" is consumed by THDL,
  // leaving the standalone "Total Cholesterol" section for CHOL.
  {
    code: "THDL",
    patterns: [
      "total cholesterol:hdl",
      "cholesterol:hdl",
      // space-slash-space format used by some UK labs: "Total Cholesterol / HDL Ratio"
      "cholesterol / hdl",
      "cholesterol/hdl",
      // abbreviated form used by US labs: "CHOL/HDLC RATIO"
      "chol/hdl",
      "chol:hdl",
      "tc/hdl",
      "total:hdl",
    ],
  },
  {
    code: "CHOL",
    // notWith: skip lines that also mention hdl so "Total Cholesterol/HDL Ratio"
    // doesn't get consumed by this entry (THDL handles that line above).
    patterns: ["total cholesterol", "cholesterol total", "cholesterol, total"],
    notWith: ["hdl"],
  },
  {
    code: "ALT",
    patterns: ["alanine transaminase", "alanine aminotransferase", "alt ", "sgpt"],
  },
  {
    code: "AST",
    patterns: ["aspartate transaminase", "aspartate aminotransferase", "ast ", "sgot"],
  },
  {
    code: "ALP",
    patterns: ["alkaline phosphatase", "alk phos", "alp "],
  },
  {
    code: "GGT",
    patterns: [
      "gamma-glutamyl transferase",
      "gamma glutamyl transferase",
      "ggt ",
      "gamma-gt",
    ],
  },
  { code: "ALB",   patterns: ["albumin"], notWith: ["hypo", "micro", "macro", "glyco"] },
  { code: "BILI",  patterns: ["bilirubin", "bili "] },
  { code: "CREA",  patterns: ["creatinine", "creat "] },
  {
    code: "eGFR",
    patterns: ["estimated glomerular filtration", "egfr", "gfr "],
    notWith: ["method", "using ckd", "using the", "information", "please see", "www."],
  },
  {
    code: "UREA",
    patterns: ["urea ", " urea", "blood urea nitrogen", "bun ", "serum urea"],
  },
  {
    code: "HbA1c",
    patterns: [
      "glycated haemoglobin",
      "glycated hemoglobin",
      "haemoglobin a1c",
      "hemoglobin a1c",
      "hba1c",
      "a1c ",
    ],
    // Skip note lines that mention HbA1c ranges as clinical advice (e.g. "HbA1c 42–47 suggests...")
    notWith: ["suggests", "consistent with", "risk of", "target in", "for diagnosis", "mmol/mol +"],
  },
  { code: "FER",   patterns: ["ferritin"] },
  {
    code: "PSA",
    patterns: ["prostate specific antigen", "prostate-specific antigen", "psa "],
  },
  // ── Vitamins ──────────────────────────────────────────────────────────────
  {
    code: "VIT_D",
    patterns: [
      "25-oh vitamin d",
      "25 oh vitamin d",
      "25-hydroxyvitamin d",
      "25-hydroxy vitamin d",
      "25(oh)d",
      "vitamin d",
    ],
  },
  {
    // Active B12 must come before total B12 to avoid the "active" prefix being
    // consumed by the broader "vitamin b12" / "b12" pattern.
    code: "ACTB12",
    patterns: [
      "active b12",
      "holotranscobalamin",
      "active vitamin b12",
    ],
  },
  {
    code: "VITB12",
    // notWith: skip lines that contain "active" (handled by ACTB12 above)
    patterns: [
      "total vitamin b12",
      "vitamin b12",
      "total b12",
      "cobalamin",
      "b12 ",
    ],
    notWith: ["active"],
  },
  {
    code: "FOL",
    patterns: [
      "red cell folate",
      "serum folate",
      "folic acid",
      "folate",
    ],
  },
  // ── Extra metabolic / hormones ─────────────────────────────────────────────
  {
    code: "CRP",
    patterns: [
      "high sensitivity crp",
      "high-sensitivity crp",
      "hs-crp",
      "hscrp",
      "c-reactive protein",
      "c reactive protein",
      "crp ",
    ],
  },
  {
    code: "URIC",
    patterns: ["uric acid", "urate"],
  },
  {
    code: "IRON",
    // notWith: avoid "iron binding" (TIBC), "iron saturation" (TSAT) lines
    patterns: [
      "serum iron",
      "iron ",
    ],
    notWith: ["binding", "saturation", "transferrin"],
  },
  {
    code: "TSAT",
    patterns: [
      "transferrin saturation",
      "iron saturation",
      "% saturation",
    ],
  },
  {
    code: "DHEAS",
    patterns: [
      "dehydroepiandrosterone sulphate",
      "dehydroepiandrosterone sulfate",
      "dhea sulphate",
      "dhea sulfate",
      "dhea-s",
      "dheas",
    ],
  },
  {
    code: "COR",
    patterns: ["serum cortisol", "cortisol"],
  },
  {
    code: "IGF1",
    patterns: [
      "insulin-like growth factor",
      "insulin like growth factor",
      "igf-1",
      "igf-i",
      "igf1 ",
    ],
  },
  // ── Cardiac ───────────────────────────────────────────────────────────────
  // CKMB must come before CK so "creatine kinase-mb" is consumed first
  { code: "CKMB",  patterns: ["creatine kinase-mb", "ck-mb", "ckmb"] },
  { code: "CK",    patterns: ["creatine kinase", "total ck", "ck "], notWith: ["-mb", "myocardial"] },
  { code: "HSTNT", patterns: ["high sensitivity troponin t", "high-sensitivity troponin t", "troponin t", "hs-tnt", "hstnt"], notWith: ["troponin i"] },
  { code: "HSTNI", patterns: ["high sensitivity troponin i", "high-sensitivity troponin i", "troponin i", "hs-tni", "hstni"] },
  { code: "BNP",   patterns: ["brain natriuretic peptide", "bnp "] },
  { code: "NTBNP", patterns: ["nt-probnp", "nt probnp", "n-terminal pro-bnp", "n-terminal probnp", "probnp"] },
  // ── Additional Liver / Protein ────────────────────────────────────────────
  { code: "DBILI", patterns: ["direct bilirubin", "conjugated bilirubin", "direct bili"] },
  { code: "TPROT", patterns: ["total protein", "protein total", "serum total protein"] },
  { code: "GLOB",  patterns: ["globulin"], notWith: ["thyro", "sex"] },
  // ── Additional Kidney ─────────────────────────────────────────────────────
  { code: "CYSTC", patterns: ["cystatin c", "cystatin-c"] },
  // ── Additional Hormones ───────────────────────────────────────────────────
  { code: "PROG",  patterns: ["progesterone"] },
  { code: "PTH",   patterns: ["parathyroid hormone", "pth "] },
  // ── Cardiovascular lipid additions ────────────────────────────────────────
  { code: "APOB",  patterns: ["apolipoprotein b", "apo b ", "apob "] },
  { code: "APOA1", patterns: ["apolipoprotein a1", "apolipoprotein a-1", "apo a1", "apoa1"] },
  { code: "LPA",   patterns: ["lipoprotein(a)", "lipoprotein a ", "lp(a)", "lp-a ", "lpa "] },
  // ── Glycaemic / Metabolic ─────────────────────────────────────────────────
  { code: "GLUC",  patterns: ["fasting glucose", "plasma glucose", "blood glucose", "serum glucose", "random glucose", "glucose "] },
  { code: "INS",   patterns: ["fasting insulin", "serum insulin", "insulin "], notWith: ["like", "growth"] },
  { code: "CPEP",  patterns: ["c-peptide", "c peptide"] },
  { code: "HCYS",  patterns: ["homocysteine", "hcy "] },
  // ── Inflammatory ─────────────────────────────────────────────────────────
  { code: "ESR",   patterns: ["erythrocyte sedimentation", "esr "] },
  { code: "IL6",   patterns: ["interleukin-6", "interleukin 6", "il-6 ", "il6 "] },
  { code: "TNF",   patterns: ["tumour necrosis factor", "tumor necrosis factor", "tnf-alpha", "tnf-α", "tnf "] },
  { code: "FIB",   patterns: ["fibrinogen"] },
  // ── Iron panel additions ──────────────────────────────────────────────────
  { code: "TRANS", patterns: ["transferrin"], notWith: ["saturation", "tsat", "iron", "binding"] },
  { code: "TIBC",  patterns: ["total iron binding", "tibc ", "iron binding capacity", "iron-binding capacity"] },
  // ── Minerals ─────────────────────────────────────────────────────────────
  { code: "MG",    patterns: ["magnesium", "serum magnesium"] },
  { code: "ZN",    patterns: ["zinc"] },
  // ── Electrolytes ─────────────────────────────────────────────────────────
  { code: "NA",    patterns: ["sodium"] },
  { code: "K",     patterns: ["potassium", "kalium"] },
  { code: "CL",    patterns: ["chloride"] },
  { code: "CA",    patterns: ["calcium"] },
  // ── Electrolyte extras ────────────────────────────────────────────────────
  // "co2 " catches CMP panels; "bicarbonate" catches UK gas/metabolic panels
  { code: "CO2",   patterns: ["carbon dioxide, total", "carbon dioxide total", "total carbon dioxide", "bicarbonate", "co2 "] },
];

// ─── Extract text from PDF ─────────────────────────────────────────────────────

export async function extractPDFText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    type TextItem = { str: string; x: number; y: number };
    const items: TextItem[] = [];
    for (const item of textContent.items) {
      if ("str" in item && item.str.trim()) {
        const tx = item.transform;
        items.push({ str: item.str, x: tx[4], y: Math.round(tx[5]) });
      }
    }

    // Sort: top of page first (y desc), then left to right (x asc)
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group into lines by y-coordinate
    const lines: string[] = [];
    let currentY: number | null = null;
    let currentLine: string[] = [];

    for (const item of items) {
      if (currentY === null || Math.abs(item.y - currentY) > 2) {
        if (currentLine.length > 0) lines.push(currentLine.join(" "));
        currentLine = [item.str];
        currentY = item.y;
      } else {
        currentLine.push(item.str);
      }
    }
    if (currentLine.length > 0) lines.push(currentLine.join(" "));

    pageTexts.push(lines.join("\n"));
  }

  return pageTexts.join("\n");
}

// ─── Strip distracting annotations from a text segment ───────────────────────

function cleanValueText(text: string): string {
  return text
    // Strip biomarker code annotations like "(FT4)", "(TSH)", "(SHBG)" — these contain
    // digits (e.g. "FT4") that confuse the number extractor
    .replace(/\([A-Za-z][A-Za-z0-9\-]{1,9}\)/g, "")
    // Strip ref range formats: "(12-30)", "[12-30]", "Ref: 12-30"
    .replace(/ref(?:erence)?\s*:?\s*\d+\.?\d*\s*[-–]\s*\d+\.?\d*/gi, "")
    .replace(/\(\s*\d+\.?\d*\s*[-–]\s*\d+\.?\d*\s*\)/g, "")
    .replace(/\[\s*\d+\.?\d*\s*[-–]\s*\d+\.?\d*\s*\]/g, "")
    // Strip single-bound ranges like "[> 49.9]", "[< 60]", "(> 90)" — common in NHS results
    .replace(/[\[(][<>≤≥]\s*\d+\.?\d*\s*[\])]/g, "")
    // Strip trailing notes after semicolon (e.g. "; Above high reference limit")
    .replace(/;.*$/g, "")
    // Strip flag letters that appear inline
    .replace(/\b(?:H|L|N|HIGH|LOW|NORMAL|OPTIMAL|VERY HIGH|VERY LOW|ABOVE|BELOW)\b/gi, "");
}

// ─── Normalize US / non-SI units to the catalog's stored SI units ─────────────
// Many US labs (Quest, Labcorp) report in different units than the UK/EU standard.
// Detect the unit on the matched line and convert to the stored SI unit if needed.
// Conversion factors are consistent with BT_UNIT_CONVERSIONS in CustomerPortal.tsx.
function normalizeUnits(code: string, value: number, rawLine: string): number {
  const line = rawLine.toLowerCase();

  switch (code) {
    // Haematocrit: L/L (fraction, e.g. 0.477) → % (e.g. 47.7) — used by NHS
    case "HCT":
      if (/\bl\/l\b/.test(line) && value > 0 && value < 1.5) return parseFloat((value * 100).toFixed(1));
      break;

    // Testosterone & free testosterone: ng/dL → nmol/L  (÷28.842)
    case "TEST":
    case "FTEST":
      if (/\bng\/dl\b/i.test(line)) return parseFloat((value / 28.842).toFixed(3));
      break;

    // Oestradiol: pg/mL → pmol/L  (÷0.2724)
    case "ESTR":
      if (/\bpg\/ml\b/i.test(line)) return parseFloat((value / 0.2724).toFixed(1));
      break;

    // Prolactin: ng/mL → mIU/L  (×21.2)
    case "PROL":
      if (/\bng\/ml\b/i.test(line)) return parseFloat((value * 21.2).toFixed(0));
      break;

    // Cholesterol, LDL, HDL, Non-HDL, VLDL: mg/dL → mmol/L  (÷38.67)
    case "CHOL":
    case "LDL":
    case "HDL":
    case "NHDL":
    case "VLDL":
      if (/\bmg\/dl\b/i.test(line)) return parseFloat((value / 38.67).toFixed(2));
      break;

    // Triglycerides: mg/dL → mmol/L  (÷88.57)
    case "TRIG":
      if (/\bmg\/dl\b/i.test(line)) return parseFloat((value / 88.57).toFixed(2));
      break;

    // Glucose: mg/dL → mmol/L  (÷18.016)
    case "GLUC":
      if (/\bmg\/dl\b/i.test(line)) return parseFloat((value / 18.016).toFixed(1));
      break;

    // Creatinine: mg/dL → μmol/L  (÷0.01131 = ×88.42)
    case "CREA":
      if (/\bmg\/dl\b/i.test(line)) return parseFloat((value / 0.01131).toFixed(0));
      break;

    // Calcium: mg/dL → mmol/L  (×0.2495)
    case "CA":
      if (/\bmg\/dl\b/i.test(line)) return parseFloat((value * 0.2495).toFixed(2));
      break;

    // Bilirubin (total & direct): mg/dL → μmol/L  (÷0.05847 = ×17.1)
    case "BILI":
    case "DBILI":
      if (/\bmg\/dl\b/i.test(line)) return parseFloat((value / 0.05847).toFixed(1));
      break;

    // Total Protein, Albumin, Globulin: g/dL → g/L  (×10)
    case "TPROT":
    case "ALB":
    case "GLOB":
      if (/\bg\/dl\b/i.test(line)) return parseFloat((value * 10).toFixed(1));
      break;

    // Haemoglobin, MCHC: g/dL → g/L  (×10)
    case "HEMO":
    case "MCHC":
      if (/\bg\/dl\b/i.test(line)) return parseFloat((value * 10).toFixed(0));
      break;

    // Free T3: pg/mL → pmol/L  (÷0.6509)
    case "FT3":
      if (/\bpg\/ml\b/i.test(line)) return parseFloat((value / 0.6509).toFixed(2));
      break;

    // Free T4: ng/dL → pmol/L  (÷0.07752)
    case "FT4":
      if (/\bng\/dl\b/i.test(line)) return parseFloat((value / 0.07752).toFixed(1));
      break;

    // HbA1c: NGSP % (US, e.g. 5.7) → IFCC mmol/mol (UK, e.g. 39)
    // US values are <20; any stored UK value is ≥20, so value <20 with % = NGSP.
    case "HbA1c":
      if (value < 20 && /%/.test(line) && !/mmol/.test(line))
        return Math.round((value - 2.152) / 0.09148);
      break;
  }
  return value;
}

// ─── Extract first plausible numeric value from a string ─────────────────────

function extractNumber(text: string): number | null {
  // Remove date-like patterns before scanning for a result number
  const clean = text
    // DD/MM/YYYY, DD-MM-YYYY etc.
    .replace(/\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4}/g, "")
    // "3 Apr 2026", "15 March 2024" (written-month format used by Voy header)
    .replace(/\b\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}\b/gi, "")
    // "April 3, 2026" / "Apr 3 2026"
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}(?:st|nd|rd|th)?\s*,?\s*\d{4}\b/gi, "");
  // Negative lookbehind: only match digits NOT immediately preceded by a letter.
  // This prevents matching the "4" in "FT4", the "1" in "HBA1C", "12" in "B12", etc.
  const match = clean.match(/(?<![A-Za-z])(\d+\.?\d*)/);
  if (!match) return null;
  const n = parseFloat(match[1]);
  return isNaN(n) ? null : n;
}

// ─── Is a line a range/category specifier rather than a result value? ─────────

function isRangeLine(line: string): boolean {
  return (
    /[≤≥]/.test(line) ||
    /^\s*[<>]\s*\d/.test(line) ||
    /\b(?:optimal|low|high|normal|negative|positive)\b/i.test(line)
  );
}

// ─── Randox / visual-bar format: value lives at END of range line ─────────────
// e.g. "≤41.4  Low  41.5 - 159.0  Optimal  >159.0  High  46.9  pmol/l"
// The actual result (46.9) is the last number before the trailing unit.

const KNOWN_UNITS_RE =
  /(\d+\.?\d*)\s*(nmol\/l|pmol\/l|μmol\/l|mmol\/l|g\/l|g\/dl|u\/l|iu\/l|miu\/l|ng\/ml|pg\/ml|ng\/dl|μg\/l|ng\/l|μg\/dl|pmol\/ml|ng|pg|%|mmol\/mol|fl|pg\/cell|×10[⁹⁶]\/l|10\^9\/l|10\^6\/l)\s*$/i;

function extractRandoxValue(line: string): number | null {
  const m = line.match(KNOWN_UNITS_RE);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return isNaN(n) || n > 100000 ? null : n;
}

// ─── Is a line clinical interpretation rather than an actual result? ──────────
// These lines mention biomarker names alongside advice thresholds (e.g. NHS notes).

function isInterpretationLine(line: string): boolean {
  const l = line.toLowerCase();
  return (
    /\bsuggests?\b/.test(l) ||
    /\bconsistent with\b/.test(l) ||
    /\brisk of\b/.test(l) ||
    /\bfor (?:clinical|diagnosis|more information|interpretation)\b/.test(l) ||
    /\bplease see\b/.test(l) ||
    /\btarget in\b/.test(l) ||
    /\bconfirms? diagnosis\b/.test(l) ||
    /\bwww\.\S+/.test(l) ||
    /\bbe aware\b/.test(l)
  );
}

// ─── Parse biomarkers from extracted text ────────────────────────────────────

export type ParsedBiomarker = {
  code: string;
  value: number;
  rawLine: string;
  confidence: "high" | "medium" | "low";
};

export function parseBiomarkersFromText(text: string): ParsedBiomarker[] {
  const lowerText = text.toLowerCase();
  const results: ParsedBiomarker[] = [];
  const usedCodes = new Set<string>();

  for (const entry of BIOMARKER_SEARCH_INDEX) {
    if (usedCodes.has(entry.code)) continue;

    patternLoop:
    for (const pattern of entry.patterns) {
      // Loop through all occurrences of this pattern in the text.
      // Needed because notWith guards may require skipping some occurrences.
      let searchFrom = 0;

      while (true) {
        const idx = lowerText.indexOf(pattern, searchFrom);
        if (idx === -1) break; // no more occurrences — try the next pattern

        // Locate the matched line boundaries
        const charsBefore = lowerText.substring(0, idx);
        const lineStart = charsBefore.lastIndexOf("\n") + 1;
        const lineEnd = text.indexOf("\n", idx);
        const matchLine = text
          .substring(lineStart, lineEnd === -1 ? undefined : lineEnd)
          .trim();
        const matchLineLower = matchLine.toLowerCase();

        // NHS / HEFT reports append advisory commentary after a semicolon on the
        // SAME line as the actual result, e.g.:
        //   "Serum TSH level 2.3 mu/L [0.4-4.9]; For clinical interpretation..."
        //   "Haemoglobin A1c ... 32 mmol/mol [...]; consistent with diabetes"
        // Guard checks (notWith / isInterpretationLine) must only see the part
        // of the line BEFORE the first ";", otherwise they falsely reject result lines.
        const guardLine = matchLine.includes(";") ? matchLine.split(";")[0] : matchLine;
        const guardLineLower = guardLine.toLowerCase();

        // ── notWith guard: if any disqualifying word is on this line, skip ──
        if (entry.notWith?.some(nw => guardLineLower.includes(nw))) {
          searchFrom = idx + 1;
          continue; // try next occurrence of the same pattern
        }

        // ── Skip clinical interpretation / advice lines ───────────────────────
        // Lines like "HbA1c 42–47 mmol/mol suggests a high risk of future diabetes"
        // are not result lines — they're lab notes embedded in the report.
        if (isInterpretationLine(guardLine)) {
          searchFrom = idx + 1;
          continue; // try next occurrence of the same pattern
        }

        // ── Try same-line extraction first (Thriva tabular format) ───────────
        const afterPattern = matchLine.substring(
          matchLineLower.indexOf(pattern) + pattern.length,
        );
        // Strip any repeated occurrence of the pattern itself from afterPattern
        // (e.g. Voy renders "HbA1c ... HBA1C Normal" — the code "HBA1C" contains "1"
        // which fools extractNumber into returning 1 instead of the real value)
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const afterStripped = afterPattern.replace(new RegExp(escapedPattern, "gi"), " ");
        const cleanedSame = cleanValueText(afterStripped);
        let value = extractNumber(cleanedSame);
        let usedLine = matchLine;

        // Guard: value > 100000 is probably a date/ID artifact
        if (value !== null && value > 100000) value = null;

        // ── If no value on same line, look at the next non-empty line ─────────
        // (Voy visual format, Randox report format)
        if (value === null && lineEnd !== -1) {
          let pos = lineEnd + 1;
          let attempts = 0;

          while (pos < text.length && attempts < 3) {
            const nextEnd = text.indexOf("\n", pos);
            const nextLine = text
              .substring(pos, nextEnd === -1 ? text.length : nextEnd)
              .trim();

            pos = (nextEnd === -1 ? text.length : nextEnd) + 1;
            attempts++;

            if (!nextLine) continue; // skip blank lines

            // Stop if we hit a range/category header — we've gone too far.
            // BUT: Randox visual format puts the result at the END of the range
            // line itself (e.g. "≤41.4 Low 41.5-159.0 Optimal >159.0 High 46.9 pmol/l").
            // Try to salvage that trailing value before giving up.
            if (isRangeLine(nextLine)) {
              const randoxVal = extractRandoxValue(nextLine);
              if (randoxVal !== null) {
                value = randoxVal;
                usedLine = nextLine;
              }
              break;
            }

            // NaN value → marker is suppressed (e.g. LH/FSH on TRT); treat as 0
            if (/^\s*nan\b/i.test(nextLine)) {
              value = 0;
              usedLine = nextLine;
              break;
            }

            const cleanedNext = cleanValueText(nextLine);
            const nextVal = extractNumber(cleanedNext);

            if (nextVal !== null && nextVal < 100000) {
              value = nextVal;
              usedLine = nextLine;
              break;
            }

            // If this non-empty line had no usable number, stop looking further
            // (avoids accidentally picking up range bar numbers on line+2/+3)
            break;
          }
        }

        if (value === null) {
          // This occurrence matched the pattern but yielded no usable number
          // (e.g. header text like "Your testosterone levels are very high").
          // Try the next occurrence of the same pattern rather than giving up.
          searchFrom = idx + 1;
          continue;
        }

        // Convert US/non-SI units to the catalog's stored SI units before saving
        value = normalizeUnits(entry.code, value, usedLine);

        results.push({
          code: entry.code,
          value,
          rawLine: usedLine,
          confidence: pattern.length > 6 ? "high" : "medium",
        });
        usedCodes.add(entry.code);
        break patternLoop; // done with this entry
      }
    }
  }

  return results;
}

// ─── Extract test metadata (date & lab/test name) ────────────────────────────

export type ParsedMeta = {
  testDate?: string;
  testName?: string;
};

const LAB_NAMES: string[] = [
  "monitor my health",
  "blue horizon medicals",
  "blue horizon",
  "quest diagnostics",
  "randox health",
  "randox",
  "medichecks",
  "labcorp",
  "regenerus",
  "genova diagnostics",
  "genova",
  "thriva",
  "lifelabs",
  "monash ivf",
  "sydney path",
  "clinpath",
  "qml pathology",
  "sonic healthcare",
  "mq health",
  "laverty pathology",
  "pathwest",
  "4cyte pathology",
  "labtests",
  "voyager",
  "voy",
];

const PANEL_NAMES: string[] = [
  "complete blood count",
  "full blood count",
  "male hormones results",
  "male hormones",
  "female hormones",
  "complete metabolic panel",
  "basic metabolic panel",
  "comprehensive metabolic",
  "lipid panel",
  "thyroid health",
  "thyroid function test",
  "thyroid function",
  "hormone profile",
  "hormone panel",
  "male hormone",
  "female hormone",
  "well man",
  "well woman",
  "testosterone check",
  "fertility profile",
  "liver function",
  "kidney function",
  "renal function",
];

const DATE_CONTEXT_RES: RegExp[] = [
  /(?:sample|collection|collected|report|test|result|printed|received|requested|ordered|drawn)\s+date\s*:?\s*/i,
  /(?:date of (?:sample|collection|report|test|result))\s*:?\s*/i,
  /(?:date)\s*:?\s*/i,
];

const MONTH_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

function parseDate(str: string): string | null {
  str = str.trim();
  // DD/MM/YYYY or DD-MM-YYYY
  let m = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (m) {
    const d = parseInt(m[1]), mo = parseInt(m[2]), y = parseInt(m[3]);
    if (mo <= 12 && d <= 31 && y >= 1990)
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // YYYY-MM-DD or YYYY/MM/DD
  m = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})/);
  if (m) {
    const y = parseInt(m[1]), mo = parseInt(m[2]), d = parseInt(m[3]);
    if (mo <= 12 && d <= 31 && y >= 1990)
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // DD Month YYYY (e.g. "15 March 2024" or "15 Mar 2024")
  m = str.match(
    /^(\d{1,2})\s+(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s+(\d{4})/i,
  );
  if (m) {
    const d = parseInt(m[1]);
    const mo = MONTH_NAMES.findIndex(mn => m![2].toLowerCase().startsWith(mn)) + 1;
    const y = parseInt(m[3]);
    if (mo > 0 && d <= 31 && y >= 1990)
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // DD-Mon-YYYY (e.g. "22-Apr-2026", "3-Jan-2025") — Randox / RH format
  m = str.match(
    /^(\d{1,2})-(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)-(\d{4})/i,
  );
  if (m) {
    const d = parseInt(m[1]);
    const mo = MONTH_NAMES.findIndex(mn => m![2].toLowerCase().startsWith(mn)) + 1;
    const y = parseInt(m[3]);
    if (mo > 0 && d <= 31 && y >= 1990)
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  // Month DD, YYYY
  m = str.match(
    /^(jan\w*|feb\w*|mar\w*|apr\w*|may|jun\w*|jul\w*|aug\w*|sep\w*|oct\w*|nov\w*|dec\w*)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/i,
  );
  if (m) {
    const mo = MONTH_NAMES.findIndex(mn => m![1].toLowerCase().startsWith(mn)) + 1;
    const d = parseInt(m[2]);
    const y = parseInt(m[3]);
    if (mo > 0 && d <= 31 && y >= 1990)
      return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

export function parseTestMetadata(text: string): ParsedMeta {
  const meta: ParsedMeta = {};
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // ── Lab / panel name from header (first 25 lines) ────────────────────────
  const header = lines.slice(0, 25).join(" ").toLowerCase();
  for (const lab of LAB_NAMES) {
    if (header.includes(lab)) {
      meta.testName = lab.replace(/\b\w/g, c => c.toUpperCase());
      break;
    }
  }
  if (!meta.testName) {
    for (const panel of PANEL_NAMES) {
      if (header.includes(panel)) {
        meta.testName = panel.replace(/\b\w/g, c => c.toUpperCase());
        break;
      }
    }
  }

  // ── Sample / report date: scan all lines for context keywords ─────────────
  for (const line of lines) {
    if (meta.testDate) break;
    for (const ctxRe of DATE_CONTEXT_RES) {
      const ctxMatch = line.match(ctxRe);
      if (!ctxMatch) continue;
      const after = line.substring(ctxMatch.index! + ctxMatch[0].length);
      const parsed = parseDate(after);
      if (parsed) { meta.testDate = parsed; break; }
    }
  }

  // Fallback: first plausible date in first 30 lines (skip DOB lines)
  if (!meta.testDate) {
    const anyDate =
      /(\d{1,2}[/\-]\d{1,2}[/\-]\d{4}|\d{4}[/\-]\d{1,2}[/\-]\d{1,2}|\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{4}|\d{1,2}-(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*-\d{4})/i;
    for (const line of lines.slice(0, 30)) {
      if (/date of birth|dob|d\.o\.b/i.test(line)) continue;
      const m = line.match(anyDate);
      if (!m) continue;
      const parsed = parseDate(m[1]);
      if (parsed) { meta.testDate = parsed; break; }
    }
  }

  return meta;
}

// ─── Main export ─────────────────────────────────────────────────────────────

// ─── Extract text from an image using server-side Gemini vision OCR ──────────

async function extractImageTextViaAI(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(",")[1];
        const mimeType = file.type || "image/png";
        const res = await fetch("/api/blood-tests/extract-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ imageBase64: base64, mimeType }),
        });
        if (!res.ok) throw new Error(`Extract failed: ${res.status}`);
        const data = await (res.json() as Promise<{ text: string }>);
        resolve(data.text ?? "");
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

export async function parsePDFBiomarkers(file: File): Promise<{
  values: Record<string, string>;
  rawText: string;
  parsed: ParsedBiomarker[];
  meta: ParsedMeta;
}> {
  const fn = file.name.toLowerCase();
  const isImage = file.type.startsWith("image/") || /\.(png|jpg|jpeg|webp|gif|bmp)$/i.test(fn);
  const isTxt = fn.endsWith(".txt");
  const isDocx = fn.endsWith(".docx") || fn.endsWith(".doc");

  let rawText: string;
  if (isImage) {
    rawText = await extractImageTextViaAI(file);
  } else if (isTxt) {
    rawText = await file.text();
  } else if (isDocx) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    rawText = result.value;
  } else {
    rawText = await extractPDFText(file);
  }
  const parsed = parseBiomarkersFromText(rawText);
  const meta = parseTestMetadata(rawText);
  const values: Record<string, string> = {};
  for (const p of parsed) {
    values[p.code] = String(p.value);
  }
  return { values, rawText, parsed, meta };
}
