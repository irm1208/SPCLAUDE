import { GoogleGenAI } from "./google-genai";

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

const IMAGE_CACHE = new Map<string, { urls: string[]; ts: number }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

// ── Domain allowlists ─────────────────────────────────────────────────────────

const JANOSHIK_BASE_DOMAINS = ["janoshik.com"];

const ALL_LAB_BASE_DOMAINS = [
  "janoshik.com",
  "uzorak.com",
  "peptidetest.com",
  "testides.com",
  "testides.org",
  "chromate.pl",
  "chromate.com",
  "analizabialek.pl",
  "analiza-bialek.pl",
  "analizabialek.com",
];

// Suffix-based domain match: host equals domain OR is a subdomain (dot-boundary)
function matchesDomain(host: string, baseDomains: string[]): boolean {
  return baseDomains.some(d => host === d || host.endsWith("." + d));
}

function isJanoshikAllowedUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return matchesDomain(u.hostname.toLowerCase(), JANOSHIK_BASE_DOMAINS);
  } catch { return false; }
}

const isAllowedUrl = isJanoshikAllowedUrl;

export function isBulkImportAllowedUrl(rawUrl: string): boolean {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return matchesDomain(u.hostname.toLowerCase(), ALL_LAB_BASE_DOMAINS);
  } catch { return false; }
}

export { isBulkImportAllowedUrl as isAdminBulkImportUrl };

// ── URL type detection ────────────────────────────────────────────────────────

export type LabUrlType = "pdf" | "image" | "website";

export function resolveCanonicalLabUrl(rawUrl: string): string {
  return rawUrl;
}

// ── Generic file download constants (declared early for Uzorak helper use) ───

const DOWNLOAD_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
};

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB hard cap

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ── Uzorak: Supabase API extraction ──────────────────────────────────────────
// Uzorak uses SPA hash routing (#/verify/PUBLICID_xxx.pdf) and their server
// 302-redirects /verify/X.pdf back to /#/verify/X.pdf, making direct download
// impossible. We instead look up the order via their public Supabase API,
// which stores a JPEG snapshot (snapshot_base64) and/or a Google Drive PDF URL.
//
// The anon/publishable key is extracted from Uzorak's own public JS bundle and
// is safe to include here — it is intentionally public (client-side key).

const UZORAK_SUPABASE_URL = "https://ipiswrksmjksygmntamq.supabase.co";
const UZORAK_ANON_KEY = "sb_publishable_geUkJhKKnav3sx79V-aVhQ_d_8OnWg4";

/**
 * Download a file from any URL, bypassing the domain allowlist.
 * Only call from trusted internal code paths (e.g. URLs returned by the
 * Uzorak Supabase lookup — not from user-supplied input).
 */
async function downloadTrustedFile(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Convert Google Drive view/share URL to a direct download URL
    let downloadUrl = url;
    const driveFileId = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1]
      ?? url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
    if (driveFileId) {
      downloadUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`;
    }

    const res = await fetch(downloadUrl, {
      headers: DOWNLOAD_HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    let mimeType = contentType.split(";")[0].trim().toLowerCase();

    if (mimeType === "application/octet-stream") {
      if (downloadUrl.toLowerCase().endsWith(".pdf")) mimeType = "application/pdf";
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      console.warn("[gemini-lab-extract] downloadTrustedFile unexpected MIME:", mimeType, url);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_FILE_BYTES) return null;

    return { data: buf.toString("base64"), mimeType };
  } catch {
    return null;
  }
}

/** Fetch the raw Uzorak order object from Supabase. */
async function fetchUzorakOrder(publicId: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`${UZORAK_SUPABASE_URL}/rest/v1/rpc/get_public_order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": UZORAK_ANON_KEY,
        "Authorization": `Bearer ${UZORAK_ANON_KEY}`,
      },
      body: JSON.stringify({ p_public_id: publicId }),
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      console.warn("[gemini-lab-extract] Uzorak Supabase RPC failed:", res.status);
      return null;
    }
    const order = await res.json() as Record<string, unknown> | null;
    return order ?? null;
  } catch (err) {
    console.warn("[gemini-lab-extract] Uzorak Supabase lookup error:", err);
    return null;
  }
}

/**
 * Given an already-fetched Uzorak order, try to return a downloadable file
 * (snapshot JPEG or Google Drive PDF) for Gemini.
 * Returns null when no file is available (e.g. snapshot_base64 is null and
 * no report_url exists — common when the LCMS cert is rendered client-side).
 */
async function resolveUzorakFile(
  order: Record<string, unknown>
): Promise<{ data: string; mimeType: string } | null> {
  const stripDataUri = (s: string) => s.replace(/^data:image\/[a-z]+;base64,/i, "");
  const items = (order.order_items ?? order.orderItems) as unknown[] ?? [];

  // Top-level snapshot_base64
  const topSnap = (order.snapshot_base64 ?? order.snapshotBase64) as string | undefined;
  if (topSnap) return { data: stripDataUri(topSnap), mimeType: "image/jpeg" };

  // Per-item snapshot_base64
  for (const item of items) {
    if (typeof item !== "object" || !item) continue;
    const rec = item as Record<string, unknown>;
    const snap = (rec.snapshot_base64 ?? rec.snapshotBase64) as string | undefined;
    if (snap) return { data: stripDataUri(snap), mimeType: "image/jpeg" };
  }

  // Top-level report_url (Google Drive)
  const reportUrl = (order.report_url ?? order.reportUrl) as string | undefined;
  if (reportUrl) {
    const file = await downloadTrustedFile(reportUrl);
    if (file) return file;
  }

  // Per-item report_url
  for (const item of items) {
    if (typeof item !== "object" || !item) continue;
    const rec = item as Record<string, unknown>;
    const itemUrl = (rec.report_url ?? rec.reportUrl) as string | undefined;
    if (itemUrl) {
      const file = await downloadTrustedFile(itemUrl);
      if (file) return file;
    }
  }

  return null;
}

/**
 * Parse a Uzorak Supabase order directly into ExtractedCoAData without Gemini.
 * Used as a fallback when no image/PDF is available (common: LCMS certs are
 * generated client-side from structured data not exposed by the public API).
 * Sets confidence:"medium" since actual measured values (purity %, HPLC mass)
 * are not available from the public endpoint.
 */
function parseUzorakOrder(
  order: Record<string, unknown>,
  publicId: string
): ExtractedCoAData | null {
  // Prefer samples on the matched item; fall back to top-level samples array
  const samples = (order.samples ?? []) as Record<string, unknown>[];
  const firstSample = samples[0];
  if (!firstSample) {
    console.warn("[gemini-lab-extract] Uzorak: no samples in order for", publicId);
    return null;
  }

  const peptideName = (firstSample.peptideName ?? firstSample.peptide_name) as string | undefined;
  if (!peptideName) return null;

  const batch = (firstSample.batch) as string | undefined;
  const expectedAmount = (firstSample.expectedAmount ?? firstSample.expected_amount) as string | undefined;
  const isBlend = (firstSample.isBlend ?? firstSample.is_blend) as boolean | undefined;

  // Parse nominal mass from "50mg" / "100mg" etc.
  const mgAmountMatch = expectedAmount?.match(/^([\d.]+)\s*mg/i);
  const mgAmount = mgAmountMatch ? parseFloat(mgAmountMatch[1]) : null;

  // Test date from completedAt
  const completedAt = (order.completedAt ?? order.completed_at) as string | undefined;
  const testDate = completedAt ? completedAt.slice(0, 10) : null;

  // Map testName → testType
  const testName = ((order.testName ?? order.test_name) as string | undefined)?.toLowerCase() ?? "";
  let testType: string | null = null;
  if (testName.includes("mass") && testName.includes("purity")) testType = "mass_purity";
  else if (testName.includes("mass")) testType = "mass";
  else if (testName.includes("endotoxin")) testType = "endotoxin";
  else if (testName.includes("lcms")) testType = "lcms";
  else if (testName.includes("sterility")) testType = "sterility";

  // Blend components
  let blendComponents: ExtractedCoAData["blendComponents"] = null;
  if (isBlend) {
    const rawBlend = (firstSample.blendComponents ?? firstSample.blend_components) as unknown[] | null;
    if (Array.isArray(rawBlend) && rawBlend.length > 0) {
      blendComponents = rawBlend.flatMap(bc => {
        if (typeof bc !== "object" || !bc) return [];
        const b = bc as Record<string, unknown>;
        const name = b.name as string | undefined;
        const mgStr = (b.mg ?? b.amount) as string | number | undefined;
        if (!name) return [];
        const mg = typeof mgStr === "number" ? mgStr : parseFloat(String(mgStr ?? "0")) || 0;
        return [{ name, mg }];
      });
      if (blendComponents.length === 0) blendComponents = null;
    }
  }

  const rawText = `Uzorak ${publicId}: ${peptideName}${expectedAmount ? " " + expectedAmount : ""}${batch ? ", batch " + batch : ""}${testDate ? ", completed " + testDate : ""}`;

  return {
    purityPct: null,
    mgAmount,
    massUnit: "mg",
    endotoxinEuMg: null,
    sterilityPass: null,
    heavyMetalAs: null,
    heavyMetalCd: null,
    heavyMetalPb: null,
    heavyMetalHg: null,
    batchCode: batch ?? null,
    testDate,
    testType,
    productCategory: "peptide",
    compoundName: peptideName,
    confidence: "medium",
    rawText: rawText.slice(0, 200),
    blendComponents,
  };
}

/**
 * Full Uzorak extraction pipeline:
 *  1. Fetch order from Supabase.
 *  2. If a snapshot or Drive PDF is available → send to Gemini.
 *  3. Otherwise → parse structured metadata directly (no Gemini, confidence:"medium").
 */
async function extractUzorakCoAData(publicId: string): Promise<ExtractedCoAData | null> {
  const order = await fetchUzorakOrder(publicId);
  if (!order) return null;

  // Attempt Gemini extraction if a file is available
  const file = await resolveUzorakFile(order);
  if (file) {
    console.log("[gemini-lab-extract] Uzorak: running Gemini on file for", publicId);
    const geminiResult = await runGeminiExtraction([{ inlineData: { mimeType: file.mimeType, data: file.data } }]);
    if (geminiResult) return geminiResult;
    console.warn("[gemini-lab-extract] Uzorak: Gemini failed, falling back to metadata for", publicId);
  } else {
    console.log("[gemini-lab-extract] Uzorak: no file available, parsing metadata for", publicId);
  }

  // Fallback: parse structured metadata directly
  return parseUzorakOrder(order, publicId);
}

export function detectLabUrlType(rawUrl: string): LabUrlType {
  try {
    const u = new URL(rawUrl);
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".pdf")) return "pdf";
    if (/\.(png|jpe?g|webp|gif)$/.test(path)) return "image";
    return "website";
  } catch { return "website"; }
}

// ── Generic file downloader ───────────────────────────────────────────────────

export async function downloadLabFile(url: string): Promise<{ data: string; mimeType: string; bytes: Buffer } | null> {
  // Allow Janoshik via existing strict allow, others via full allowlist
  const allowed = isAllowedUrl(url) || isBulkImportAllowedUrl(url);
  if (!allowed) {
    console.warn("[gemini-lab-extract] Blocked non-allowlisted URL:", url);
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: DOWNLOAD_HEADERS,
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;

    // Reject oversized responses early using Content-Length header
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_FILE_BYTES) {
      console.warn("[gemini-lab-extract] File too large (Content-Length):", contentLength, url);
      return null;
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    let mimeType = contentType.split(";")[0].trim().toLowerCase();

    // Only override ambiguous octet-stream responses using the URL extension.
    // Never override an explicit server MIME type (e.g. text/html → pdf would
    // silently send HTML to Gemini as if it were a PDF document).
    if (mimeType === "application/octet-stream") {
      if (url.toLowerCase().endsWith(".pdf")) mimeType = "application/pdf";
      if (/\.(png)$/i.test(url)) mimeType = "image/png";
      if (/\.(jpe?g)$/i.test(url)) mimeType = "image/jpeg";
      if (/\.(webp)$/i.test(url)) mimeType = "image/webp";
    }

    // Reject unexpected MIME types
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      console.warn("[gemini-lab-extract] Unexpected MIME type:", mimeType, url);
      return null;
    }

    const buf = Buffer.from(await res.arrayBuffer());

    // Final size check after download (guards against missing Content-Length)
    if (buf.length > MAX_FILE_BYTES) {
      console.warn("[gemini-lab-extract] File too large after download:", buf.length, url);
      return null;
    }

    const data = buf.toString("base64");
    return { data, mimeType, bytes: buf };
  } catch {
    return null;
  }
}

// ── Janoshik-specific image scraper ──────────────────────────────────────────

export async function fetchJanoshikImages(pageUrl: string): Promise<string[]> {
  if (!isAllowedUrl(pageUrl)) return [];
  const cached = IMAGE_CACHE.get(pageUrl);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.urls;

  // NOTE: verify.janoshik.com is behind Cloudflare Bot Management which blocks
  // server-side fetch (returns 403 challenge page). Image endpoints also require
  // authentication. If the page fetch fails or returns non-OK, return [] so the
  // caller falls through to type:"link" — a clean "Open Report" button is better
  // than a broken image from a guessed URL.
  try {
    const res = await fetch(pageUrl, {
      headers: DOWNLOAD_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      IMAGE_CACHE.set(pageUrl, { urls: [], ts: Date.now() });
      return [];
    }

    const finalUrl = res.url || pageUrl;
    const html = await res.text();
    const imageUrls = new Set<string>();

    const relPattern = /(?:src|href)=["']?((?:\.\/)?img\/[a-f0-9]+\.(?:jpg|jpeg|png|gif|webp))["']?/gi;
    for (const m of html.matchAll(relPattern)) {
      const rel = m[1].replace(/^\.\//, "");
      const base = finalUrl.replace(/\/[^/]*$/, "/");
      imageUrls.add(base + rel);
    }

    const fullPattern = /((?:https?:)?\/\/(?:jas|verify|www)?\.?janoshik\.com\/[^\s'">,\)\\]+|(?:jas|verify|www)?\.?janoshik\.com\/[^\s'">,\)\\]+)/gi;
    for (const m of html.matchAll(fullPattern)) {
      let url = m[1].replace(/['">\\\s,\)]+$/, "");
      if (url.startsWith("//")) url = "https:" + url;
      else if (!url.startsWith("http")) url = "https://" + url;
      if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)) imageUrls.add(url);
    }

    // Also check og:image / twitter:image meta tags (present even in SPA shells)
    const ogPattern = /<meta[^>]+(?:property=["']og:image["']|name=["']twitter:image["'])[^>]+content=["']([^"']+)["']/gi;
    const ogPattern2 = /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property=["']og:image["']|name=["']twitter:image["'])/gi;
    for (const pat of [ogPattern, ogPattern2]) {
      for (const m of html.matchAll(pat)) {
        let src = m[1].trim();
        if (src.startsWith("//")) src = "https:" + src;
        if (isBulkImportAllowedUrl(src) && /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(src)) {
          imageUrls.add(src);
        }
      }
    }

    // Prioritise /tests/img/ PNGs — these are the full portrait certificate (1600×2360).
    // jas.janoshik.com/images/ JPEGs are square 1000×1000 thumbnails, not the full report.
    const jasImages = [...imageUrls].filter(u => /jas\.janoshik\.com\/images\//i.test(u));
    const testImgPngs = [...imageUrls].filter(u => /janoshik\.com\/tests\/img\//i.test(u));
    const final = [...new Set([...testImgPngs, ...jasImages])];
    IMAGE_CACHE.set(pageUrl, { urls: final, ts: Date.now() });
    return final;
  } catch {
    IMAGE_CACHE.set(pageUrl, { urls: [], ts: Date.now() });
    return [];
  }
}

// ── Uzorak preview helpers ────────────────────────────────────────────────────

export function isUzorakUrl(rawUrl: string): boolean {
  try { return matchesDomain(new URL(rawUrl).hostname.toLowerCase(), ["uzorak.com"]); }
  catch { return false; }
}

function extractUzorakPublicId(pageUrl: string): string | null {
  try {
    const rawU = new URL(pageUrl);
    const hashPath = rawU.hash.length > 1 ? rawU.hash.slice(1) : rawU.pathname;
    const filename = hashPath.split("/").filter(Boolean).pop() ?? "";
    const publicId = filename.replace(/\.pdf$/i, "").split("_")[0].trim();
    return publicId || null;
  } catch { return null; }
}

/**
 * Determine what type of embeddable preview Uzorak can provide for a URL.
 * Uses the Supabase public API (same as data extraction) so no direct fetch.
 *
 * Returns:
 *  "image"  — snapshot_base64 JPEG available (proxy serves it)
 *  "pdf"    — Google Drive PDF available (proxy serves it)
 *  "iframe" — no static file; Uzorak sets no X-Frame-Options so the verify
 *             page can be embedded directly in an iframe in the browser
 */
export async function resolveUzorakPreviewType(pageUrl: string): Promise<"image" | "pdf" | "iframe"> {
  const publicId = extractUzorakPublicId(pageUrl);
  if (!publicId) return "iframe";
  const order = await fetchUzorakOrder(publicId);
  if (!order) return "iframe";

  const items = (order.order_items ?? order.orderItems) as unknown[] ?? [];

  const topSnap = (order.snapshot_base64 ?? order.snapshotBase64) as string | undefined;
  if (topSnap) return "image";
  for (const item of items) {
    if (typeof item !== "object" || !item) continue;
    const snap = ((item as Record<string, unknown>).snapshot_base64 ?? (item as Record<string, unknown>).snapshotBase64) as string | undefined;
    if (snap) return "image";
  }

  const topUrl = (order.report_url ?? order.reportUrl) as string | undefined;
  if (topUrl) return "pdf";
  for (const item of items) {
    if (typeof item !== "object" || !item) continue;
    const u = ((item as Record<string, unknown>).report_url ?? (item as Record<string, unknown>).reportUrl) as string | undefined;
    if (u) return "pdf";
  }

  // Uzorak HPLC-UV / LCMS certs are rendered client-side from structured data
  // not exposed by the public API — no static file to proxy. However, Uzorak
  // sets no X-Frame-Options, so we can iframe the verify URL directly.
  return "iframe";
}

/**
 * Fetch Uzorak preview bytes via Supabase (bypasses their SPA redirect).
 * Returns the snapshot JPEG or Google Drive PDF as a Buffer.
 */
export async function resolveUzorakPreviewBytes(pageUrl: string): Promise<{ bytes: Buffer; mimeType: string } | null> {
  const publicId = extractUzorakPublicId(pageUrl);
  if (!publicId) return null;
  const order = await fetchUzorakOrder(publicId);
  if (!order) return null;
  const file = await resolveUzorakFile(order);
  if (!file) return null;
  return { bytes: Buffer.from(file.data, "base64"), mimeType: file.mimeType };
}

// ── Generic website image scraper ─────────────────────────────────────────────

async function fetchWebsiteImages(pageUrl: string): Promise<string[]> {
  try {
    const res = await fetch(pageUrl, {
      headers: DOWNLOAD_HEADERS,
      redirect: "follow",
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const finalUrl = res.url || pageUrl;
    const pageOrigin = new URL(finalUrl).origin;
    const html = await res.text();
    const found = new Set<string>();

    const pattern = /(?:src|href)=["']([^"']+)["']/gi;
    for (const m of html.matchAll(pattern)) {
      let src = m[1].trim();
      if (src.startsWith("//")) src = "https:" + src;
      else if (src.startsWith("/")) src = pageOrigin + src;
      else if (!src.startsWith("http")) continue;
      if (/\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(src)) {
        if (isBulkImportAllowedUrl(src)) found.add(src);
      }
    }
    return [...found].slice(0, 5);
  } catch {
    return [];
  }
}

// ── Universal preview info resolver ──────────────────────────────────────────
//
// Returns structured info the frontend uses to render a report preview.
// - type "image": array of image URLs (server will proxy them)
// - type "pdf": the PDF URL (server will proxy it)
// - type "link": no embeddable preview, just a link to the original URL

export type PreviewInfo =
  | { type: "image"; images: string[] }
  | { type: "pdf"; url: string }
  | { type: "link"; url: string };

export async function resolvePreviewInfo(pageUrl: string, labName?: string): Promise<PreviewInfo> {
  pageUrl = resolveCanonicalLabUrl(pageUrl);
  const urlType = detectLabUrlType(pageUrl);

  if (urlType === "pdf") {
    return { type: "pdf", url: pageUrl };
  }

  if (urlType === "image") {
    return { type: "image", images: [pageUrl] };
  }

  // Website — try lab-specific scrapers
  if (isAllowedUrl(pageUrl)) {
    const imgs = await fetchJanoshikImages(pageUrl);
    if (imgs.length > 0) return { type: "image", images: imgs };
  }

  const imgs = await fetchWebsiteImages(pageUrl);
  if (imgs.length > 0) return { type: "image", images: imgs };

  return { type: "link", url: pageUrl };
}

// ── Backward-compat helper (used by existing per-record extract) ──────────────
export async function fetchLabPageImages(pageUrl: string): Promise<string[]> {
  const info = await resolvePreviewInfo(pageUrl);
  if (info.type === "image") return info.images;
  return [];
}

// ── Gemini extraction — universal (all labs, all URL types) ──────────────────

export async function extractCoADataFromAnyUrl(pageUrl: string): Promise<ExtractedCoAData | null> {
  // ── Uzorak: intercept before generic flow ────────────────────────────────────
  // Their server 302-redirects /verify/X.pdf → /#/verify/X.pdf, so fetch()
  // follows the redirect to the SPA shell (HTML) and download fails.
  // Instead, look up the report via Uzorak's public Supabase API.
  try {
    const rawU = new URL(pageUrl);
    if (matchesDomain(rawU.hostname.toLowerCase(), ["uzorak.com"])) {
      // Filename lives in the hash fragment: #/verify/PUBLICID_xxx.pdf
      const hashPath = rawU.hash.length > 1 ? rawU.hash.slice(1) : rawU.pathname;
      const filename = hashPath.split("/").pop() ?? "";
      // Public ID is the first underscore-delimited segment, e.g. "BCPMBT"
      const publicId = filename.replace(/\.pdf$/i, "").split("_")[0].trim();
      if (publicId) {
        return await extractUzorakCoAData(publicId);
      }
    }
  } catch {
    // Not a valid URL or not Uzorak — fall through to generic handler
  }
  // ── End Uzorak intercept ─────────────────────────────────────────────────────

  pageUrl = resolveCanonicalLabUrl(pageUrl);
  const urlType = detectLabUrlType(pageUrl);

  // For direct PDF or image URLs, download the file and send inline to Gemini
  if (urlType === "pdf" || urlType === "image") {
    const file = await downloadLabFile(pageUrl);
    if (!file) {
      console.warn("[gemini-lab-extract] Could not download file:", pageUrl);
      return null;
    }
    return runGeminiExtraction([{ inlineData: { mimeType: file.mimeType, data: file.data } }]);
  }

  // Website URL — scrape images then send to Gemini
  const imageUrls = await resolvePreviewInfo(pageUrl).then(p => p.type === "image" ? p.images : []);
  if (imageUrls.length === 0) {
    console.warn("[gemini-lab-extract] No images found for URL:", pageUrl);
    return null;
  }

  const imageParts: GeminiPart[] = [];
  for (const imgUrl of imageUrls.slice(0, 3)) {
    const file = await downloadLabFile(imgUrl);
    if (file) imageParts.push({ inlineData: { mimeType: file.mimeType, data: file.data } });
  }

  if (imageParts.length === 0) return null;
  return runGeminiExtraction(imageParts);
}

// ── Gemini extraction — from raw buffer (PDF/image upload) ───────────────────

/**
 * Extract CoA data from an in-memory buffer (e.g. a user-uploaded PDF).
 * This bypasses the URL allow-list since the file is already in memory.
 */
export async function extractCoADataFromBuffer(buf: Buffer, mimeType: string): Promise<ExtractedCoAData | null> {
  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    console.warn("[gemini-lab-extract] Unsupported MIME type for buffer extraction:", mimeType);
    return null;
  }
  if (buf.length > MAX_FILE_BYTES) {
    console.warn("[gemini-lab-extract] Buffer too large:", buf.length);
    return null;
  }
  const data = buf.toString("base64");
  return runGeminiExtraction([{ inlineData: { mimeType, data } }]);
}

// ── Gemini extraction — Janoshik legacy (unchanged behaviour) ─────────────────

export async function extractCoAData(pageUrl: string): Promise<ExtractedCoAData | null> {
  if (!isAllowedUrl(pageUrl)) {
    console.warn("[gemini-lab-extract] Rejected non-Janoshik URL:", pageUrl);
    return null;
  }
  return extractCoADataFromAnyUrl(pageUrl);
}

// ── Batch number OCR extractor ────────────────────────────────────────────────

const KNOWN_PREFIXES = [
  "51Q10","51Q50","A05","ARA16","AR16","BP10","BP20","CAG10","CAG5","CI1010",
  "CJD5","CJND","DS10","DS5","EP10","EP50","FOX10","G210","G610","GLO80",
  "H10","HK100","HK50","HK/KP50/20","IG1","ILLUM","IP10","KL080","KLO80",
  "KP10","KP30","M010","M040","MO10","MO20","MT1","MT210","MT2","NA500",
  "NASK10","NASK50","NASX10","NASX50","OZ10","OZ20","OZ5","PE10","PT10",
  "RE10","RE100","RE20","RE30","RE40","RE50","RE60","SK10","SN10","SR5",
  "SS10","SS30","SS50","SUR10","SX10","T/155","T/B1010","T/B55","TA110",
  "TB10","TB20","TB410","TBF10","TE10","TE20","VIP","ZE100","ZE10","ZE15",
  "ZE20","ZE30","ZE45","ZE60",
].join(", ");

const BATCH_NUMBERS_PROMPT = `Look at the image(s) provided. Find every FS3 batch/lot code visible.

FS3 batch codes start with a compound prefix followed by a hyphen and an alphanumeric suffix (e.g. "OZ10-A1B2C3", "ZE30-X9Y8Z7", "TB10-2B3C4D").

Known FS3 compound prefixes: ${KNOWN_PREFIXES}

Rules:
- Always include the full code with its prefix (e.g. "OZ10-ABC123", NOT just "ABC123").
- Look for text labelled "Batch:", "Lot:", "B/N:", "LOT#", or similar near these codes.
- If a code's prefix is not in the known list but follows the same pattern (uppercase letters+digits, hyphen, alphanumeric), still include it.
- Return ONLY a JSON array of unique batch code strings, exactly as written. No duplicates. No explanation. No markdown fencing.
- Example: ["OZ10-A1B2C3","ZE30-D4E5F6"]
- If you find no batch codes, return: []`;

/**
 * Extract all unique batch/lot numbers from one or more uploaded images using Gemini Vision.
 * Deduplicates case-insensitively across all images in the batch.
 */
export async function extractBatchNumbersFromImages(
  files: Array<{ data: Buffer; mimeType: string }>
): Promise<string[]> {
  if (files.length === 0) return [];
  const imageParts = files
    .filter(f => ALLOWED_MIME_TYPES.has(f.mimeType))
    .map(f => ({ inlineData: { mimeType: f.mimeType, data: f.data.toString("base64") } }));
  if (imageParts.length === 0) return [];
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [...imageParts, { text: BATCH_NUMBERS_PROMPT }] }],
      config: { temperature: 0.1, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = response.text?.trim() ?? "";
    if (!text) return [];
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    // Deduplicate case-insensitively, preserving first-seen casing
    const seen = new Set<string>();
    return parsed
      .filter((x: unknown) => typeof x === "string" && (x as string).trim())
      .map((x: string) => x.trim())
      .filter((x: string) => {
        const key = x.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } catch (err) {
    console.error("[gemini-lab-extract] batch OCR error:", err);
    return [];
  }
}

// ── Shared Gemini caller ──────────────────────────────────────────────────────

type GeminiPart = { inlineData: { mimeType: string; data: string } };

async function runGeminiExtraction(parts: GeminiPart[]): Promise<ExtractedCoAData | null> {
  if (parts.length === 0) return null;
  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [...parts, { text: EXTRACT_PROMPT }] }],
      config: { temperature: 0.1, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
    });
    const text = response.text?.trim() ?? "";
    if (!text) return null;
    const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    // Parse blend_components: expect [{name, mg, unit?, purity_pct?}] or null
    let blendComponents: Array<{ name: string; mg: number; unit?: string; purityPct?: number }> | null = null;
    if (Array.isArray(parsed.blend_components) && parsed.blend_components.length > 0) {
      const items = parsed.blend_components
        .filter((c: unknown) => c && typeof c === "object")
        .map((c: Record<string, unknown>) => {
          const entry: { name: string; mg: number; unit?: string; purityPct?: number } = {
            name: String(c.name ?? "").trim(),
            mg: parseFloat(String(c.mg ?? "0")),
          };
          if (c.unit) entry.unit = String(c.unit).trim();
          if (c.purity_pct != null) {
            const p = parseFloat(String(c.purity_pct));
            if (isFinite(p)) entry.purityPct = p;
          }
          return entry;
        })
        .filter((c: { name: string; mg: number }) => c.name && isFinite(c.mg));
      if (items.length > 0) blendComponents = items;
    }
    return {
      purityPct: parsed.purity_pct != null ? parseFloat(parsed.purity_pct) : null,
      mgAmount: parsed.mg_amount != null ? parseFloat(parsed.mg_amount) : null,
      massUnit: (parsed.mass_unit === "IU" || parsed.mass_unit === "iu") ? "IU" : "mg",
      endotoxinEuMg: parsed.endotoxin_eu_mg != null ? parseFloat(parsed.endotoxin_eu_mg) : null,
      sterilityPass: parsed.sterility_pass != null ? Boolean(parsed.sterility_pass) : null,
      heavyMetalAs: parsed.heavy_metal_as ? String(parsed.heavy_metal_as).trim() : null,
      heavyMetalCd: parsed.heavy_metal_cd ? String(parsed.heavy_metal_cd).trim() : null,
      heavyMetalPb: parsed.heavy_metal_pb ? String(parsed.heavy_metal_pb).trim() : null,
      heavyMetalHg: parsed.heavy_metal_hg ? String(parsed.heavy_metal_hg).trim() : null,
      batchCode: parsed.batch_code ? String(parsed.batch_code).trim() : null,
      testDate: parsed.test_date ? String(parsed.test_date).trim() : null,
      testType: TEST_TYPES.includes(parsed.test_type) ? parsed.test_type : null,
      productCategory: PRODUCT_CATEGORIES.includes(parsed.product_category) ? parsed.product_category : null,
      compoundName: parsed.compound_name ? String(parsed.compound_name).trim() : null,
      confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low",
      rawText: parsed.raw_text ? String(parsed.raw_text).slice(0, 200) : null,
      blendComponents,
    };
  } catch (err) {
    console.error("[gemini-lab-extract] parse error:", err);
    return null;
  }
}

// ── Types & constants ─────────────────────────────────────────────────────────

export interface ExtractedCoAData {
  purityPct: number | null;
  mgAmount: number | null;
  massUnit: "mg" | "IU";
  endotoxinEuMg: number | null;
  sterilityPass: boolean | null;
  heavyMetalAs: string | null;
  heavyMetalCd: string | null;
  heavyMetalPb: string | null;
  heavyMetalHg: string | null;
  batchCode: string | null;
  testDate: string | null;
  testType: string | null;
  productCategory: string | null;
  compoundName: string | null;
  confidence: "high" | "medium" | "low";
  rawText: string | null;
  blendComponents: Array<{ name: string; mg: number; unit?: string; purityPct?: number }> | null;
}

const TEST_TYPES = ["mass_purity", "mass", "endotoxin", "sterility", "heavy_metals", "lcms"];
const PRODUCT_CATEGORIES = ["peptide", "pill", "aas", "other"];

const EXTRACT_PROMPT = `You are analyzing a Certificate of Analysis (CoA) / lab report from a peptide or research chemical laboratory. The report may be an image, PDF scan, or photograph.

Extract ONLY data that is explicitly and clearly visible. Return a JSON object with these exact fields:

{
  "purity_pct": <number or null>,
  "mg_amount": <number or null>,
  "mass_unit": <"mg" | "IU" | null>,
  "endotoxin_eu_mg": <number or null>,
  "sterility_pass": <true | false | null>,
  "heavy_metal_as": <string or null>,
  "heavy_metal_cd": <string or null>,
  "heavy_metal_pb": <string or null>,
  "heavy_metal_hg": <string or null>,
  "batch_code": <string or null>,
  "test_date": <string or null>,
  "test_type": <"mass_purity" | "mass" | "endotoxin" | "sterility" | "heavy_metals" | "lcms" | null>,
  "product_category": <"peptide" | "pill" | "aas" | "other" | null>,
  "compound_name": <string or null>,
  "blend_components": <array of {name, mg, purity_pct?, unit?} or null>,
  "confidence": <"high" | "medium" | "low">,
  "raw_text": <brief summary of visible text up to 200 chars>
}

Guidelines:
- purity_pct: Extract percentage purity (e.g. 99.4 for "99.4%"). If there are multiple, take the main/average purity.
- mg_amount: The ACTUAL MEASURED mass from the Results/measurements table — the instrument reading (HPLC/UHPLC mass calculation). CRITICAL: Extract this value ONLY from the Results section of the report (the table that lists compound name alongside a measured mg value). NEVER use the nominal or labelled amount from the Sample field, sample name, or sample description. For example: if the report says "Sample: bpc 40mg" but the Results table shows "BPC-157 | 45.53 mg", extract 45.53 (not 40). The "40mg" is the labelled vial size; 45.53 is what the lab actually measured. Always prefer the Results table. IMPORTANT: Do NOT skip this field for high-mass compounds like NAD+, Tirzepatide, or any compound where the sample mass exceeds 100 mg — always extract the exact number shown in the Results. For blends with multiple components, set mg_amount to the total/combined mass if shown, or the sum of component masses.
- mass_unit: The unit for mg_amount. Use "IU" if the report shows International Units (common for HCG, FSH, LH and similar hormones). Use "mg" for milligrams. If mg_amount is null, set this to null.
- endotoxin_eu_mg: Extract endotoxin units (EU/mg or EU/vial). Convert any EU/vial to a number.
- sterility_pass: true if test says "pass", "sterile", "no growth" — false if "fail", "growth detected".
- heavy_metal_*: Text values like "not detected", "< 0.5 ppm", "1.2 ppb", etc.
- batch_code: Alphanumeric batch/lot identifier if present.
- test_date: Date in ISO format (YYYY-MM-DD) if possible, or text like "Jan 2024".
- test_type: Classify based on what was tested: mass_purity (HPLC/UHPLC purity + mass), mass (mass/weight measurement only, no purity), endotoxin (LAL test), sterility, heavy_metals, lcms.
- product_category: peptide, pill, aas (anabolic steroids), or other.
- compound_name: The compound or peptide name being tested. For blends, use the blend name if visible (e.g. "KLOW") or a combined name like "BPC-157/TB-500 blend".
- blend_components: ONLY populate this field when the report explicitly tests multiple distinct compounds in one sample (a blend/mixture). Each entry must have "name" (compound name) and "mg" (mass in mg as a number). Also include "purity_pct" (number) per component if the report shows individual purity results for each compound. Example: [{"name":"GHK-CU","mg":60.25,"purity_pct":99.1},{"name":"BPC-157","mg":11.22,"purity_pct":98.5},{"name":"TB-500","mg":11.40,"purity_pct":97.8},{"name":"KPV","mg":11.98}]. Set to null for single-compound reports. IMPORTANT: if the blend CoA shows 4 separate mass/purity results (one per component), capture all 4 in this array with their individual purity_pct values.
- confidence: high = clear readable report, medium = some fields unclear, low = poor quality or minimal data.
- IMPORTANT: Return ONLY the JSON object, no markdown, no code blocks, no extra text.`;

// ── Batch & bulk job state ────────────────────────────────────────────────────

export interface BatchExtractionJob {
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  startedAt: number | null;
  finishedAt: number | null;
  errors: Array<{ id: number; url: string | null; reason: string }>;
  currentId: number | null;
}

export const batchJob: BatchExtractionJob = {
  status: "idle",
  total: 0,
  processed: 0,
  succeeded: 0,
  failed: 0,
  skipped: 0,
  startedAt: null,
  finishedAt: null,
  errors: [],
  currentId: null,
};

export function resetBatchJob() {
  batchJob.status = "idle";
  batchJob.total = 0;
  batchJob.processed = 0;
  batchJob.succeeded = 0;
  batchJob.failed = 0;
  batchJob.skipped = 0;
  batchJob.startedAt = null;
  batchJob.finishedAt = null;
  batchJob.errors = [];
  batchJob.currentId = null;
}

export interface BulkImportJob {
  status: "idle" | "running" | "done" | "error";
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
  startedAt: number | null;
  finishedAt: number | null;
  errors: Array<{ url: string; reason: string }>;
  results: Array<{ url: string; id: number; peptideName: string; purityPct: number | null }>;
}

export const bulkImportJob: BulkImportJob = {
  status: "idle",
  total: 0,
  processed: 0,
  imported: 0,
  skipped: 0,
  failed: 0,
  startedAt: null,
  finishedAt: null,
  errors: [],
  results: [],
};

export function resetBulkImportJob() {
  bulkImportJob.status = "idle";
  bulkImportJob.total = 0;
  bulkImportJob.processed = 0;
  bulkImportJob.imported = 0;
  bulkImportJob.skipped = 0;
  bulkImportJob.failed = 0;
  bulkImportJob.startedAt = null;
  bulkImportJob.finishedAt = null;
  bulkImportJob.errors = [];
  bulkImportJob.results = [];
}
