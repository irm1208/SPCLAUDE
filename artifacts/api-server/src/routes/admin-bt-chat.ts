import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { btConversationsTable } from "@workspace/db";
import { desc, ilike, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import type { Request, Response } from "express";

const router: IRouter = Router();

// ── GET /admin/bt-conversations ───────────────────────────────────────────────
// Lists all blood-test AI chat conversations, newest first.
// Query params:
//   q        — search username or title (optional)
//   page     — page number (default 1)
//   limit    — conversations per page (default 30, max 100)
router.get("/admin/bt-conversations", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const q     = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const page  = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? "30"), 10) || 30));
  const offset = (page - 1) * limit;

  const where = q
    ? or(
        ilike(btConversationsTable.telegramUsername, `%${q}%`),
        ilike(btConversationsTable.title, `%${q}%`),
      )
    : undefined;

  const [rows, countResult] = await Promise.all([
    db
      .select()
      .from(btConversationsTable)
      .where(where)
      .orderBy(desc(btConversationsTable.updatedAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(btConversationsTable)
      .where(where),
  ]);

  const total = countResult[0]?.total ?? 0;

  const conversations = rows.map(row => {
    let messages: Array<{ id: string; role: string; content: string; timestamp: string }> = [];
    try { messages = JSON.parse(row.messagesJson); } catch { /* ignore */ }
    return {
      id: row.id,
      telegramUsername: row.telegramUsername,
      title: row.title,
      messages,
      messageCount: messages.length,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });

  res.json({ conversations, total, page, limit });
});

// ── GET /admin/bt-conversations/:id ──────────────────────────────────────────
// Returns a single conversation with full messages.
router.get("/admin/bt-conversations/:id", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { id } = req.params;
  const [row] = await db
    .select()
    .from(btConversationsTable)
    .where(sql`${btConversationsTable.id} = ${id}`)
    .limit(1);

  if (!row) { res.status(404).json({ error: "Not found" }); return; }

  let messages: Array<{ id: string; role: string; content: string; timestamp: string }> = [];
  try { messages = JSON.parse(row.messagesJson); } catch { /* ignore */ }

  res.json({
    id: row.id,
    telegramUsername: row.telegramUsername,
    title: row.title,
    messages,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
});

export default router;
