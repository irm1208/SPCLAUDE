import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { writeLog } from "../lib/audit-log";
import type { Request, Response } from "express";
import { GoogleGenAI } from "../lib/google-genai";

const router: IRouter = Router();

const AI_KEYS = [
  "ai_chat_enabled",
  "ai_chat_transcript",
  "ai_chat_message_limit",
  "ai_chat_contact_handle",
] as const;

const gemini = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

// ── GET /admin/ai-chatbot/config ──────────────────────────────────────────────
router.get("/admin/ai-chatbot/config", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const rows = await db.select().from(siteConfigTable).where(inArray(siteConfigTable.key, [...AI_KEYS]));
  const map: Record<string, string> = {};
  for (const r of rows) { if (r.value !== null) map[r.key] = r.value; }
  res.json({
    enabled:       map["ai_chat_enabled"] === "true",
    transcript:    map["ai_chat_transcript"] ?? "",
    messageLimit:  parseInt(map["ai_chat_message_limit"] ?? "15", 10) || 15,
    contactHandle: map["ai_chat_contact_handle"] ?? "@urbanblend789",
  });
});

// ── PUT /admin/ai-chatbot/config ──────────────────────────────────────────────
router.put("/admin/ai-chatbot/config", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { enabled, transcript, messageLimit, contactHandle } = req.body as {
    enabled?: boolean;
    transcript?: string;
    messageLimit?: number;
    contactHandle?: string;
  };

  const updates: Array<{ key: string; value: string }> = [];
  if (enabled       !== undefined) updates.push({ key: "ai_chat_enabled",        value: enabled ? "true" : "false" });
  if (transcript    !== undefined) updates.push({ key: "ai_chat_transcript",     value: String(transcript) });
  if (messageLimit  !== undefined) updates.push({ key: "ai_chat_message_limit",  value: String(Math.max(1, Math.min(100, Number(messageLimit) || 15))) });
  if (contactHandle !== undefined) updates.push({ key: "ai_chat_contact_handle", value: String(contactHandle).trim() });

  for (const u of updates) {
    await db.insert(siteConfigTable)
      .values({ key: u.key, value: u.value })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: u.value } });
  }

  writeLog("change", "info", "ai_chatbot_config_update",
    `AI chatbot config updated by ${getAdminUsername(res)}`,
    { keys: updates.map(u => u.key) },
  ).catch(() => {});

  res.json({ ok: true });
});

// ── POST /admin/ai-chatbot/test ───────────────────────────────────────────────
// Lets the admin test the AI with their current draft transcript before going live.
// Accepts transcript + contactHandle directly so unsaved edits can be tested.
router.post("/admin/ai-chatbot/test", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { message, transcript, contactHandle, history } = req.body as {
    message: string;
    transcript?: string;
    contactHandle?: string;
    history?: Array<{ role: "user" | "model"; text: string }>;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const handle = (contactHandle ?? "@urbanblend789").trim();
  const ctx    = (transcript ?? "").trim();

  const systemInstruction = [
    "You are a helpful support assistant for Peps Anonymous, a peptide ordering platform.",
    "Your job is to answer customer questions concisely and helpfully.",
    ctx
      ? `Use the following Q&A transcript from real customer conversations as your primary knowledge base:\n\n--- TRANSCRIPT ---\n${ctx.slice(0, 40000)}\n--- END TRANSCRIPT ---`
      : "No transcript has been provided yet.",
    "",
    "Guidelines:",
    "- Be concise (2-4 sentences unless a longer answer is clearly needed)",
    "- Only answer based on information in the transcript or widely known facts",
    "- Never fabricate specific order details, prices, tracking numbers, or policies not mentioned",
    `- If you genuinely cannot answer, say so and suggest contacting ${handle}`,
    "- Respond in plain text — no markdown, no asterisks, no bullet symbols (this is Telegram)",
    "- Do not mention that you are an AI unless directly asked",
  ].filter(Boolean).join("\n");

  // Build multi-turn conversation history for context
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const turn of (history ?? [])) {
    contents.push({ role: turn.role, parts: [{ text: turn.text }] });
  }
  contents.push({ role: "user", parts: [{ text: message.trim() }] });

  try {
    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash",
      config: { systemInstruction },
      contents,
    });

    const reply = (response.text ?? "").trim() || "I'm not sure about that.";
    res.json({ reply });
  } catch (err) {
    console.error("[ai-chatbot:test] Gemini error:", err);
    res.status(500).json({ error: "AI request failed. Check that the Gemini integration is configured." });
  }
});

export default router;
