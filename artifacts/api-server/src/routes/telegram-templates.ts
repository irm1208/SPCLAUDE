import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";
import { requireAdmin } from "../middleware/require-admin";
import { invalidateTemplateCache } from "../lib/telegram";
import { TEMPLATE_REGISTRY, REGISTRY_MAP } from "../lib/telegram-registry";
export type { TemplateEventMeta } from "../lib/telegram-registry";
export { TEMPLATE_REGISTRY };

const router: IRouter = Router();

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /admin/telegram-templates
// Returns the full list with stored overrides merged in.
router.get("/admin/telegram-templates", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  try {
    const rows = await db
      .select({ key: siteConfigTable.key, value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(like(siteConfigTable.key, "tg_template:%"));

    const stored = new Map<string, { template: string; enabled: boolean }>();
    for (const row of rows) {
      const eventKey = row.key.replace("tg_template:", "");
      try {
        const parsed = JSON.parse(row.value ?? "{}") as { template?: string; enabled?: boolean };
        stored.set(eventKey, {
          template: parsed.template ?? "",
          enabled: parsed.enabled !== false,
        });
      } catch {}
    }

    const result = TEMPLATE_REGISTRY
      .filter(meta => meta.editableInAdmin !== false)
      .map(meta => {
        const override = stored.get(meta.eventKey);
        return {
          ...meta,
          template: override?.template ?? meta.defaultTemplate,
          enabled: override?.enabled !== undefined ? override.enabled : true,
          isCustomized: stored.has(meta.eventKey),
        };
      });

    res.json(result);
  } catch (err) {
    console.error("[telegram-templates] GET list error:", err);
    res.status(500).json({ error: "Failed to load templates" });
  }
});

// GET /admin/telegram-templates/:eventKey
router.get("/admin/telegram-templates/:eventKey", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { eventKey } = req.params;
  const meta = REGISTRY_MAP.get(eventKey);
  if (!meta) {
    res.status(404).json({ error: "Unknown event key" });
    return;
  }

  try {
    const [row] = await db
      .select({ value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(eq(siteConfigTable.key, `tg_template:${eventKey}`));

    let template = meta.defaultTemplate;
    let enabled = true;
    let isCustomized = false;

    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value) as { template?: string; enabled?: boolean };
        template = parsed.template ?? meta.defaultTemplate;
        enabled = parsed.enabled !== false;
        isCustomized = true;
      } catch {}
    }

    res.json({ ...meta, template, enabled, isCustomized });
  } catch (err) {
    console.error("[telegram-templates] GET single error:", err);
    res.status(500).json({ error: "Failed to load template" });
  }
});

// PUT /admin/telegram-templates/:eventKey
// Body: { template: string, enabled: boolean }
router.put("/admin/telegram-templates/:eventKey", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { eventKey } = req.params;
  const meta = REGISTRY_MAP.get(eventKey);
  if (!meta) {
    res.status(404).json({ error: "Unknown event key" });
    return;
  }

  const { template, enabled } = req.body as { template?: unknown; enabled?: unknown };

  if (template !== undefined && typeof template !== "string") {
    res.status(400).json({ error: "template must be a string" });
    return;
  }
  if (enabled !== undefined && typeof enabled !== "boolean") {
    res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }

  const storedTemplate = typeof template === "string" ? template : meta.defaultTemplate;
  const storedEnabled = typeof enabled === "boolean" ? enabled : true;

  const value = JSON.stringify({ template: storedTemplate, enabled: storedEnabled });
  const configKey = `tg_template:${eventKey}`;

  try {
    const [existing] = await db
      .select({ key: siteConfigTable.key })
      .from(siteConfigTable)
      .where(eq(siteConfigTable.key, configKey));

    if (existing) {
      await db
        .update(siteConfigTable)
        .set({ value })
        .where(eq(siteConfigTable.key, configKey));
    } else {
      await db.insert(siteConfigTable).values({ key: configKey, value });
    }

    invalidateTemplateCache(eventKey);

    res.json({
      ...meta,
      template: storedTemplate,
      enabled: storedEnabled,
      isCustomized: true,
    });
  } catch (err) {
    console.error("[telegram-templates] PUT error:", err);
    res.status(500).json({ error: "Failed to save template" });
  }
});

// DELETE /admin/telegram-templates/:eventKey — reset to default
router.delete("/admin/telegram-templates/:eventKey", async (req, res): Promise<void> => {
  if (!requireAdmin(req, res)) return;

  const { eventKey } = req.params;
  const meta = REGISTRY_MAP.get(eventKey);
  if (!meta) {
    res.status(404).json({ error: "Unknown event key" });
    return;
  }

  try {
    await db
      .delete(siteConfigTable)
      .where(eq(siteConfigTable.key, `tg_template:${eventKey}`));

    invalidateTemplateCache(eventKey);

    res.json({ ...meta, template: meta.defaultTemplate, enabled: true, isCustomized: false });
  } catch (err) {
    console.error("[telegram-templates] DELETE error:", err);
    res.status(500).json({ error: "Failed to reset template" });
  }
});

export default router;
