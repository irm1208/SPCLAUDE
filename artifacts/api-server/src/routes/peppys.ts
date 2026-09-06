/**
 * Peppys community knowledge import & management endpoints.
 *
 * POST   /peppys/import        — bookmarklet receiver (admin secret required)
 * GET    /peppys/articles      — list imported articles (admin)
 * DELETE /peppys/articles/:id  — remove an article (admin)
 * GET    /peppys/bookmarklet   — admin-only setup page with drag-to-bookmark link
 *
 * All routes are mounted under /api by app.ts, so external paths are
 * /api/peppys/import, /api/peppys/articles, etc.
 *
 * The import endpoint allows CORS from chat.peppys.org so the
 * browser bookmarklet can POST directly from that domain.
 */

import { Router } from "express";
import type { Request, Response } from "express";
import { db } from "@workspace/db";
import { peppysArticlesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdminForRequest } from "../middleware/require-admin";
import { countPeppysArticles } from "../lib/peppys-search";

const router = Router();

const ALLOWED_ORIGIN = "https://chat.peppys.org";

function setPeppysCors(res: Response) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Secret, X-Admin-Csrf, X-Admin-Action-Assertion");
}

// ── CORS pre-flight for bookmarklet ─────────────────────────────────────────

router.options("/peppys/import", (_req, res) => {
  setPeppysCors(res);
  res.sendStatus(204);
});

// ── POST /peppys/import ──────────────────────────────────────────────────────

router.post("/peppys/import", async (req: Request, res: Response) => {
  setPeppysCors(res);

  if (!await requireAdminForRequest(req, res)) return;

  const { id, title, url, content, categoryName, tags, postCount } = req.body as {
    id?: string;
    title?: string;
    url?: string;
    content?: string;
    categoryName?: string;
    tags?: string[];
    postCount?: number;
  };

  if (!id || !title || !url || !content) {
    res.status(400).json({ error: "id, title, url, and content are required" });
    return;
  }

  if (content.length < 20) {
    res.status(400).json({ error: "Content too short" });
    return;
  }

  const tagsJson = JSON.stringify(Array.isArray(tags) ? tags : []);

  await db
    .insert(peppysArticlesTable)
    .values({
      id:           String(id),
      title:        title.slice(0, 500),
      url:          url.slice(0, 1000),
      content:      content.slice(0, 50_000),
      categoryName: categoryName?.slice(0, 200) ?? null,
      tags:         tagsJson,
      postCount:    postCount ?? 1,
    })
    .onConflictDoUpdate({
      target: peppysArticlesTable.id,
      set: {
        title:        title.slice(0, 500),
        url:          url.slice(0, 1000),
        content:      content.slice(0, 50_000),
        categoryName: categoryName?.slice(0, 200) ?? null,
        tags:         tagsJson,
        postCount:    postCount ?? 1,
        updatedAt:    sql`now()`,
      },
    });

  const total = await countPeppysArticles();
  console.log(`[peppys] Upserted "${title}" (id=${id}). Total: ${total}`);
  res.json({ ok: true, id, total });
});

// ── GET /peppys/articles ─────────────────────────────────────────────────────

router.get("/peppys/articles", async (req: Request, res: Response) => {
  if (!await requireAdminForRequest(req, res)) return;

  const articles = await db
    .select({
      id:           peppysArticlesTable.id,
      title:        peppysArticlesTable.title,
      url:          peppysArticlesTable.url,
      categoryName: peppysArticlesTable.categoryName,
      postCount:    peppysArticlesTable.postCount,
      importedAt:   peppysArticlesTable.importedAt,
      updatedAt:    peppysArticlesTable.updatedAt,
    })
    .from(peppysArticlesTable)
    .orderBy(sql`imported_at DESC`)
    .limit(200);

  res.json({ articles, total: articles.length });
});

// ── DELETE /peppys/articles/:id ──────────────────────────────────────────────

router.delete("/peppys/articles/:id", async (req: Request, res: Response) => {
  if (!await requireAdminForRequest(req, res)) return;

  const { id } = req.params as { id: string };
  await db.delete(peppysArticlesTable).where(eq(peppysArticlesTable.id, id));
  res.json({ ok: true });
});

// ── GET /peppys/bookmarklet — admin-only HTML setup page ─────────────────────

router.get("/peppys/bookmarklet", async (req: Request, res: Response) => {
  if (!await requireAdminForRequest(req, res)) return;

  const total = await countPeppysArticles();

  // Construct base URL from the actual request so the bookmarklet targets the
  // right host regardless of dev vs production environment.
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) ?? req.protocol ?? "https";
  const host  = (req.headers["x-forwarded-host"] as string | undefined) ?? req.get("host") ?? "";
  const baseUrl = `${proto}://${host}`;

  // Bookmarklet JS — runs on chat.peppys.org, posts to our /api/peppys/import
  // Written without template literals or backticks to avoid escaping nightmares.
  const bmLines = [
    "javascript:(function(){",
    "var BASE='" + baseUrl + "';",
    "var KEY='sp_peppys_secret';",
    "var secret=localStorage.getItem(KEY)||prompt('Salt&Peps admin secret (stored in browser):');",
    "if(!secret){return;}",
    "localStorage.setItem(KEY,secret);",
    "var title=(document.querySelector('.fancy-title')||{}).textContent||document.title;",
    "title=(title||'').trim();",
    "var url=window.location.href;",
    "var topicMatch=url.match(/\\/t\\/[^/]+\\/(\\d+)/);",
    "if(!topicMatch){alert('Not a Discourse topic page.');return;}",
    "var id=topicMatch[1];",
    "var catEl=document.querySelector('.category-name')||document.querySelector('a.badge-category__name');",
    "var cat=catEl?(catEl.textContent||'').trim():'';",
    "var tags=Array.from(document.querySelectorAll('.discourse-tags a')).map(function(a){return(a.textContent||'').trim();}).filter(Boolean);",
    "var posts=Array.from(document.querySelectorAll('.topic-body .cooked')).map(function(el){return(el.innerText||'').trim();}).filter(function(t){return t.length>10;});",
    "if(!posts.length){alert('No post content found. Scroll to load all posts first.');return;}",
    "var content=posts.join('\\n\\n---\\n\\n');",
    "var postCount=posts.length;",
    "fetch(BASE+'/api/peppys/import',{",
    "  method:'POST',",
    "  headers:{'Content-Type':'application/json','X-Admin-Secret':secret},",
    "  body:JSON.stringify({id:id,title:title,url:url,content:content,categoryName:cat,tags:tags,postCount:postCount})",
    "}).then(function(r){return r.json().then(function(d){return{ok:r.ok,d:d};});}).then(function(result){",
    "  if(result.ok){alert('Saved to Sage! Total: '+result.d.total);}",
    "  else{if(result.d.error==='Unauthorized'){localStorage.removeItem(KEY);}alert('Error: '+(result.d.error||'Unknown'));}}",
    ").catch(function(){alert('Network error — is the Salt&Peps server reachable?');});",
    "})();",
  ];
  const bookmarkletJs = bmLines.join("");

  const html = [
    "<!DOCTYPE html>",
    "<html lang='en'>",
    "<head>",
    "<meta charset='UTF-8'>",
    "<meta name='viewport' content='width=device-width, initial-scale=1.0'>",
    "<title>Peppys Bookmarklet Setup</title>",
    "<style>",
    "body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0f0f12;color:#e2e8f0;max-width:680px;margin:0 auto;padding:2rem 1.5rem;line-height:1.6;}",
    "h1{color:#f8fafc;margin-bottom:0.25rem;font-size:1.5rem;}",
    ".sub{color:#94a3b8;margin-bottom:2rem;font-size:0.95rem;}",
    ".card{background:#1e1e28;border:1px solid #2e2e3e;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;}",
    "h2{font-size:0.85rem;font-weight:600;margin:0 0 1rem;color:#64748b;text-transform:uppercase;letter-spacing:0.07em;}",
    ".bm{display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#fff;font-weight:600;padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-size:1rem;cursor:move;user-select:none;}",
    ".hint{margin-top:0.75rem;color:#64748b;font-size:0.875rem;}",
    "ol{margin:0;padding-left:1.25rem;}",
    "li{margin-bottom:0.5rem;color:#94a3b8;}",
    "li strong{color:#cbd5e1;}",
    ".stat{display:inline-flex;align-items:center;gap:0.5rem;background:#2e2e3e;border-radius:8px;padding:0.5rem 1rem;font-size:0.9rem;}",
    ".num{font-size:1.5rem;font-weight:700;color:#818cf8;}",
    "code{background:#1a1a24;border:1px solid #2e2e3e;padding:0.125rem 0.375rem;border-radius:4px;font-size:0.82em;color:#a5b4fc;}",
    ".note{background:#1a2a1a;border-left:3px solid #4ade80;padding:0.75rem 1rem;border-radius:0 8px 8px 0;font-size:0.875rem;color:#86efac;margin-top:1rem;}",
    ".url{background:#1a1a24;border:1px solid #2e2e3e;border-radius:6px;padding:0.5rem 0.75rem;font-size:0.8rem;color:#94a3b8;word-break:break-all;margin-top:0.5rem;}",
    "</style>",
    "</head>",
    "<body>",
    "<h1>&#128278; Peppys Bookmarklet</h1>",
    "<p class='sub'>Import Peppys forum threads into Sage's knowledge base</p>",
    "<div class='card'>",
    "<h2>Knowledge Base</h2>",
    "<div class='stat'><span class='num'>" + total + "</span> articles imported</div>",
    "</div>",
    "<div class='card'>",
    "<h2>Step 1 &mdash; Drag to Bookmarks Bar</h2>",
    "<p style='color:#94a3b8;margin:0 0 1rem;font-size:0.9rem;'>Drag this button to your browser bookmarks bar:</p>",
    "<a class='bm' href='" + bookmarkletJs.replace(/'/g, "&#39;") + "' title='Save to Sage'>&#128204; Save to Sage</a>",
    "<p class='hint'>&#9650; Drag this to your bookmarks bar. Click it on any Peppys thread.</p>",
    "<div class='url'>Targeting: " + baseUrl + "/api/peppys/import</div>",
    "</div>",
    "<div class='card'>",
    "<h2>Step 2 &mdash; How to Use</h2>",
    "<ol>",
    "<li>Open any thread on <strong>chat.peppys.org</strong></li>",
    "<li>Scroll to load all posts you want saved</li>",
    "<li>Click <strong>Save to Sage</strong> in your bookmarks bar</li>",
    "<li>Enter your <strong>admin secret</strong> when prompted (saved in browser for next time)</li>",
    "<li>Wait for the <strong>Saved to Sage!</strong> confirmation</li>",
    "</ol>",
    "<div class='note'>The secret is stored in your browser's <code>localStorage</code> only. To reset: open console on any page and run <code>localStorage.removeItem('sp_peppys_secret')</code></div>",
    "</div>",
    "<div class='card'>",
    "<h2>What Gets Saved</h2>",
    "<ol>",
    "<li>Thread title, URL, and category</li>",
    "<li>All visible post text (scroll down to load more first)</li>",
    "<li>Tags</li>",
    "</ol>",
    "<p style='color:#64748b;font-size:0.85rem;margin-top:0.75rem;'>Re-importing a thread updates it with the latest content. Sage searches these articles automatically when members ask relevant questions.</p>",
    "</div>",
    "</body></html>",
  ].join("\n");

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
