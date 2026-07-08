/**
 * Real-time web search executor for Sage, backed by Gemini's built-in Google
 * Search grounding tool (no separate search API key needed — reuses the
 * already-configured Replit Gemini AI integration).
 *
 * This is a best-effort PRE-FETCH: it runs once, before the Sage/Claude call,
 * and its output is injected into the system prompt as read-only context.
 * It never throws — any failure (missing key, timeout, no grounding triggered)
 * just returns `null` and the chat proceeds without web results.
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

const SEARCH_TIMEOUT_MS = 12_000;
const SEARCH_MODEL = "gemini-2.5-flash";

// Lightweight keyword gate so we only pay the extra network round-trip for
// messages that plausibly benefit from live info (news/research/current
// status). Most blood-test/biomarker questions never hit this and stay fast.
const SEARCH_TRIGGER_RE =
  /\b(latest|recent(ly)?|new(est)?|current(ly)?|up[- ]?to[- ]?date|update[sd]?|news|today|this\s+(week|month|year)|202[4-9]|breaking|announc\w*|research|studies|clinical\s+trial|trial[s]?|published|article|paper|banned?|legal(ity|ize|ization)?|regulat\w*|shortage|availab\w*|price[sd]?|cost\w*|market|industry|brand|supplier|manufactur\w*|recall(ed)?|\bfda\b|\bwho\b|approved?)\b/i;

export function shouldSearchWeb(message: string): boolean {
  return SEARCH_TRIGGER_RE.test(message);
}

/**
 * Runs a Gemini-grounded web search for the given user question and returns a
 * short digest plus the source URLs Gemini actually cited. Returns `null` if
 * the search fails, times out, or Gemini didn't judge a search necessary
 * (grounding is model-decided, so this is a built-in relevance gate).
 */
export async function searchWebForSage(query: string): Promise<WebSearchResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  try {
    console.log(`[web-search] apiKey present: ${!!process.env.AI_INTEGRATIONS_GEMINI_API_KEY}, baseUrl: ${process.env.AI_INTEGRATIONS_GEMINI_BASE_URL}`);
    const response = await gemini.models.generateContent({
      model: SEARCH_MODEL,
      contents: [{ role: "user", parts: [{ text: trimmed }] }],
      config: {
        tools: [{ google_search: {} }],
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 1024,
        systemInstruction:
          "Answer the user's question using current web search results. Be concise (3-6 sentences), factual, and cite specific figures/dates when available. If the question isn't the kind of thing that benefits from a live web search (e.g. it's about the user's personal data), just answer briefly from general knowledge.",
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
      if (sources.length >= 5) break;
    }

    // No grounding metadata at all means Gemini answered from its own
    // knowledge rather than actually searching — still useful context, but
    // we only surface it as "live web search" when grounding actually fired.
    if (sources.length === 0 && !grounding) return null;

    return { digest, sources, queries: grounding?.webSearchQueries ?? [] };
  } catch (err) {
    console.warn("[web-search] Gemini grounding call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
