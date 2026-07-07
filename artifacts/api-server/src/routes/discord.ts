import { Router, type IRouter, type Request, type Response } from "express";
import { requireAdmin } from "../middleware/require-admin";
import {
  getDiscordCredentials,
  invalidateDiscordCache,
  getDiscordBotStatus,
  sendAdminDiscordMessage,
} from "../lib/discord";

const router: IRouter = Router();

// ── Admin endpoints ───────────────────────────────────────────────────────────

// GET /api/admin/discord/status
router.get("/admin/discord/status", (req: Request, res: Response): void => {
  if (!requireAdmin(req, res)) return;
  getDiscordBotStatus().then(status => res.json(status)).catch(() => res.status(500).json({ error: "Failed to check status" }));
});

// POST /api/admin/discord/test-webhook
router.post("/admin/discord/test-webhook", (req: Request, res: Response): void => {
  if (!requireAdmin(req, res)) return;
  sendAdminDiscordMessage("🧪 **Salt\u0026Peps Admin Test** — Discord webhook is working correctly!")
    .then(ok => {
      if (ok) { res.json({ ok: true }); } else { res.status(500).json({ error: "Webhook delivery failed — check the URL is correct" }); }
    })
    .catch(() => res.status(500).json({ error: "Failed to send test message" }));
});

// POST /api/admin/discord/save-config
router.post("/admin/discord/save-config", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { botToken, webhookUrl } = req.body as { botToken?: string; webhookUrl?: string };

  if (botToken !== undefined) {
    await db.insert(siteConfigTable).values({ key: "discordBotToken", value: botToken.trim() })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: botToken.trim() } });
  }
  if (webhookUrl !== undefined) {
    await db.insert(siteConfigTable).values({ key: "discordAdminWebhookUrl", value: webhookUrl.trim() })
      .onConflictDoUpdate({ target: siteConfigTable.key, set: { value: webhookUrl.trim() } });
  }
  invalidateDiscordCache();
  res.json({ ok: true });
});

// GET /api/admin/discord/config — fetch current saved config (values redacted)
router.get("/admin/discord/config", async (req: Request, res: Response): Promise<void> => {
  if (!requireAdmin(req, res)) return;
  const { botToken, webhookUrl } = await getDiscordCredentials();
  res.json({
    botTokenSet: !!botToken,
    webhookUrlSet: !!webhookUrl,
    // Show last 8 chars of webhook URL for identification, fully mask bot token
    webhookUrlHint: webhookUrl ? `…${webhookUrl.slice(-20)}` : null,
  });
});

export default router;
