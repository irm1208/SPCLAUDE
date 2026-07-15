/**
 * Peppys community articles search for Sage context injection.
 *
 * Searches the locally-imported peppys_articles table using PostgreSQL
 * full-text search. Returns top matching snippets to inject into Sage's
 * system prompt alongside PepPedia content.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const MAX_RESULTS = 3;
const MAX_SNIPPET = 900;

export interface PeppysResult {
  title:   string;
  url:     string;
  snippet: string;
}

export async function searchPeppysArticles(query: string): Promise<PeppysResult[] | null> {
  if (!query || query.trim().length < 3) return null;

  try {
    const result = await db.execute<{ id: string; title: string; url: string; content: string }>(sql`
      SELECT id, title, url, content
      FROM peppys_articles
      WHERE to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', ${query.trim()})
      ORDER BY ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', ${query.trim()})) DESC
      LIMIT ${MAX_RESULTS}
    `);

    const rows = result.rows;
    if (!rows || rows.length === 0) return null;

    return rows.map(r => ({
      title:   r.title,
      url:     r.url,
      snippet: r.content.slice(0, MAX_SNIPPET),
    }));
  } catch {
    return null;
  }
}

export async function countPeppysArticles(): Promise<number> {
  try {
    const result = await db.execute<{ count: string }>(sql`SELECT COUNT(*)::text AS count FROM peppys_articles`);
    const row = result.rows[0] as { count: string } | undefined;
    return parseInt(row?.count ?? "0", 10);
  } catch {
    return 0;
  }
}
