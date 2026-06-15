import { Router } from "express";
import { db } from "@workspace/db";
import { feedbackTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { sendTelegramMessage, getAdminChatId } from "../lib/telegram";

const router = Router();

const MAX_MESSAGE = 2000;
const MAX_TG = 100;

const VALID_TYPES = ["feedback", "suggestion", "bug", "addition", "request"] as const;
type FeedbackType = typeof VALID_TYPES[number];

const TYPE_LABELS: Record<string, string> = {
  feedback:   "💬 Feedback",
  suggestion: "💡 Suggestion",
  bug:        "🐛 Bug Report",
  addition:   "✨ Addition",
  request:    "🔖 Request",
};

function safeParseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n <= 0 || String(n) !== raw) return null;
  return n;
}

router.post("/feedback", async (req, res) => {
  try {
    const { type, message, telegramUsername } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    const trimmed = message.trim();
    if (trimmed.length < 3 || trimmed.length > MAX_MESSAGE) {
      res.status(400).json({ error: "Message must be between 3 and 2000 characters" });
      return;
    }
    if (!VALID_TYPES.includes(type as FeedbackType)) {
      res.status(400).json({ error: "Invalid type" });
      return;
    }

    let tgClean: string | null = null;
    if (telegramUsername) {
      if (typeof telegramUsername !== "string") {
        res.status(400).json({ error: "Invalid Telegram username" });
        return;
      }
      const tg = telegramUsername.trim().slice(0, MAX_TG);
      if (tg.length > 0 && !/^@?[\w.]{1,64}$/.test(tg)) {
        res.status(400).json({ error: "Invalid Telegram username format" });
        return;
      }
      tgClean = tg.length > 0 ? tg : null;
    }

    await db.insert(feedbackTable).values({
      type: type as FeedbackType,
      message: trimmed.slice(0, MAX_MESSAGE),
      telegramUsername: tgClean,
    });

    // Notify admin via Telegram (non-blocking)
    getAdminChatId().then(adminChatId => {
      if (!adminChatId) return;
      const label = TYPE_LABELS[type as string] ?? type;
      const tgLine = tgClean ? `\n👤 <b>From:</b> @${tgClean.replace(/^@/, "")}` : "";
      const preview = trimmed.length > 300 ? trimmed.slice(0, 300) + "…" : trimmed;
      return sendTelegramMessage(
        adminChatId,
        `📬 <b>New ${label}</b>${tgLine}\n\n${preview}`,
        "HTML",
        { recipientType: "admin" },
      );
    }).catch(() => {});

    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to submit feedback" });
  }
});

router.get("/admin/feedback", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const rows = await db.select().from(feedbackTable).orderBy(desc(feedbackTable.createdAt));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

router.delete("/admin/feedback/:id", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    const id = safeParseId(req.params.id);
    if (id === null) {
      res.status(400).json({ error: "Invalid ID" });
      return;
    }
    await db.delete(feedbackTable).where(eq(feedbackTable.id, id));
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Failed to delete feedback" });
  }
});

export default router;
