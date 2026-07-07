import { db } from "@workspace/db";
import { siteConfigTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

const DISCORD_API = "https://discord.com/api/v10";

// ── Credential cache ──────────────────────────────────────────────────────────

interface DiscordCredCache {
  botToken: string;
  webhookUrl: string;
  loadedAt: number;
}
let _credCache: DiscordCredCache | null = null;
const CACHE_TTL_MS = 60_000;

/**
 * Resolve Discord credentials.
 * Bot token and webhook URL are resolved INDEPENDENTLY:
 *   - env var takes priority per-field
 *   - if a field is absent from env, it falls back to site_config DB
 * This means having DISCORD_BOT_TOKEN in env does NOT prevent a webhook URL
 * saved via the admin UI from being used (and vice versa).
 */
export async function getDiscordCredentials(): Promise<{ botToken: string; webhookUrl: string }> {
  const envBot = process.env["DISCORD_BOT_TOKEN"] ?? "";
  const envWebhook = process.env["DISCORD_ADMIN_WEBHOOK_URL"] ?? "";

  // If both are in env, skip DB entirely
  if (envBot && envWebhook) {
    return { botToken: envBot, webhookUrl: envWebhook };
  }

  // Use cache if fresh (still need DB for whichever field is missing from env)
  if (_credCache && Date.now() - _credCache.loadedAt < CACHE_TTL_MS) {
    return {
      botToken: envBot || _credCache.botToken,
      webhookUrl: envWebhook || _credCache.webhookUrl,
    };
  }

  try {
    const rows = await db
      .select({ key: siteConfigTable.key, value: siteConfigTable.value })
      .from(siteConfigTable)
      .where(inArray(siteConfigTable.key, ["discordBotToken", "discordAdminWebhookUrl"]));

    const dbToken = rows.find((r: { key: string; value: string }) => r.key === "discordBotToken")?.value ?? "";
    const dbWebhook = rows.find((r: { key: string; value: string }) => r.key === "discordAdminWebhookUrl")?.value ?? "";
    _credCache = { botToken: dbToken, webhookUrl: dbWebhook, loadedAt: Date.now() };
    // env always wins per-field; DB fills in whatever env is missing
    return { botToken: envBot || dbToken, webhookUrl: envWebhook || dbWebhook };
  } catch {
    return { botToken: envBot, webhookUrl: envWebhook };
  }
}

export function invalidateDiscordCache(): void {
  _credCache = null;
}

// ── DM sending ──────────────────────────────────────────────────────────────

async function openDmChannel(botToken: string, userId: string): Promise<string | null> {
  try {
    const res = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ recipient_id: userId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = await res.json() as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

export async function sendDiscordDM(userId: string, content: string): Promise<boolean> {
  const { botToken } = await getDiscordCredentials();
  if (!botToken) return false;

  const channelId = await openDmChannel(botToken, userId);
  if (!channelId) return false;

  try {
    const res = await fetch(`${DISCORD_API}/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Send a message to the configured admin Discord webhook. */
export async function sendAdminDiscordMessage(content: string): Promise<boolean> {
  const { webhookUrl } = await getDiscordCredentials();
  if (!webhookUrl) return false;
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

// ── Discord Bot status ───────────────────────────────────────────────────────

export async function getDiscordBotStatus(): Promise<{
  configured: boolean;
  botUsername?: string;
  webhookConfigured: boolean;
}> {
  const { botToken, webhookUrl } = await getDiscordCredentials();
  if (!botToken) return { configured: false, webhookConfigured: !!webhookUrl };

  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bot ${botToken}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { configured: true, webhookConfigured: !!webhookUrl };
    const data = await res.json() as { username: string; discriminator: string };
    const botUsername = data.discriminator === "0" ? data.username : `${data.username}#${data.discriminator}`;
    return { configured: true, botUsername, webhookConfigured: !!webhookUrl };
  } catch {
    return { configured: true, webhookConfigured: !!webhookUrl };
  }
}


