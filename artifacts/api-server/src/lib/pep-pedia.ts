/**
 * Pep-Pedia.org context fetcher for Sage.
 *
 * Extracts peptide/compound terms from the user's message, searches
 * pep-pedia.org, fetches the first matching article, and returns a trimmed
 * excerpt to inject as reference context before the Sage AI call.
 *
 * Best-effort — any failure returns null and Sage answers without it.
 */

const BASE = "https://pep-pedia.org";
const TIMEOUT_MS = 8_000;
const MAX_CONTENT_CHARS = 1_800;

// Matches common peptide/compound identifiers:
// BPC-157, TB-500, GHK-Cu, CJC-1295, AOD-9604, Semaglutide, Tirzepatide, etc.
const COMPOUND_RE =
  /\b(?:[A-Z]{2,}[-–]\d+\w*|GLP[-\s]?\d|[A-Z]{2,3}\d{3,}|Semaglutide|Tirzepatide|Ipamorelin|Tesamorelin|Sermorelin|Oxytocin|Selank|Semax|Dihexa|Epithalon|Melanotan|Thymalin|Thymosin|Follistatin|Retatrutide|Cagrilintide)\b/gi;

function extractTerms(message: string): string[] {
  const matches = [...message.matchAll(COMPOUND_RE)].map(m => m[0].trim());
  const unique = [...new Set(matches.map(t => t.toLowerCase()))];
  if (unique.length > 0) return unique.slice(0, 2);
  // Fallback: grab the first 3 meaningful words
  const words = message.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
  return words.length > 0 ? [words.join(" ")] : [];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<(nav|header|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#\d+;/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": "SageHealthBot/1.0 (+https://saltandpeps.com)" },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function extractFirstArticleUrl(html: string): string | null {
  // Standard WordPress search results use <article> or <h2 class="entry-title"><a href="...">
  const patterns = [
    /<article[^>]*>[\s\S]*?<a\s[^>]*href="(https?:\/\/pep-pedia\.org\/[^"]+)"[^>]*>/i,
    /<h\d[^>]*class="[^"]*(?:entry-title|post-title)[^"]*"[^>]*>\s*<a[^>]*href="([^"]+)"/i,
    /<a[^>]*href="(https?:\/\/pep-pedia\.org\/(?!.*(?:wp-|page|tag|category|author))[^"#?]+)"[^>]*class="[^"]*(?:entry|post|article)[^"]*"/i,
    // Fallback: any pep-pedia.org link that looks like a post slug
    /href="(https?:\/\/pep-pedia\.org\/[a-z0-9-]{4,}\/?)"/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1];
  }
  return null;
}

function extractMainContent(html: string): string {
  // Try to pull the <article> or <div class="entry-content"> block first
  const articleMatch =
    html.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
    html.match(/<div[^>]*class="[^"]*(?:entry-content|post-content|article-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);

  const source = articleMatch ? articleMatch[1] : html;
  const text = stripHtml(source);
  return text.length > 50 ? text.slice(0, MAX_CONTENT_CHARS) : "";
}

export async function fetchPepPediaContext(message: string): Promise<{ content: string; url: string } | null> {
  const terms = extractTerms(message);
  if (terms.length === 0) return null;

  const query = terms[0];

  // 1. Try direct slug first (fastest path, e.g. /bpc-157/)
  const slug = query.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const directUrl = `${BASE}/${slug}/`;
  let html = await fetchText(directUrl);

  // 2. Fall back to search
  if (!html || html.includes("page-not-found") || html.includes("404")) {
    const searchUrl = `${BASE}/?s=${encodeURIComponent(query)}`;
    const searchHtml = await fetchText(searchUrl);
    if (!searchHtml) return null;

    const articleUrl = extractFirstArticleUrl(searchHtml);
    if (!articleUrl) return null;

    html = await fetchText(articleUrl);
    if (!html) return null;

    const content = extractMainContent(html);
    if (!content) return null;
    return { content, url: articleUrl };
  }

  const content = extractMainContent(html);
  if (!content) return null;
  return { content, url: directUrl };
}
