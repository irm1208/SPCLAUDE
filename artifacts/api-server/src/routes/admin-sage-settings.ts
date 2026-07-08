import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin, getAdminUsername } from "../middleware/require-admin";
import { writeLog } from "../lib/audit-log";
import { callSageAI, getActiveSageModel, getSageFallbackModel, SAGE_MODEL_CONFIG_KEY, type SageMessage } from "../lib/sage-ai";
import type { Request, Response } from "express";

const router: IRouter = Router();

// ── Full list of models switchable from the admin panel ──────────────────────
// Kept as a flat, admin-curated allowlist (source of truth lives here, exposed
// to the frontend via GET so it never needs to be duplicated client-side).
export const SAGE_AVAILABLE_MODELS = [
  "codex-auto-review",
  "qwen-coder-plus",
  "qwen-coder-plus-1106",
  "qwen-coder-plus-latest",
  "qwen-coder-turbo",
  "qwen-coder-turbo-0919",
  "qwen-coder-turbo-latest",
  "qwen3-coder-plus",
  "claude-3-5-haiku-20241022",
  "claude-3-7-sonnet-20250219",
  "claude-3-7-sonnet-20250219-thinking",
  "claude-haiku-4-5-20251001",
  "claude-haiku-4-5-20251001-thinking",
  "claude-opus-4-1-20250805",
  "claude-opus-4-1-20250805-thinking",
  "claude-opus-4-20250514",
  "claude-opus-4-20250514-thinking",
  "claude-opus-4-5-20251101",
  "claude-opus-4-5-20251101-thinking",
  "claude-opus-4-6",
  "claude-opus-4-6-thinking",
  "claude-opus-4-7",
  "claude-opus-4-8",
  "claude-opus-4-8-thinking",
  "claude-sonnet-4-20250514",
  "claude-sonnet-4-20250514-thinking",
  "claude-sonnet-4-5-20250929",
  "claude-sonnet-4-5-20250929-thinking",
  "claude-sonnet-4-6",
  "claude-sonnet-4-6-thinking",
  "claude-sonnet-5",
  "deepseek-v4-flash",
  "deepseek-v4-pro",
  "glm-4.6",
  "glm-4.7",
  "glm-5",
  "glm-5.1",
  "gpt-5.4",
  "gpt-5.4-high-openai-compact",
  "gpt-5.4-low",
  "gpt-5.4-low-openai-compact",
  "gpt-5.4-medium",
  "gpt-5.4-medium-openai-compact",
  "gpt-5.4-mini",
  "gpt-5.4-mini-high-openai-compact",
  "gpt-5.4-mini-low-openai-compact",
  "gpt-5.4-mini-medium",
  "gpt-5.4-mini-medium-openai-compact",
  "gpt-5.4-mini-openai-compact",
  "gpt-5.4-mini-xhigh",
  "gpt-5.4-mini-xhigh-openai-compact",
  "gpt-5.4-openai-compact",
  "gpt-5.4-xhigh-openai-compact",
  "gpt-5.5",
  "gpt-5.5-openai-compact",
  "Kimi-K2.5",
  "kimi-k2.6",
  "qwen-flash",
  "qwen-math-plus",
  "qwen-math-turbo",
  "qwen-max",
  "qwen-max-0403",
  "qwen-max-0428",
  "qwen-max-2025-01-25",
  "qwen-max-latest",
  "qwen-max-longcontext",
  "qwen-plus",
  "qwen-plus-0919",
  "qwen-plus-2025-01-25",
  "qwen-plus-2025-04-28",
  "qwen-plus-2025-07-14",
  "qwen-plus-2025-09-11",
  "qwen-plus-2025-11-05",
  "qwen-plus-2025-12-01",
  "qwen-plus-latest",
  "qwen-turbo",
  "qwen-turbo-0919",
  "qwen-turbo-2024-11-01",
  "qwen-turbo-2025-04-28",
  "qwen-turbo-2025-07-15",
  "qwen-turbo-latest",
  "qwen-vl-max",
  "qwen2.5-72b-instruct",
  "qwen2.5-vl-32b-instruc",
  "qwen2.5-vl-32b-instruct",
  "qwen2.5-vl-72b-instruct",
  "qwen3-30b-a3b",
  "qwen3-max",
  "qwen3-max-2025-09-23",
  "qwen3-max-preview",
  "qwen3-vl-235b-a22b-thinking",
  "qwen3-vl-plus",
  "qwen3.5-flash",
  "qwen3.5-plus",
  "qwen3.6-max-preview",
  "qwen3.6-plus",
  "qwq-plus",
  "qwq-plus-2025-03-05",
] as const;

const SAGE_MODEL_SET = new Set<string>(SAGE_AVAILABLE_MODELS);

// ── Admin-added custom models ─────────────────────────────────────────────────
// Stored as a JSON array under this site_config key so admins can register models
// that aren't in the curated allowlist above, without needing a code change.
const SAGE_CUSTOM_MODELS_CONFIG_KEY = "sage_ai_custom_models";
const MAX_CUSTOM_MODELS = 100;
const MAX_MODEL_NAME_LENGTH = 200;

async function getCustomModels(): Promise<string[]> {
  const [row] = await db.select().from(siteConfigTable).where(eq(siteConfigTable.key, SAGE_CUSTOM_MODELS_CONFIG_KEY));
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed.filter((m): m is string => typeof m === "string") : [];
  } catch {
    return [];
  }
}

async function saveCustomModels(models: string[]): Promise<void> {
  await db.insert(siteConfigTable)
    .values({ key: SAGE_CUSTOM_MODELS_CONFIG_KEY, value: JSON.stringify(models) })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: JSON.stringify(models) } });
}

// ── GET /admin/sage-settings ──────────────────────────────────────────────────
router.get("/admin/sage-settings", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const [model, customModels] = await Promise.all([getActiveSageModel(), getCustomModels()]);
  res.json({
    model,
    fallbackModel: getSageFallbackModel(),
    availableModels: [...SAGE_AVAILABLE_MODELS, ...customModels],
    customModels,
    serverKeyConfigured: !!process.env.SAGE_PROXY_API_KEY,
  });
});

// ── POST /admin/sage-settings/models ──────────────────────────────────────────
// Adds a custom model name to the admin-curated allowlist so it becomes selectable
// without a code deploy. Duplicate check is case-insensitive against both lists.
router.post("/admin/sage-settings/models", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { model } = req.body as { model?: string };
  const trimmed = typeof model === "string" ? model.trim() : "";

  if (!trimmed) {
    res.status(400).json({ error: "model is required" });
    return;
  }
  if (trimmed.length > MAX_MODEL_NAME_LENGTH) {
    res.status(400).json({ error: "Model name is too long" });
    return;
  }

  const customModels = await getCustomModels();
  const lower = trimmed.toLowerCase();
  const alreadyExists =
    SAGE_AVAILABLE_MODELS.some(m => m.toLowerCase() === lower) ||
    customModels.some(m => m.toLowerCase() === lower);
  if (alreadyExists) {
    res.status(400).json({ error: "That model is already in the list" });
    return;
  }
  if (customModels.length >= MAX_CUSTOM_MODELS) {
    res.status(400).json({ error: `You can add up to ${MAX_CUSTOM_MODELS} custom models` });
    return;
  }

  const updated = [...customModels, trimmed];
  await saveCustomModels(updated);

  writeLog("change", "info", "sage_ai_custom_model_add",
    `Custom Sage AI model "${trimmed}" added by ${getAdminUsername(res)}`,
    { model: trimmed },
  ).catch(() => {});

  res.json({ customModels: updated, availableModels: [...SAGE_AVAILABLE_MODELS, ...updated] });
});

// ── DELETE /admin/sage-settings/models/:model ─────────────────────────────────
// Removes a previously-added custom model. Built-in (hardcoded) models cannot be removed here.
router.delete("/admin/sage-settings/models/:model", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const rawParam = req.params.model;
  const target = decodeURIComponent(Array.isArray(rawParam) ? rawParam[0] ?? "" : rawParam ?? "").trim();
  if (!target) {
    res.status(400).json({ error: "model is required" });
    return;
  }

  const customModels = await getCustomModels();
  const updated = customModels.filter(m => m !== target);
  if (updated.length === customModels.length) {
    res.status(404).json({ error: "Custom model not found" });
    return;
  }

  await saveCustomModels(updated);

  // If the model being removed is currently active, fall back to the default so
  // the site never ends up pointing at a model that's no longer in any list.
  const activeModel = await getActiveSageModel();
  if (activeModel === target) {
    await db.insert(siteConfigTable)
      .values({ key: SAGE_MODEL_CONFIG_KEY, value: getSageFallbackModel() })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: getSageFallbackModel() } });
  }

  writeLog("change", "info", "sage_ai_custom_model_remove",
    `Custom Sage AI model "${target}" removed by ${getAdminUsername(res)}`,
    { model: target },
  ).catch(() => {});

  res.json({ customModels: updated, availableModels: [...SAGE_AVAILABLE_MODELS, ...updated] });
});

// ── PATCH /admin/sage-settings ────────────────────────────────────────────────
router.patch("/admin/sage-settings", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { model } = req.body as { model?: string };
  const trimmed = typeof model === "string" ? model.trim() : "";

  if (!trimmed) {
    res.status(400).json({ error: "model is required" });
    return;
  }
  const customModels = await getCustomModels();
  if (!SAGE_MODEL_SET.has(trimmed) && !customModels.includes(trimmed)) {
    res.status(400).json({ error: "Unknown model" });
    return;
  }

  await db.insert(siteConfigTable)
    .values({ key: SAGE_MODEL_CONFIG_KEY, value: trimmed })
    .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: trimmed } });

  writeLog("change", "info", "sage_ai_model_update",
    `Sage AI model changed to "${trimmed}" by ${getAdminUsername(res)}`,
    { model: trimmed },
  ).catch(() => {});

  res.json({ model: trimmed });
});

// ── POST /admin/sage-settings/test ────────────────────────────────────────────
// Lets the admin chat directly with Sage using any model from the list, without
// needing to save it first. Explicit model bypasses the primary/fallback chain.
router.post("/admin/sage-settings/test", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { message, model, history, authToken, baseUrl } = req.body as {
    message?: string;
    model?: string;
    history?: Array<{ role: "user" | "assistant"; text: string }>;
    /** Optional per-admin browser-stored credential override. Never persisted server-side. */
    authToken?: string;
    baseUrl?: string;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const chosenModel = typeof model === "string" ? model.trim() : "";
  if (chosenModel && !SAGE_MODEL_SET.has(chosenModel)) {
    const customModels = await getCustomModels();
    if (!customModels.includes(chosenModel)) {
      res.status(400).json({ error: "Unknown model" });
      return;
    }
  }

  const messages: SageMessage[] = [
    ...(history ?? []).map(h => ({ role: h.role, content: h.text }) as SageMessage),
    { role: "user", content: message.trim() },
  ];

  const systemPrompt = [
    "You are Sage, the health assistant for Salt&Peps members.",
    "You help members understand their blood tests, peptide compound logs, and general health questions.",
    "This is an admin test conversation used to evaluate model quality — respond normally as you would to a member.",
  ].join(" ");

  try {
    const reply = await callSageAI({
      system: systemPrompt,
      messages,
      maxTokens: 1024,
      model: chosenModel || undefined,
      apiKey: typeof authToken === "string" ? authToken.trim() || undefined : undefined,
      baseUrl: typeof baseUrl === "string" ? baseUrl.trim() || undefined : undefined,
    });
    res.json({
      reply: reply || "(empty response)",
      model: chosenModel || await getActiveSageModel(),
    });
  } catch (err) {
    console.error("[sage-settings:test] error:", err);
    res.status(502).json({ error: err instanceof Error ? err.message : "Sage AI request failed" });
  }
});

export default router;
