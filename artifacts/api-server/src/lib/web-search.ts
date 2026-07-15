/**
 * Real-time web search and study fetch for Sage.
 *
 * Two sources run in parallel:
 *  1. Gemini grounded search (google_search tool) — live web results with
 *     grounding metadata. Reuses the already-configured Gemini integration.
 *  2. PubMed / NCBI E-utilities — free, no API key required; fetches real
 *     clinical abstracts for the query.
 *
 * Both are best-effort: any failure is silent and Sage proceeds without
 * that context.
 */

import { GoogleGenAI } from "./google-genai";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export interface WebSearchSource {
  title: string;
  url: string;
}

export interface WebSearchResult {
  digest: string;
  sources: WebSearchSource[];
  queries: string[];
}

const SEARCH_TIMEOUT_MS = 14_000;
const SEARCH_MODEL = "gemini-2.5-flash";

/**
 * Formerly a keyword gate — now always returns true.
 * All Sage questions are health-related so a web search is always relevant.
 * The Gemini model itself decides whether to actually ground a search.
 */
export function shouldSearchWeb(_message: string): boolean {
  return true;
}

/**
 * Runs a Gemini-grounded web search for the given user question and returns a
 * detailed digest plus the source URLs Gemini actually cited.
 * Returns `null` if the search fails, times out, or Gemini didn't judge a
 * search necessary (grounding is model-decided).
 */
export async function searchWebForSage(query: string): Promise<WebSearchResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    const response = await gemini.models.generateContent({
      model: SEARCH_MODEL,
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      config: {
        tools: [{ google_search: {} }],
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2048,
        systemInstruction:
          "You are a health research assistant. Search the web for current, evidence-based information about the user's health question. " +
          "Prioritise: clinical studies, systematic reviews, meta-analyses, PubMed/NCBI results, and reputable medical sources. " +
          "When you find studies or trials, include: the study name or title, key findings with specific numbers/statistics, the population studied, and the year. " +
          "Also include relevant forum consensus from specialist communities (r/trt, r/peptides, ExcelMale, ThyroidUK, etc.) when it adds practical context. " +
          "Be thorough — up to 8-10 sentences. If the question doesn't benefit from a live search (e.g. purely personal interpretation), answer briefly from general knowledge.",
      },
      timeoutMs: SEARCH_TIMEOUT_MS,
    });

    const digest = (response.text ?? "").trim();
    if (!digest) return null;

    const grounding = response.groundingMetadata;
    const chunks = grounding?.groundingChunks ?? [];
    const seen = new Set<string>();
    const sources: WebSearchSource[] = [];
    for (const chunk of chunks) {
      const url = chunk.web?.uri;
      const title = chunk.web?.title;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      sources.push({ title: title || url, url });
      if (sources.length >= 6) break;
    }

    if (sources.length === 0 && !grounding) return null;

    return { digest, sources, queries: grounding?.webSearchQueries ?? [] };
  } catch (err) {
    console.warn("[web-search] Gemini grounding call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// ─── PubMed / NCBI E-utilities ────────────────────────────────────────────────

const PUBMED_TIMEOUT_MS = 8_000;
const NCBI_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_TOOL = "saltpeps-sage";
const NCBI_EMAIL = "sage@saltpeps.com";

export interface PubMedStudy {
  pmid: string;
  title: string;
  abstract: string;
  url: string;
}

export interface PubMedResult {
  studies: PubMedStudy[];
  query: string;
}

/**
 * Searches PubMed for clinical studies relevant to the query using NCBI
 * E-utilities (free, no API key required). Returns up to 4 studies with
 * their full abstracts. Returns null on any failure.
 */
export async function searchPubMed(query: string): Promise<PubMedResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PUBMED_TIMEOUT_MS);

  try {
    const searchTerm = buildPubMedQuery(trimmed);

    const searchUrl = `${NCBI_BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(searchTerm)}&retmax=4&retmode=json&sort=relevance&tool=${NCBI_TOOL}&email=${NCBI_EMAIL}`;
    const searchResp = await fetch(searchUrl, { signal: controller.signal });
    if (!searchResp.ok) return null;

    const searchData = await searchResp.json() as { esearchresult?: { idlist?: string[] } };
    const pmids = searchData?.esearchresult?.idlist ?? [];
    if (pmids.length === 0) return null;

    const fetchUrl = `${NCBI_BASE}/efetch.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=xml&rettype=abstract&tool=${NCBI_TOOL}&email=${NCBI_EMAIL}`;
    const fetchResp = await fetch(fetchUrl, { signal: controller.signal });
    if (!fetchResp.ok) return null;

    const xml = await fetchResp.text();
    const studies = parsePubMedXml(xml);
    if (studies.length === 0) return null;

    return { studies, query: searchTerm };
  } catch (err) {
    if ((err as Error)?.name !== "AbortError") {
      console.warn("[pubmed] Fetch failed:", err instanceof Error ? err.message : err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Build a PubMed query from the user's natural language question.
 * Strips filler words, keeps health/compound terms, adds context filters.
 */
function buildPubMedQuery(message: string): string {
  const lower = message.toLowerCase();

  const terms: string[] = [];

  const compoundPatterns = [
    /\bbpc.?157\b/i, /\btb.?500\b/i, /\bghk.?cu\b/i, /\biatp\b/i,
    /\bsemaglutide\b/i, /\btirzepatide\b/i, /\bosemaglutide\b/i, /\bliraglutide\b/i,
    /\bepitalon\b/i, /\bselank\b/i, /\bsemax\b/i, /\bll.?37\b/i,
    /\bsermorelin\b/i, /\bipamorelin\b/i, /\bghrp\b/i, /\bcjc.?1295\b/i,
    /\bthymosin\b/i, /\bmelanotan\b/i, /\bmt.?2\b/i,
    /\btestosterone\b/i, /\bestradiol\b/i, /\bprogesterone\b/i,
    /\banastrozole\b/i, /\bexemestane\b/i, /\bclomiphene\b/i,
    /\bmetformin\b/i, /\bberberine\b/i,
  ];

  for (const pat of compoundPatterns) {
    const m = message.match(pat);
    if (m) terms.push(m[0].replace(/[.\-]/g, " ").trim());
  }

  const biomarkerPatterns = [
    /\b(testosterone|estradiol|lh|fsh|shbg|prolactin|progesterone|dhea|cortisol)\b/i,
    /\b(tsh|free t[34]|ft3|ft4|reverse t3|tpo|thyroid)\b/i,
    /\b(hba1c|fasting (glucose|insulin)|homa.?ir|insulin resistance)\b/i,
    /\b(igf.?1|growth hormone|gh)\b/i,
    /\b(crp|il.?6|tnf|inflammation|inflammatory)\b/i,
    /\b(ferritin|iron|haemoglobin|hemoglobin|haematocrit|hematocrit|rbc)\b/i,
    /\b(ldl|hdl|cholesterol|triglyceride|apob|lipid)\b/i,
    /\b(alt|ast|ggt|bilirubin|liver (enzyme|function))\b/i,
    /\b(creatinine|egfr|kidney|renal|uric acid)\b/i,
    /\b(vitamin d|vit d|25-oh|25oh)\b/i,
    /\b(b12|folate|homocysteine)\b/i,
  ];

  for (const pat of biomarkerPatterns) {
    const m = message.match(pat);
    if (m && !terms.some(t => t.toLowerCase().includes(m[0].toLowerCase()))) {
      terms.push(m[0]);
    }
  }

  const topicPatterns = [
    /\b(long covid|post.?covid|pasc)\b/i,
    /\b(pcos|polycystic)\b/i,
    /\b(hashimoto|graves|hypothyroid|hyperthyroid)\b/i,
    /\b(trt|testosterone replacement|hrt|hormone replacement)\b/i,
    /\b(pct|post cycle)\b/i,
    /\b(sleep|insomnia|circadian)\b/i,
    /\b(gut|microbiome|ibs|crohn|leaky gut)\b/i,
    /\b(mitochondria|mitochondrial)\b/i,
    /\b(cardiovascular|heart|cardiac)\b/i,
    /\b(autoimmune)\b/i,
    /\b(brain fog|cognitive|nootropic)\b/i,
    /\b(weight loss|obesity|metabolic)\b/i,
    /\b(fatigue|energy|pem|post.exertional)\b/i,
    /\b(muscle|hypertrophy|strength|anabolic)\b/i,
    /\b(hair loss|alopecia)\b/i,
  ];

  for (const pat of topicPatterns) {
    const m = message.match(pat);
    if (m && !terms.some(t => t.toLowerCase().includes(m[0].toLowerCase()))) {
      terms.push(m[0]);
    }
  }

  if (terms.length === 0) {
    const words = lower
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 4 && !STOPWORDS.has(w))
      .slice(0, 4);
    terms.push(...words);
  }

  const baseQuery = terms.slice(0, 4).join(" AND ");
  return `${baseQuery} AND ("humans"[MeSH] OR clinical[sb])`;
}

const STOPWORDS = new Set([
  "would", "could", "should", "about", "there", "their", "where", "which",
  "these", "those", "other", "after", "while", "being", "doing", "having",
  "since", "until", "under", "above", "below", "between", "through",
  "during", "before", "after", "always", "never", "often", "sometimes",
  "maybe", "really", "might", "right", "wrong", "because", "please",
  "thank", "thanks", "hello", "what", "when", "does", "have", "with",
]);

/** Very lightweight XML extraction — PubMed's efetch XML is well-structured. */
function parsePubMedXml(xml: string): PubMedStudy[] {
  const studies: PubMedStudy[] = [];

  const articleRe = /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let articleMatch: RegExpExecArray | null;

  while ((articleMatch = articleRe.exec(xml)) !== null) {
    const chunk = articleMatch[1];

    const pmidMatch = chunk.match(/<PMID Version="1">(\d+)<\/PMID>/);
    const pmid = pmidMatch?.[1] ?? "";
    if (!pmid) continue;

    const titleMatch = chunk.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/);
    const title = titleMatch ? stripXml(titleMatch[1]) : "";
    if (!title) continue;

    const abstractParts: string[] = [];
    const abstractRe = /<AbstractText(?:[^>]*)>([\s\S]*?)<\/AbstractText>/g;
    let absMatch: RegExpExecArray | null;
    while ((absMatch = abstractRe.exec(chunk)) !== null) {
      const labelMatch = absMatch[0].match(/Label="([^"]+)"/);
      const text = stripXml(absMatch[1]).trim();
      if (text) {
        abstractParts.push(labelMatch ? `${labelMatch[1]}: ${text}` : text);
      }
    }
    const abstract = abstractParts.join(" ").trim();
    if (!abstract) continue;

    studies.push({
      pmid,
      title,
      abstract: abstract.length > 800 ? abstract.slice(0, 797) + "…" : abstract,
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });

    if (studies.length >= 4) break;
  }

  return studies;
}

function stripXml(s: string): string {
  return s.replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
}

/**
 * Fetches the text content of a URL (best-effort, browser-like headers).
 * Returns the first ~3000 chars of meaningful text content, or null on failure.
 */
export async function fetchUrlContent(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6_000);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-GB,en;q=0.9",
      },
    });
    if (!resp.ok || !resp.headers.get("content-type")?.includes("text")) return null;
    const html = await resp.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.slice(0, 3000) || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
